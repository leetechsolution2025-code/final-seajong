import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { PrismaClient } from '@prisma/client'
import {
  computeSalesOverviewStats,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './server/salesOverviewHelper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const vitePrisma = new PrismaClient()

/**
 * Plugin tự động kích hoạt backend Express server.js cùng lúc với Vite dev server
 */
function autoBackendPlugin(): Plugin {
  let serverProcess: ChildProcess | null = null

  const startBackend = () => {
    const req = http.get('http://localhost:3005/api/health', () => {
      // Backend đã chạy
    })

    req.on('error', () => {
      console.log('\x1b[36m%s\x1b[0m', '⚡ [Vite Plugin] Đang tự động khởi động Backend Express Server (server.js)...')
      serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
        stdio: 'inherit',
        shell: false,
      })

      serverProcess.on('error', (err) => {
        console.error('Không thể khởi chạy backend server:', err)
      })
    })
  }

  const cleanup = () => {
    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM')
      } catch (e) {}
      serverProcess = null
    }
  }

  return {
    name: 'auto-backend-server',
    configureServer(server) {
      startBackend()

      // Middleware trực tiếp cho /api/sales/overview-stats (Phát triển đại lý & Hỗ trợ đại lý), /api/calendar-events, /api/sales/dealer-support-tickets
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        if (req.method === 'GET' && url.startsWith('/api/sales/overview-stats')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost')
            const period = parsedUrl.searchParams.get('period') || 'month'
            const selectedMonth = parseInt(parsedUrl.searchParams.get('month') || '10', 10) || 10
            let stats
            try {
              const helperUrl = `${pathToFileURL(path.join(process.cwd(), 'server/salesOverviewHelper.js')).href}?t=${Date.now()}`
              const freshHelper = await import(helperUrl)
              stats = await freshHelper.computeSalesOverviewStats(vitePrisma, period, selectedMonth)
            } catch {
              stats = await computeSalesOverviewStats(vitePrisma, period, selectedMonth)
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(stats))
            return
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/sales/overview-stats:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: err?.message || 'Lỗi server' }))
            return
          }
        }

        if (url.startsWith('/api/calendar-events')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost')
            if (req.method === 'GET') {
              const userEmail = parsedUrl.searchParams.get('userEmail') || ''
              const userId = parsedUrl.searchParams.get('userId') || ''
              const events = await getCalendarEvents(vitePrisma, { userEmail, userId })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(events))
              return
            }

            if (req.method === 'POST') {
              let rawBody = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  rawBody += chunk
                })
                req.on('end', () => resolve())
              })
              const body = rawBody ? JSON.parse(rawBody) : {}
              const created = await createCalendarEvent(vitePrisma, body)
              res.statusCode = 201
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(created))
              return
            }

            if (req.method === 'PUT' && parsedUrl.pathname.startsWith('/api/calendar-events/')) {
              const id = parsedUrl.pathname.replace('/api/calendar-events/', '')
              let rawBody = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  rawBody += chunk
                })
                req.on('end', () => resolve())
              })
              const body = rawBody ? JSON.parse(rawBody) : {}
              const updated = await updateCalendarEvent(vitePrisma, id, body)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(updated))
              return
            }

            if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/api/calendar-events/')) {
              const id = parsedUrl.pathname.replace('/api/calendar-events/', '')
              const deleted = await deleteCalendarEvent(vitePrisma, id)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(deleted))
              return
            }
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/calendar-events:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: err?.message || 'Lỗi server' }))
            return
          }
        }

        if (!url.startsWith('/api/sales/dealer-support-tickets')) {
          return next()
        }

        try {
          if (req.method === 'GET' && (url === '/api/sales/dealer-support-tickets' || url.startsWith('/api/sales/dealer-support-tickets?'))) {
            const tickets = await vitePrisma.dealerSupportTicket.findMany({
              where: { status: { not: 'Draft' } },
              include: {
                handler: {
                  select: { id: true, code: true, fullName: true, phone: true, workEmail: true, position: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            })

            const customerIds = [...new Set(tickets.map((t) => t.customerId).filter(Boolean))] as string[]
            const customers = customerIds.length
              ? await vitePrisma.customer.findMany({
                  where: { id: { in: customerIds } },
                  include: {
                    nguoiChamSoc: {
                      select: { id: true, code: true, fullName: true, phone: true, workEmail: true, position: true },
                    },
                  },
                })
              : []
            const customerMap = new Map(customers.map((c) => [c.id, c]))

            const enrichedAll = tickets.map((t) => {
              const cust = t.customerId ? customerMap.get(t.customerId) : null
              const rawContent = String(t.content || '')
              const orderMatch = rawContent.match(/\[Đơn hàng:\s*([^\]]+)\]/)
              const urgentMatch = /\[Ưu tiên:\s*Khẩn cấp\]/.test(rawContent)
              const cleanContent = rawContent
                .replace(/\[Đơn hàng:\s*[^\]]+\]\s*/g, '')
                .replace(/\[Ưu tiên:\s*[^\]]+\]\s*/g, '')
                .trim()

              return {
                ...t,
                orderCode: t.orderCode || (orderMatch ? orderMatch[1].trim() : null),
                priority:
                  t.priority && t.priority !== 'normal'
                    ? t.priority
                    : urgentMatch
                    ? 'urgent'
                    : t.priority || 'normal',
                content: cleanContent,
                customer: cust
                  ? {
                      id: cust.id,
                      code: cust.code,
                      name: cust.name,
                      dienThoai: cust.dienThoai,
                      address: cust.address,
                      loai: cust.loai,
                      nhom: cust.nhom,
                    }
                  : null,
                handler: t.handler || cust?.nguoiChamSoc || null,
              }
            })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, data: enrichedAll }))
            return
          }

          if (req.method === 'PUT' && url.startsWith('/api/sales/dealer-support-tickets/')) {
            const id = url.replace('/api/sales/dealer-support-tickets/', '').split('?')[0]
            let rawBody = ''
            await new Promise<void>((resolve) => {
              req.on('data', (chunk) => {
                rawBody += chunk
              })
              req.on('end', () => resolve())
            })
            const body = rawBody ? JSON.parse(rawBody) : {}
            const existing = await vitePrisma.dealerSupportTicket.findUnique({ where: { id } })
            if (!existing) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: 'Không tìm thấy yêu cầu hỗ trợ' }))
              return
            }

            const newStatus = body.status || existing.status
            const isResolvedStatus = newStatus === 'Resolved' || newStatus === 'Completed'

            const updated = await vitePrisma.dealerSupportTicket.update({
              where: { id },
              data: {
                status: newStatus,
                ...(body.responseContent !== undefined ? { responseContent: String(body.responseContent).trim() } : {}),
                ...(body.handlerId !== undefined ? { handlerId: body.handlerId || null } : {}),
                resolvedAt: isResolvedStatus ? new Date() : null,
              },
              include: {
                handler: {
                  select: { id: true, code: true, fullName: true, phone: true, workEmail: true, position: true },
                },
              },
            })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                success: true,
                message: 'Đã cập nhật xử lý & phản hồi yêu cầu hỗ trợ đại lý!',
                ticket: updated,
              })
            )
            return
          }
        } catch (err: any) {
          console.error('Lỗi Vite middleware /api/sales/dealer-support-tickets:', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ success: false, message: err?.message || 'Lỗi server' }))
          return
        }

        next()
      })

      server.httpServer?.on('close', cleanup)
      process.on('exit', cleanup)
      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      server.watcher.add(path.join(__dirname, 'server.js'))
      server.watcher.on('change', (file) => {
        if (file.endsWith('server.js')) {
          console.log('\x1b[33m%s\x1b[0m', '⚡ [Vite Plugin] server.js thay đổi -> Khởi động lại Backend...')
          cleanup()
          setTimeout(startBackend, 600)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), autoBackendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next-auth/react': path.resolve(__dirname, './src/lib/next-auth-shim.ts'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
})
