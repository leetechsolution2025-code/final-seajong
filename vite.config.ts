import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { PrismaClient } from '@prisma/client'
import {
  computeSalesOverviewStats,
  computeBomOverviewStats,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './server/salesOverviewHelper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let rawVitePrisma = new PrismaClient()
const vitePrisma: PrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === '$transaction' || prop === '$queryRaw' || prop === '$executeRaw' || prop === '$disconnect' || prop === '$connect') {
      return async (...args: any[]) => {
        try {
          return await (rawVitePrisma as any)[prop](...args)
        } catch (err: any) {
          const msg = String(err?.message || '')
          if (msg.includes('malformed') || msg.includes('QueryError') || msg.includes('ConnectorError')) {
            console.warn('⚠️ [VitePrisma Auto-Heal] Phát hiện kết nối SQLite lỗi, đang tự động kết nối lại...')
            try { await rawVitePrisma.$disconnect() } catch {}
            rawVitePrisma = new PrismaClient()
            return await (rawVitePrisma as any)[prop](...args)
          }
          throw err
        }
      }
    }
    const val = (rawVitePrisma as any)[prop]
    if (typeof val === 'function') {
      return val.bind(rawVitePrisma)
    }
    if (val && typeof val === 'object') {
      return new Proxy(val, {
        get(mTarget, mProp) {
          const mVal = mTarget[mProp]
          if (typeof mVal === 'function') {
            return async (...args: any[]) => {
              try {
                return await mVal.apply(mTarget, args)
              } catch (err: any) {
                const msg = String(err?.message || '')
                if (msg.includes('malformed') || msg.includes('QueryError') || msg.includes('ConnectorError')) {
                  console.warn('⚠️ [VitePrisma Auto-Heal] Phát hiện kết nối SQLite lỗi, đang tự động kết nối lại...')
                  try { await rawVitePrisma.$disconnect() } catch {}
                  rawVitePrisma = new PrismaClient()
                  return await (rawVitePrisma as any)[prop][mProp](...args)
                }
                throw err
              }
            }
          }
          return mVal
        }
      })
    }
    return val
  }
})

/**
 * Plugin tự động kích hoạt backend Express server.js cùng lúc với Vite dev server
 */
function autoBackendPlugin(): Plugin {
  let embeddedExpressPromise: Promise<any> | null = null

  const getEmbeddedExpressApp = () => {
    if (!embeddedExpressPromise) {
      process.env.VITE_EMBEDDED_EXPRESS = 'true'
      const serverUrl = `${pathToFileURL(path.join(__dirname, 'server.js')).href}?t=${Date.now()}`
      embeddedExpressPromise = import(serverUrl)
        .then((mod) => mod.app || mod.default)
        .catch((err) => {
          console.error('Lỗi khởi tạo Embedded Express App:', err)
          embeddedExpressPromise = null
          return null
        })
    }
    return embeddedExpressPromise
  }

  const cleanup = () => {
    embeddedExpressPromise = null
  }

  return {
    name: 'auto-backend-server',
    configureServer(server) {
      getEmbeddedExpressApp()

      // Middleware trực tiếp cho /api/sales/overview-stats (Phát triển đại lý & Hỗ trợ đại lý), /api/calendar-events, /api/sales/dealer-support-tickets
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        if (req.method === 'GET' && url.startsWith('/api/bom/overview-stats')) {
          try {
            const now = new Date()
            const parsedUrl = new URL(url, 'http://localhost')
            const period = parsedUrl.searchParams.get('period') || 'month'
            const currentYear = parseInt(parsedUrl.searchParams.get('year') || String(now.getFullYear()), 10) || now.getFullYear()
            const currentMonth = parseInt(parsedUrl.searchParams.get('month') || String(now.getMonth() + 1), 10) || (now.getMonth() + 1)
            let stats
            try {
              const helperUrl = `${pathToFileURL(path.join(process.cwd(), 'server/salesOverviewHelper.js')).href}?t=${Date.now()}`
              const freshHelper = await import(helperUrl)
              stats = await freshHelper.computeBomOverviewStats(vitePrisma, period, currentYear, currentMonth)
            } catch {
              stats = await computeBomOverviewStats(vitePrisma, period, currentYear, currentMonth)
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(stats))
            return
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/bom/overview-stats:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: err?.message || 'Lỗi server' }))
            return
          }
        }

        if (req.method === 'GET' && url.startsWith('/api/sales/overview-stats')) {
          try {
            const defaultM = new Date().getMonth() + 1
            const parsedUrl = new URL(url, 'http://localhost')
            const period = parsedUrl.searchParams.get('period') || 'month'
            const selectedMonth = parseInt(parsedUrl.searchParams.get('month') || String(defaultM), 10) || defaultM
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

        if (url.startsWith('/api/user-tasks')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost')

            const computeDefaultAppendixTimelines = (baseDateStr: string, durationDaysStr: string) => {
              let baseDate = new Date()
              if (baseDateStr) {
                const clean = String(baseDateStr).trim()
                if (clean.includes('/')) {
                  const p = clean.split('/')
                  if (p.length === 3) baseDate = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]))
                } else if (clean.includes('-')) {
                  const p = clean.split('-')
                  if (p.length === 3) baseDate = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
                }
              }
              if (isNaN(baseDate.getTime())) baseDate = new Date()

              const totalDays = Math.max(5, parseInt(String(durationDaysStr || '15'), 10) || 15)
              const addDays = (d: Date, days: number) => {
                const next = new Date(d)
                next.setDate(next.getDate() + days)
                return next
              }
              const fmtDMY = (d: Date) =>
                `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
              const fmtISO = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

              const d1End = Math.max(1, Math.round(totalDays * 0.2) - 1)
              const d2End = Math.max(d1End + 1, Math.round(totalDays * 0.35) - 1)
              const d3End = Math.max(d2End + 1, Math.round(totalDays * 0.8) - 1)
              const d4End = Math.max(d3End + 1, totalDays - 2)
              const d5End = Math.max(d4End, totalDays - 1)

              return [
                {
                  idx: 1,
                  label: `${fmtDMY(baseDate)} - ${fmtDMY(addDays(baseDate, d1End))}`,
                  startIso: fmtISO(baseDate),
                  endIso: fmtISO(addDays(baseDate, d1End)),
                },
                {
                  idx: 2,
                  label: `${fmtDMY(addDays(baseDate, d1End))} - ${fmtDMY(addDays(baseDate, d2End))}`,
                  startIso: fmtISO(addDays(baseDate, d1End)),
                  endIso: fmtISO(addDays(baseDate, d2End)),
                },
                {
                  idx: 3,
                  label: `${fmtDMY(addDays(baseDate, d2End))} - ${fmtDMY(addDays(baseDate, d3End))}`,
                  startIso: fmtISO(addDays(baseDate, d2End)),
                  endIso: fmtISO(addDays(baseDate, d3End)),
                },
                {
                  idx: 4,
                  label: `${fmtDMY(addDays(baseDate, d3End))} - ${fmtDMY(addDays(baseDate, d4End))}`,
                  startIso: fmtISO(addDays(baseDate, d3End)),
                  endIso: fmtISO(addDays(baseDate, d4End)),
                },
                {
                  idx: 5,
                  label: `${fmtDMY(addDays(baseDate, d5End))}`,
                  startIso: fmtISO(addDays(baseDate, d5End)),
                  endIso: fmtISO(addDays(baseDate, d5End)),
                },
              ]
            }

            const parseTimelineToIsoRange = (rawStr: string, fallbackStart: string, fallbackEnd: string) => {
              if (!rawStr || !String(rawStr).trim()) {
                return { startDate: fallbackStart, endDate: fallbackEnd }
              }
              const s = String(rawStr).trim()
              const isoMatches = [...s.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)]
              if (isoMatches.length >= 2) {
                const startDate = `${isoMatches[0][1]}-${isoMatches[0][2].padStart(2, '0')}-${isoMatches[0][3].padStart(2, '0')}`
                const endDate = `${isoMatches[1][1]}-${isoMatches[1][2].padStart(2, '0')}-${isoMatches[1][3].padStart(2, '0')}`
                return { startDate, endDate }
              }
              if (isoMatches.length === 1) {
                const d = `${isoMatches[0][1]}-${isoMatches[0][2].padStart(2, '0')}-${isoMatches[0][3].padStart(2, '0')}`
                return { startDate: d, endDate: d }
              }

              const dmyFullMatches = [...s.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)]
              if (dmyFullMatches.length >= 2) {
                const startDate = `${dmyFullMatches[0][3]}-${dmyFullMatches[0][2].padStart(2, '0')}-${dmyFullMatches[0][1].padStart(2, '0')}`
                const endDate = `${dmyFullMatches[1][3]}-${dmyFullMatches[1][2].padStart(2, '0')}-${dmyFullMatches[1][1].padStart(2, '0')}`
                return { startDate, endDate }
              }
              if (dmyFullMatches.length === 1) {
                const endYear = dmyFullMatches[0][3]
                const endDate = `${endYear}-${dmyFullMatches[0][2].padStart(2, '0')}-${dmyFullMatches[0][1].padStart(2, '0')}`
                const shortMatch = s.match(/^(\d{1,2})\/(\d{1,2})\s*[-–]/)
                if (shortMatch) {
                  const startDate = `${endYear}-${shortMatch[2].padStart(2, '0')}-${shortMatch[1].padStart(2, '0')}`
                  return { startDate, endDate }
                }
                return { startDate: endDate, endDate }
              }
              return { startDate: fallbackStart, endDate: fallbackEnd }
            }

            const buildAppendixConstructionTasks = (
              recordId: string,
              contractCode: string,
              customerName: string,
              customerAddress: string,
              executor: string,
              fv: Record<string, any> = {}
            ) => {
              const computedRanges = computeDefaultAppendixTimelines(
                fv.plDate || fv.signDate || '2026-10-29',
                fv.plDurationDays || '15'
              )

              // Danh sách 5 hạng mục chuẩn theo Mục 3 Phụ lục hợp đồng
              const appendixStages = [
                {
                  idx: 1,
                  title: 'Đo đạc & Thiết kế 3D',
                  department: 'Phòng Kỹ thuật - Thiết kế',
                  priority: 'Cao',
                  description:
                    'Hoàn thiện đo đạc tính toán, lên danh sách sản phẩm trưng bày, thiết kế bản vẽ kỹ thuật và hình ảnh 3D từng khu vực.',
                },
                {
                  idx: 2,
                  title: 'Chuẩn bị nguyên vật liệu',
                  department: 'Phòng Cung ứng - Kho vận',
                  priority: 'Trung bình',
                  description: 'Chuẩn bị hoàn tất nguyên vật liệu phục vụ thi công.',
                },
                {
                  idx: 3,
                  title: 'Thi công, lắp đặt quầy kệ',
                  department: 'Đội Thi công Showroom',
                  priority: 'Cao',
                  description: 'Thực hiện thi công, lắp đặt quầy, kệ, bảng biển.',
                },
                {
                  idx: 4,
                  title: 'Lắp sản phẩm trưng bày',
                  department: 'Đội Thi công Showroom',
                  priority: 'Trung bình',
                  description: 'Lắp đặt sản phẩm trưng bày.',
                },
                {
                  idx: 5,
                  title: 'Bàn giao, nghiệm thu',
                  department: 'Phòng Kinh doanh',
                  priority: 'Cao',
                  description: 'Thực hiện bàn giao khu vực thi công và trưng bày cho Đại lý.',
                },
              ]

              const existingList = Array.isArray(fv.constructionTasks) ? fv.constructionTasks : []

              return appendixStages.map((stage, i) => {
                const defRange = computedRanges[i]
                const rawTimeline = fv[`plTimeline${stage.idx}`] || defRange.label
                const { startDate, endDate } = parseTimelineToIsoRange(
                  rawTimeline,
                  defRange.startIso,
                  defRange.endIso
                )
                const taskId = `utask-${recordId}-${stage.idx}`
                const existingTask = existingList.find((t: any) => String(t.id) === taskId)

                const rawProg =
                  existingTask?.progress !== undefined
                    ? existingTask.progress
                    : fv[`consProgress${stage.idx}`]
                const progress =
                  rawProg !== undefined && rawProg !== null && rawProg !== ''
                    ? Math.min(100, Math.max(0, Number(rawProg)))
                    : 0
                const status =
                  existingTask?.status ||
                  (progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started')
                const statusLabel =
                  existingTask?.statusLabel ||
                  (status === 'completed'
                    ? 'Đã hoàn thành'
                    : status === 'in_progress'
                    ? 'Đang thực hiện'
                    : 'Chưa thực hiện')

                return {
                  id: taskId,
                  code: existingTask?.code || '',
                  title: stage.title,
                  project: customerName,
                  contractCode,
                  customerName,
                  customerAddress,
                  assignee: existingTask?.assignee || executor || 'Nguyên Văn Thành',
                  assigner: fv.hdANguoiKy || fv.repA || 'Lê Công Vụ',
                  department: existingTask?.department || stage.department,
                  priority: existingTask?.priority || stage.priority,
                  priorityLabel: existingTask?.priorityLabel || stage.priority,
                  startDate,
                  endDate,
                  progress,
                  status,
                  statusLabel,
                  description: existingTask?.description || stage.description,
                  category: 'production',
                }
              })
            }

            const getMarketingCategoryName = (sectionKey: string): string => {
              if (sectionKey.startsWith('section_content')) return 'Content Marketing'
              if (sectionKey.startsWith('section_media')) return 'Media & Video'
              if (sectionKey.startsWith('section_design')) return 'Thiết kế đồ họa & Visual'
              if (sectionKey.startsWith('section_seo')) return 'SEO & Bài viết Blog'
              if (sectionKey.startsWith('section_adv')) return 'Quảng cáo đa kênh (Paid Ads)'
              if (sectionKey.startsWith('section_pos')) return 'Điểm bán & Hỗ trợ đại lý (POSM)'
              return 'Công việc Marketing'
            }

            const parseMarketingPlanTasks = (planDataStr: any, targetYear = 2026): any[] => {
              const mktTasks: any[] = []
              if (!planDataStr) return mktTasks
              let data: any = {}
              try {
                data = typeof planDataStr === 'string' ? JSON.parse(planDataStr) : planDataStr
              } catch {
                return mktTasks
              }

              const sectionContentItems = data.mkt_sectionContentItems || {}
              const entries = Object.entries(sectionContentItems)

              for (const [key, items] of entries) {
                if (!Array.isArray(items) || items.length === 0) continue

                const match = key.match(/_(\d+)$/)
                const month = match ? parseInt(match[1], 10) : 11
                const monthStr = String(month).padStart(2, '0')
                const groupName = getMarketingCategoryName(key)
                const lastDayOfMonth = new Date(targetYear, month, 0).getDate()

                items.forEach((item: any, idx: number) => {
                  const weeks = Array.isArray(item.weeks) && item.weeks.length > 0 ? item.weeks : [1]
                  const minWeek = Math.min(...weeks)
                  const maxWeek = Math.max(...weeks)

                  const startDay = minWeek === 1 ? 1 : minWeek === 2 ? 8 : minWeek === 3 ? 15 : 22
                  const endDay = maxWeek === 1 ? 7 : maxWeek === 2 ? 14 : maxWeek === 3 ? 21 : lastDayOfMonth

                  const startDate = `${targetYear}-${monthStr}-${String(startDay).padStart(2, '0')}`
                  const endDate = `${targetYear}-${monthStr}-${String(endDay).padStart(2, '0')}`

                  const title = item.topic || item.name || item.pillar || `Nhiệm vụ Marketing ${idx + 1}`
                  const status = item.status === 'completed'
                    ? 'completed'
                    : item.status === 'in_progress'
                      ? 'in_progress'
                      : 'not_started'
                  const statusLabel = status === 'completed'
                    ? 'Đã hoàn thành'
                    : status === 'in_progress'
                      ? 'Đang thực hiện'
                      : 'Chưa thực hiện'
                  const progress = item.progress !== undefined
                    ? Number(item.progress)
                    : status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0

                  const code = `MKT-${monthStr}-${String(idx + 1).padStart(3, '0')}`

                  mktTasks.push({
                    id: `mkt-item-${item.id || `${key}-${idx}`}`,
                    code,
                    title,
                    project: `HẠNG MỤC: ${groupName.toUpperCase()} (T${monthStr}/${targetYear})`,
                    contractCode: `HẠNG MỤC: ${groupName.toUpperCase()} (T${monthStr}/${targetYear})`,
                    customerName: `Kế hoạch Marketing Tháng ${monthStr}/${targetYear}`,
                    customerAddress: `Phòng Marketing Seajong`,
                    assignee: item.assignee || 'Chu Thị Hằng',
                    assigner: 'Trưởng phòng Marketing',
                    department: 'Phòng Marketing',
                    priority: item.isAds ? 'high' : 'medium',
                    priorityLabel: item.isAds ? 'Ưu tiên cao' : 'Trung bình',
                    startDate,
                    endDate,
                    progress,
                    status,
                    statusLabel,
                    description: item.details || item.pillar || (item.format ? `Hình thức: ${item.format} | Kênh: ${item.channel || ''}` : ''),
                    category: 'production',
                    isContractOnly: false,
                  })
                })
              }

              return mktTasks
            }

            if (req.method === 'GET' && parsedUrl.pathname === '/api/user-tasks') {
              const allTasks: any[] = []
              const seenIds = new Set<string>()

              // 1. Lấy các công việc khởi tạo trực tiếp trong bảng Task
              try {
                const dbTasks = await vitePrisma.task.findMany({
                  orderBy: { createdAt: 'desc' },
                })
                for (const row of dbTasks) {
                  let parsed: any = null
                  if (row.actualResult) {
                    try {
                      const obj = JSON.parse(row.actualResult)
                      if (obj && typeof obj === 'object' && obj.title) {
                        parsed = obj
                      }
                    } catch {}
                  }
                  const taskItem = parsed
                    ? {
                        ...parsed,
                        id: parsed.id || row.id,
                        title: parsed.title || row.title,
                        description: parsed.description ?? row.description ?? '',
                        status: parsed.status || row.status || 'not_started',
                        priority: parsed.priority || row.priority || 'medium',
                        assignee: parsed.assignee || row.assigneeId || 'Chưa phân công',
                        assigner: parsed.assigner || row.creatorId || 'Ban Giám đốc',
                        department: parsed.department || row.deptCode || 'Phòng Kinh doanh',
                      }
                    : {
                        id: row.id,
                        code: `CV-2026-${String(row.id).slice(-3).toUpperCase()}`,
                        title: row.title,
                        project: 'Công việc nội bộ',
                        contractCode: '',
                        customerName: 'Nội bộ công ty',
                        customerAddress: '',
                        assignee: row.assigneeId || 'Chưa phân công',
                        assigner: row.creatorId || 'Ban Giám đốc',
                        department: row.deptCode || 'Phòng Kinh doanh',
                        priority: row.priority || 'medium',
                        priorityLabel:
                          row.priority === 'urgent'
                            ? 'Khẩn cấp'
                            : row.priority === 'high'
                              ? 'Ưu tiên cao'
                              : row.priority === 'low'
                                ? 'Thấp'
                                : 'Trung bình',
                        startDate: row.createdAt ? row.createdAt.toISOString().slice(0, 10) : '2026-10-04',
                        endDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : '2026-10-10',
                        progress: row.status === 'completed' ? 100 : 0,
                        status: row.status || 'not_started',
                        statusLabel: row.status === 'completed' ? 'Đã hoàn thành' : 'Chưa thực hiện',
                        description: row.description || '',
                        category: 'production',
                      }
                  seenIds.add(String(taskItem.id))
                  allTasks.push(taskItem)
                }
              } catch {}

              // 2. Lấy các hồ sơ đại lý trong quy trình Phát triển đại lý (MarketingLead)
              const leads = await vitePrisma.marketingLead.findMany({ orderBy: { updatedAt: 'desc' } })
              for (const lead of leads) {
                let fv: Record<string, any> = {}
                try {
                  fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                } catch {
                  fv = {}
                }
                if (fv.constructionTasksDeleted) continue

                const contractCode = String(fv.contractNo || fv.hdCode || '').trim()
                const customerName = fv.companyName || lead.fullName || 'Đại lý Seajong'
                const customerAddress = fv.address || fv.area || 'Chưa cập nhật địa chỉ'
                const executor = fv.executor || 'Nguyên Văn Thành'

                // Kiểm tra đã có Phụ lục hợp đồng chưa
                const hasAppendix = Boolean(
                  (fv.plNo && String(fv.plNo).trim() !== '') ||
                    (fv.plPdf && String(fv.plPdf).trim() !== '')
                )

                if (!contractCode || !hasAppendix) {
                  if (Array.isArray(fv.constructionTasks)) {
                    for (const ct of fv.constructionTasks) {
                      if (ct && !ct.isContractOnly && !seenIds.has(String(ct.id))) {
                        seenIds.add(String(ct.id))
                        allTasks.push({
                          ...ct,
                          code: ct.code || `CV-2026-${String(ct.id).slice(-3)}`,
                        })
                      }
                    }
                  }
                  if (!contractCode) continue
                  // Chưa có phụ lục hợp đồng -> chỉ hiển thị dòng Hợp đồng, không có nội dung công việc con
                  allTasks.push({
                    id: `contract-only-${lead.id}`,
                    code: '',
                    title: '',
                    project: customerName,
                    contractCode,
                    customerName,
                    customerAddress,
                    assignee: executor,
                    department: 'Phòng Kinh doanh',
                    startDate: '',
                    endDate: '',
                    progress: 0,
                    priority: 'Trung bình',
                    priorityLabel: 'Trung bình',
                    status: 'not_started',
                    statusLabel: 'Chưa thực hiện',
                    isContractOnly: true,
                  })
                  continue
                }

                // Đã có Phụ lục hợp đồng -> đồng bộ 5 hạng mục và thời gian triển khai từ Phụ lục hợp đồng
                const defaultTimelines = computeDefaultAppendixTimelines(
                  fv.plDate || fv.signDate || '2026-10-29',
                  fv.plDurationDays || '15'
                )
                let needsSave = false
                for (let i = 0; i < 5; i++) {
                  const key = `plTimeline${i + 1}`
                  if (!fv[key] || !String(fv[key]).trim()) {
                    fv[key] = defaultTimelines[i].label
                    needsSave = true
                  }
                }

                const standardTasks = buildAppendixConstructionTasks(
                  lead.id,
                  contractCode,
                  customerName,
                  customerAddress,
                  executor,
                  fv
                )
                const standardIds = new Set(standardTasks.map((t) => t.id))
                const customTasks = Array.isArray(fv.constructionTasks)
                  ? fv.constructionTasks
                      .filter((t: any) => !standardIds.has(String(t.id)) && !t.isContractOnly)
                      .map((t: any) => ({
                        ...t,
                        code: t.code || `CV-2026-${String(t.id).slice(-3)}`,
                        contractCode: t.contractCode !== undefined ? t.contractCode : contractCode,
                        project: t.project || customerName,
                        customerName: t.customerName || customerName,
                        customerAddress: t.customerAddress || customerAddress,
                      }))
                  : []

                const mergedTasks = [...standardTasks, ...customTasks]
                if (
                  needsSave ||
                  !Array.isArray(fv.constructionTasks) ||
                  JSON.stringify(fv.constructionTasks) !== JSON.stringify(mergedTasks)
                ) {
                  fv.constructionTasks = mergedTasks
                  await vitePrisma.marketingLead.update({
                    where: { id: lead.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                }

                for (const mt of mergedTasks) {
                  if (!seenIds.has(String(mt.id))) {
                    seenIds.add(String(mt.id))
                    allTasks.push(mt)
                  }
                }
              }

              // 3. Nạp Kế hoạch tháng Marketing từ MasterYearlyPlan
              let marketingTasks: any[] = []
              try {
                const targetYear = parseInt(parsedUrl.searchParams.get('year') || '2026', 10)
                const mPlan = await vitePrisma.masterYearlyPlan.findUnique({
                  where: { year: targetYear },
                })
                if (mPlan && mPlan.planData) {
                  marketingTasks = parseMarketingPlanTasks(mPlan.planData, targetYear)
                }
              } catch (planErr) {
                console.error('Lỗi nạp Kế hoạch tháng Marketing trong Vite:', planErr)
              }

              const department = parsedUrl.searchParams.get('department') || ''
              const assignee = parsedUrl.searchParams.get('assignee') || ''
              const reqDept = department.toLowerCase()
              const isMarketing = reqDept === 'marketing' || reqDept === 'mkt'

              if (isMarketing) {
                // Khi yêu cầu công việc phòng Marketing: CHỈ hiển thị các công việc của phòng Marketing căn cứ theo kế hoạch tháng
                const mktMap = new Map<string, any>()
                marketingTasks.forEach((t) => mktMap.set(String(t.id), t))

                allTasks.forEach((t) => {
                  const tDept = String(t.department || '').toLowerCase()
                  if (tDept.includes('marketing') && !t.isContractOnly) {
                    mktMap.set(String(t.id), t)
                  }
                })

                let mktResult = Array.from(mktMap.values())
                if (assignee) {
                  const assigneeLower = assignee.toLowerCase()
                  mktResult = mktResult.filter((t) =>
                    String(t.assignee || '').toLowerCase().includes(assigneeLower)
                  )
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(mktResult))
                return
              }

              for (const mt of marketingTasks) {
                if (!seenIds.has(String(mt.id))) {
                  seenIds.add(String(mt.id))
                  allTasks.push(mt)
                }
              }

              let filtered = allTasks
              if (department) {
                const deptLower = department.toLowerCase()
                filtered = filtered.filter(
                  (t) => t.isContractOnly || String(t.department || '').toLowerCase().includes(deptLower)
                )
              }
              if (assignee) {
                const assigneeLower = assignee.toLowerCase()
                filtered = filtered.filter(
                  (t) => t.isContractOnly || String(t.assignee || '').toLowerCase().includes(assigneeLower)
                )
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(filtered))
              return
            }

            if (req.method === 'POST' && parsedUrl.pathname === '/api/user-tasks') {
              let rawBody = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  rawBody += chunk
                })
                req.on('end', () => resolve())
              })
              const body = rawBody ? JSON.parse(rawBody) : {}
              const taskId = body.id || `utask-${Date.now()}`
              const priorityVal = body.priority || 'medium'
              const priorityLabelVal =
                body.priorityLabel ||
                (priorityVal === 'urgent'
                  ? 'Khẩn cấp'
                  : priorityVal === 'high'
                    ? 'Ưu tiên cao'
                    : priorityVal === 'low'
                      ? 'Thấp'
                      : 'Trung bình')
              const newTask = {
                id: taskId,
                code: body.code || `CV-2026-${String(Date.now()).slice(-3)}`,
                title: body.title || 'Công việc mới',
                project: body.project || body.customerName || 'Dự án thi công trưng bày',
                contractCode: body.contractCode !== undefined ? String(body.contractCode).trim() : '',
                customerName: body.customerName || body.project || 'Nội bộ công ty',
                customerAddress: body.customerAddress || 'Công ty Cổ phần Seajong Việt Nam',
                assignee: body.assignee || 'Chưa phân công',
                assigner: body.assigner || 'Ban Giám đốc',
                department: body.department || 'Phòng Kinh doanh',
                priority: priorityVal,
                priorityLabel: priorityLabelVal,
                startDate: body.startDate || '2026-10-04',
                endDate: body.endDate || '2026-10-10',
                progress: Number(body.progress) || 0,
                status: body.status || 'not_started',
                statusLabel: body.statusLabel || 'Chưa thực hiện',
                description: body.description || '',
                category: body.category || 'production',
                categoryLabel: body.categoryLabel || 'Sản xuất',
              }

              await vitePrisma.task.create({
                data: {
                  id: newTask.id,
                  title: newTask.title,
                  description: newTask.description || '',
                  status: newTask.status,
                  priority: newTask.priority,
                  assigneeId: newTask.assignee,
                  creatorId: newTask.assigner,
                  deptCode: newTask.department,
                  actualResult: JSON.stringify(newTask),
                },
              })

              const targetCode = String(newTask.contractCode || '').trim().toUpperCase()
              if (targetCode) {
                const leads = await vitePrisma.marketingLead.findMany({ orderBy: { updatedAt: 'desc' } })
                for (const lead of leads) {
                  let fv: Record<string, any> = {}
                  try {
                    fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                  } catch {
                    fv = {}
                  }
                  const cCode = String(fv.contractNo || fv.hdCode || fv.quoteCode || `HD-${lead.externalId || lead.id}`)
                    .trim()
                    .toUpperCase()
                  if (cCode === targetCode || (targetCode.includes(cCode) && cCode.length > 3)) {
                    const list = Array.isArray(fv.constructionTasks) ? fv.constructionTasks : []
                    list.push(newTask)
                    fv.constructionTasks = list
                    delete fv.constructionTasksDeleted
                    await vitePrisma.marketingLead.update({
                      where: { id: lead.id },
                      data: { formValues: JSON.stringify(fv) },
                    })
                    break
                  }
                }
              }

              res.statusCode = 201
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(newTask))
              return
            }

            if (req.method === 'PUT' && parsedUrl.pathname.startsWith('/api/user-tasks/')) {
              const taskId = parsedUrl.pathname.replace('/api/user-tasks/', '')
              let rawBody = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  rawBody += chunk
                })
                req.on('end', () => resolve())
              })
              const body = rawBody ? JSON.parse(rawBody) : {}

              let updatedTaskObj: any = null
              const existingDbTask = await vitePrisma.task.findUnique({ where: { id: taskId } })
              if (existingDbTask) {
                let parsed: Record<string, any> = {}
                if (existingDbTask.actualResult) {
                  try {
                    parsed = JSON.parse(existingDbTask.actualResult) || {}
                  } catch {
                    parsed = {}
                  }
                }
                updatedTaskObj = {
                  ...parsed,
                  id: taskId,
                  ...body,
                }
                await vitePrisma.task.update({
                  where: { id: taskId },
                  data: {
                    title: updatedTaskObj.title || existingDbTask.title,
                    description: updatedTaskObj.description ?? existingDbTask.description,
                    status: updatedTaskObj.status || existingDbTask.status,
                    priority: updatedTaskObj.priority || existingDbTask.priority,
                    assigneeId: updatedTaskObj.assignee || existingDbTask.assigneeId,
                    deptCode: updatedTaskObj.department || existingDbTask.deptCode,
                    actualResult: JSON.stringify(updatedTaskObj),
                  },
                })
              }

              const leads = await vitePrisma.marketingLead.findMany()
              for (const lead of leads) {
                let fv: Record<string, any> = {}
                try {
                  fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                } catch {
                  fv = {}
                }
                if (!Array.isArray(fv.constructionTasks)) continue
                const idx = fv.constructionTasks.findIndex((t: any) => String(t.id) === taskId)
                if (idx !== -1) {
                  fv.constructionTasks[idx] = { ...fv.constructionTasks[idx], ...body }
                  await vitePrisma.marketingLead.update({
                    where: { id: lead.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify(fv.constructionTasks[idx]))
                  return
                }
              }

              const customers = await vitePrisma.customer.findMany()
              for (const cust of customers) {
                let fv: Record<string, any> = {}
                try {
                  fv = cust.formValues ? JSON.parse(cust.formValues) : {}
                } catch {
                  fv = {}
                }
                if (!Array.isArray(fv.constructionTasks)) continue
                const idx = fv.constructionTasks.findIndex((t: any) => String(t.id) === taskId)
                if (idx !== -1) {
                  fv.constructionTasks[idx] = { ...fv.constructionTasks[idx], ...body }
                  await vitePrisma.customer.update({
                    where: { id: cust.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify(fv.constructionTasks[idx]))
                  return
                }
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(updatedTaskObj || { id: taskId, ...body }))
              return
            }

            if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/api/user-tasks/contract/')) {
              const rawCode = decodeURIComponent(parsedUrl.pathname.replace('/api/user-tasks/contract/', ''))
                .trim()
                .toUpperCase()
              let rawBody = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  rawBody += chunk
                })
                req.on('end', () => resolve())
              })
              const body = rawBody ? JSON.parse(rawBody) : {}
              const taskIds = Array.isArray(body?.taskIds) ? body.taskIds.map(String) : []
              if (taskIds.length > 0) {
                await vitePrisma.task.deleteMany({ where: { id: { in: taskIds } } })
              }
              const dbTasks = await vitePrisma.task.findMany()
              for (const row of dbTasks) {
                if (!row.actualResult) continue
                try {
                  const parsed = JSON.parse(row.actualResult)
                  const cCode = String(parsed?.contractCode || parsed?.project || '').trim().toUpperCase()
                  if (cCode === rawCode) {
                    await vitePrisma.task.delete({ where: { id: row.id } })
                  }
                } catch {}
              }

              const leads = await vitePrisma.marketingLead.findMany()
              for (const lead of leads) {
                let fv: Record<string, any> = {}
                try {
                  fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                } catch {
                  fv = {}
                }
                const cCode = String(fv.contractNo || fv.hdCode || fv.quoteCode || `HD-${lead.externalId || lead.id}`)
                  .trim()
                  .toUpperCase()
                const hasMatch =
                  Array.isArray(fv.constructionTasks) &&
                  fv.constructionTasks.some((t: any) => String(t.contractCode || '').trim().toUpperCase() === rawCode)
                if (cCode === rawCode || hasMatch) {
                  fv.constructionTasks = []
                  fv.constructionTasksDeleted = true
                  await vitePrisma.marketingLead.update({
                    where: { id: lead.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                }
              }
              const customers = await vitePrisma.customer.findMany()
              for (const cust of customers) {
                let fv: Record<string, any> = {}
                try {
                  fv = cust.formValues ? JSON.parse(cust.formValues) : {}
                } catch {
                  fv = {}
                }
                const cCode = String(fv.contractNo || fv.hdCode || '').trim().toUpperCase()
                const hasMatch =
                  Array.isArray(fv.constructionTasks) &&
                  fv.constructionTasks.some((t: any) => String(t.contractCode || '').trim().toUpperCase() === rawCode)
                if (cCode === rawCode || hasMatch) {
                  fv.constructionTasks = []
                  fv.constructionTasksDeleted = true
                  await vitePrisma.customer.update({
                    where: { id: cust.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                }
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true }))
              return
            }

            if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/api/user-tasks/')) {
              const taskId = parsedUrl.pathname.replace('/api/user-tasks/', '')
              await vitePrisma.task.deleteMany({ where: { id: taskId } })
              const leads = await vitePrisma.marketingLead.findMany()
              for (const lead of leads) {
                let fv: Record<string, any> = {}
                try {
                  fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                } catch {
                  fv = {}
                }
                if (!Array.isArray(fv.constructionTasks)) continue
                const next = fv.constructionTasks.filter((t: any) => String(t.id) !== taskId)
                if (next.length !== fv.constructionTasks.length) {
                  fv.constructionTasks = next
                  await vitePrisma.marketingLead.update({
                    where: { id: lead.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ success: true }))
                  return
                }
              }
              const customers = await vitePrisma.customer.findMany()
              for (const cust of customers) {
                let fv: Record<string, any> = {}
                try {
                  fv = cust.formValues ? JSON.parse(cust.formValues) : {}
                } catch {
                  fv = {}
                }
                if (!Array.isArray(fv.constructionTasks)) continue
                const next = fv.constructionTasks.filter((t: any) => String(t.id) !== taskId)
                if (next.length !== fv.constructionTasks.length) {
                  fv.constructionTasks = next
                  await vitePrisma.customer.update({
                    where: { id: cust.id },
                    data: { formValues: JSON.stringify(fv) },
                  })
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ success: true }))
                  return
                }
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true }))
              return
            }
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/user-tasks:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: err?.message || 'Lỗi server' }))
            return
          }
        }

        if (url.startsWith('/api/sales/dealer-support-tickets')) {
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
        }

        // ── Plan-Finance Stock Counts, Stock Snapshot & Reports Middleware ──
        if (url.startsWith('/api/plan-finance/')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost')
            const pathname = parsedUrl.pathname
            const sendJson = (status: number, payload: unknown) => {
              res.statusCode = status
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(payload))
            }
            const readJsonBody = async () => {
              let raw = ''
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  raw += chunk
                })
                req.on('end', () => resolve())
              })
              return raw ? JSON.parse(raw) : {}
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/stock-counts/next-code') {
              const today = new Date()
              const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '')
              const prefix = `KK-${yyyymmdd}`
              const countToday = await vitePrisma.stockCount.count({
                where: { soChungTu: { startsWith: prefix } },
              })
              const nextNumber = String(countToday + 1).padStart(3, '0')
              sendJson(200, { nextCode: `${prefix}-${nextNumber}` })
              return
            }

            if (req.method === 'POST' && pathname === '/api/plan-finance/stock-counts') {
              const body = await readJsonBody()
              const { id, soChungTu, scope, warehouseId, nguoiKiem, ngayKiem, ghiChu, trangThai = 'hoan-thanh', lines = [] } = body || {}
              let stockCount
              if (id) {
                stockCount = await vitePrisma.stockCount.update({
                  where: { id },
                  data: {
                    soChungTu: soChungTu || undefined,
                    scope: scope || 'warehouse',
                    warehouseId: warehouseId || null,
                    nguoiKiem: nguoiKiem || 'Ban kiểm kê kho',
                    ngayKiem: ngayKiem ? new Date(ngayKiem) : new Date(),
                    ghiChu: ghiChu || null,
                    trangThai: trangThai || 'hoan-thanh',
                  },
                })
                if (Array.isArray(lines) && lines.length > 0) {
                  await vitePrisma.stockCountLine.deleteMany({ where: { stockCountId: id } })
                  await vitePrisma.stockCountLine.createMany({
                    data: lines.map((l: any) => ({
                      stockCountId: id,
                      inventoryItemId: l.inventoryItemId,
                      warehouseId: l.warehouseId || warehouseId || null,
                      soLuongHeTong: parseFloat(l.soLuongHeTong) || 0,
                      soLuongThucTe: l.soLuongThucTe !== null && l.soLuongThucTe !== undefined ? parseFloat(l.soLuongThucTe) : null,
                      chenh: l.chenh !== null && l.chenh !== undefined ? parseFloat(l.chenh) : null,
                      ghiChu: l.ghiChu || null,
                    })),
                  })
                }
              } else {
                stockCount = await vitePrisma.stockCount.create({
                  data: {
                    soChungTu: soChungTu || `PKK-${Date.now().toString().slice(-6)}`,
                    scope: scope || 'warehouse',
                    warehouseId: warehouseId || null,
                    nguoiKiem: nguoiKiem || 'Ban kiểm kê kho',
                    ngayKiem: ngayKiem ? new Date(ngayKiem) : new Date(),
                    ghiChu: ghiChu || null,
                    trangThai: trangThai || 'hoan-thanh',
                    lines: {
                      create: (Array.isArray(lines) ? lines : []).map((l: any) => ({
                        inventoryItemId: l.inventoryItemId,
                        warehouseId: l.warehouseId || warehouseId || null,
                        soLuongHeTong: parseFloat(l.soLuongHeTong) || 0,
                        soLuongThucTe: l.soLuongThucTe !== null && l.soLuongThucTe !== undefined ? parseFloat(l.soLuongThucTe) : null,
                        chenh: l.chenh !== null && l.chenh !== undefined ? parseFloat(l.chenh) : null,
                        ghiChu: l.ghiChu || null,
                      })),
                    },
                  },
                })
              }
              sendJson(200, { success: true, id: stockCount.id, stockCount })
              return
            }

            if (req.method === 'POST' && pathname === '/api/plan-finance/stock-movements/batch-kiem-kho') {
              const body = await readJsonBody()
              const { warehouseId, soChungTu, nguoiKiem, lines = [] } = body || {}
              let adjustedCount = 0
              await vitePrisma.$transaction(async (tx) => {
                for (const line of Array.isArray(lines) ? lines : []) {
                  const itemId = line.inventoryItemId
                  const targetWhId = line.warehouseId || warehouseId
                  const soLuongThucTe = line.soLuongThucTe !== null && line.soLuongThucTe !== undefined ? parseFloat(line.soLuongThucTe) : null
                  const soLuongHeTong = line.soLuongHeTong !== null && line.soLuongHeTong !== undefined ? parseFloat(line.soLuongHeTong) : 0
                  if (soLuongThucTe === null || isNaN(soLuongThucTe)) continue
                  const chenh = soLuongThucTe - soLuongHeTong
                  if (Math.abs(chenh) < 0.0001) continue
                  adjustedCount++
                  await tx.stockMovement.create({
                    data: {
                      inventoryItemId: itemId,
                      fromWarehouseId: chenh < 0 ? targetWhId : null,
                      toWarehouseId: chenh > 0 ? targetWhId : null,
                      type: 'dieu-chinh',
                      soLuong: Math.abs(chenh),
                      soLuongTruoc: soLuongHeTong,
                      soLuongSau: soLuongThucTe,
                      soChungTu: soChungTu || `PKK-${Date.now().toString().slice(-6)}`,
                      lyDo: line.ghiChu || `Điều chỉnh kiểm kê đối soát (${chenh > 0 ? 'Thừa' : 'Thiếu'} ${Math.abs(chenh)})`,
                      nguoiThucHien: nguoiKiem || 'Tổ kiểm kê độc lập',
                    },
                  })
                  if (targetWhId) {
                    await tx.inventoryStock.upsert({
                      where: {
                        inventoryItemId_warehouseId: {
                          inventoryItemId: itemId,
                          warehouseId: targetWhId,
                        },
                      },
                      create: {
                        inventoryItemId: itemId,
                        warehouseId: targetWhId,
                        soLuong: soLuongThucTe,
                      },
                      update: {
                        soLuong: soLuongThucTe,
                      },
                    })
                  }
                  await tx.inventoryItem.update({
                    where: { id: itemId },
                    data: { soLuong: { increment: chenh } },
                  })
                }
              })
              sendJson(200, { success: true, adjustedCount })
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/stock-counts') {
              const trangThai = parsedUrl.searchParams.get('trangThai')?.trim() || undefined
              const warehouseId = parsedUrl.searchParams.get('warehouseId')?.trim() || undefined
              const list = await vitePrisma.stockCount.findMany({
                where: {
                  ...(trangThai ? { trangThai } : {}),
                  ...(warehouseId ? { warehouseId } : {}),
                },
                include: {
                  warehouse: true,
                  _count: { select: { lines: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: 100,
              })
              sendJson(
                200,
                list.map((sc) => ({
                  id: sc.id,
                  soChungTu: sc.soChungTu,
                  scope: sc.scope,
                  warehouseId: sc.warehouseId,
                  warehouseName: sc.warehouse?.name || null,
                  nguoiKiem: sc.nguoiKiem,
                  ngayKiem: sc.ngayKiem ? sc.ngayKiem.toISOString() : null,
                  ghiChu: sc.ghiChu,
                  trangThai: sc.trangThai,
                  soLuongDong: sc._count?.lines ?? 0,
                  updatedAt: sc.updatedAt ? sc.updatedAt.toISOString() : new Date().toISOString(),
                }))
              )
              return
            }

            if (
              pathname.startsWith('/api/plan-finance/stock-counts/') &&
              pathname !== '/api/plan-finance/stock-counts/next-code'
            ) {
              const id = pathname.replace('/api/plan-finance/stock-counts/', '').trim()
              if (req.method === 'GET' && id) {
                const sc = await vitePrisma.stockCount.findUnique({
                  where: { id },
                  include: { warehouse: true, lines: true },
                })
                if (!sc) {
                  sendJson(404, { error: 'Không tìm thấy phiếu kiểm kho' })
                  return
                }
                const itemIds = Array.from(new Set((sc.lines || []).map((l) => l.inventoryItemId).filter(Boolean)))
                const items = itemIds.length
                  ? await vitePrisma.inventoryItem.findMany({
                      where: { id: { in: itemIds } },
                      select: { id: true, tenHang: true, code: true, donVi: true },
                    })
                  : []
                const itemMap = new Map(items.map((it) => [it.id, it]))
                sendJson(200, {
                  id: sc.id,
                  soChungTu: sc.soChungTu,
                  scope: sc.scope,
                  warehouseId: sc.warehouseId,
                  warehouseName: sc.warehouse?.name || null,
                  nguoiKiem: sc.nguoiKiem,
                  ngayKiem: sc.ngayKiem ? sc.ngayKiem.toISOString() : null,
                  ghiChu: sc.ghiChu,
                  trangThai: sc.trangThai,
                  soLuongDong: (sc.lines || []).length,
                  updatedAt: sc.updatedAt ? sc.updatedAt.toISOString() : new Date().toISOString(),
                  lines: (sc.lines || []).map((l) => {
                    const it = itemMap.get(l.inventoryItemId)
                    return {
                      id: l.id,
                      inventoryItemId: l.inventoryItemId,
                      tenHang: it?.tenHang || 'Hàng hoá',
                      maSku: it?.code || null,
                      donVi: it?.donVi || null,
                      warehouseId: l.warehouseId,
                      soLuongHeTong: l.soLuongHeTong,
                      soLuongThucTe: l.soLuongThucTe,
                      chenh: l.chenh,
                      ghiChu: l.ghiChu,
                    }
                  }),
                })
                return
              }
              if (req.method === 'DELETE' && id) {
                await vitePrisma.stockCountLine.deleteMany({ where: { stockCountId: id } })
                await vitePrisma.stockCount.delete({ where: { id } })
                sendJson(200, { ok: true })
                return
              }
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/inventory/stock-snapshot') {
              const warehouseId = (parsedUrl.searchParams.get('warehouseId') || '').trim()
              const items = await vitePrisma.inventoryItem.findMany({
                where:
                  warehouseId && warehouseId !== 'all'
                    ? {
                        stocks: {
                          some: {
                            OR: [{ warehouseId }, { warehouse: { code: warehouseId } }],
                          },
                        },
                      }
                    : {},
                include: {
                  stocks: { include: { warehouse: true } },
                  category: true,
                  erpCategory: true,
                },
                orderBy: { tenHang: 'asc' },
              })

              const rows = items.map((it) => {
                const matchedStock =
                  warehouseId && warehouseId !== 'all'
                    ? (it.stocks || []).find(
                        (s) =>
                          s.warehouseId === warehouseId ||
                          s.warehouse?.id === warehouseId ||
                          s.warehouse?.code === warehouseId
                      )
                    : (it.stocks || [])[0] || null

                const soLuongHeTong =
                  warehouseId && warehouseId !== 'all'
                    ? matchedStock?.soLuong ?? 0
                    : (it.stocks || []).length > 0
                    ? (it.stocks || []).reduce((acc, s) => acc + (s.soLuong || 0), 0)
                    : it.soLuong || 0

                const soLuongMin = matchedStock?.soLuongMin || it.soLuongMin || 0
                let trangThai = 'con-hang'
                if (soLuongHeTong <= 0) trangThai = 'het-hang'
                else if (soLuongMin > 0 && soLuongHeTong <= soLuongMin) trangThai = 'sap-het'

                return {
                  inventoryItemId: it.id,
                  tenHang: it.tenHang,
                  maSku: it.code || null,
                  donVi: it.donVi || 'cái',
                  giaNhap: it.giaNhap || 0,
                  soLuongHeTong,
                  soLuongMin,
                  soLuongThucTe: '',
                  trangThai,
                  categoryId: it.categoryId || it.erpCategoryId || null,
                  erpCategoryId: it.erpCategoryId || null,
                  categoryName: it.category?.name || it.erpCategory?.name || null,
                  categoryCode: it.category?.code || it.erpCategory?.code || null,
                  thongSoKyThuat: it.thongSoKyThuat || null,
                  warehouseId:
                    matchedStock?.warehouseId || (warehouseId && warehouseId !== 'all' ? warehouseId : undefined),
                  warehouseName: matchedStock?.warehouse?.name || undefined,
                  viTriHang: matchedStock?.viTriHang || null,
                  viTriCot: matchedStock?.viTriCot || null,
                  viTriTang: matchedStock?.viTriTang || null,
                  ghiChu: '',
                  chuaPhanKho: !(it.stocks && it.stocks.length > 0),
                }
              })

              sendJson(200, rows)
              return
            }

            if (req.method === 'POST' && pathname === '/api/plan-finance/inventory/assign-warehouse') {
              const body = await readJsonBody()
              const { inventoryItemId, warehouseId } = body || {}
              if (!inventoryItemId || !warehouseId) {
                sendJson(400, { error: 'Thiếu inventoryItemId hoặc warehouseId' })
                return
              }
              const item = await vitePrisma.inventoryItem.findUnique({ where: { id: inventoryItemId } })
              if (!item) {
                sendJson(404, { error: 'Không tìm thấy hàng hoá' })
                return
              }
              const stock = await vitePrisma.inventoryStock.upsert({
                where: {
                  inventoryItemId_warehouseId: {
                    inventoryItemId,
                    warehouseId,
                  },
                },
                create: {
                  inventoryItemId,
                  warehouseId,
                  soLuong: item.soLuong || 0,
                  soLuongMin: item.soLuongMin || 0,
                },
                update: {},
                include: { warehouse: true },
              })
              sendJson(200, {
                warehouseId: stock.warehouseId,
                warehouseName: stock.warehouse?.name || '',
                soLuong: stock.soLuong || 0,
                soLuongMin: stock.soLuongMin || 0,
              })
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/inventory/location') {
              const itemId = (parsedUrl.searchParams.get('itemId') || '').trim()
              const warehouseId = (parsedUrl.searchParams.get('warehouseId') || '').trim()
              if (!itemId || !warehouseId) {
                sendJson(200, { soLuong: 0, viTriHang: '', viTriCot: '', viTriTang: '' })
                return
              }
              const st = await vitePrisma.inventoryStock.findUnique({
                where: {
                  inventoryItemId_warehouseId: {
                    inventoryItemId: itemId,
                    warehouseId,
                  },
                },
              })
              sendJson(200, {
                soLuong: st?.soLuong ?? 0,
                viTriHang: st?.viTriHang ?? '',
                viTriCot: st?.viTriCot ?? '',
                viTriTang: st?.viTriTang ?? '',
              })
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/stock-movements') {
              const limit = Math.min(500, Math.max(1, parseInt(parsedUrl.searchParams.get('limit') || '100', 10) || 100))
              const type = parsedUrl.searchParams.get('type')?.trim() || undefined
              const warehouseId = parsedUrl.searchParams.get('warehouseId')?.trim() || undefined
              const movements = await vitePrisma.stockMovement.findMany({
                where: {
                  ...(type ? { type } : {}),
                  ...(warehouseId ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] } : {}),
                },
                include: {
                  inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true } },
                  toWarehouse: { select: { id: true, code: true, name: true } },
                  fromWarehouse: { select: { id: true, code: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
              })
              sendJson(200, movements)
              return
            }

            if (req.method === 'GET' && pathname.startsWith('/api/plan-finance/warehouses/')) {
              const id = pathname.replace('/api/plan-finance/warehouses/', '').trim()
              if (id) {
                const wh = await vitePrisma.warehouse.findUnique({ where: { id } })
                if (!wh) {
                  sendJson(404, { error: 'Không tìm thấy kho' })
                  return
                }
                sendJson(200, wh)
                return
              }
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/stock-card/items') {
              const warehouseId = (parsedUrl.searchParams.get('warehouseId') || '').trim()
              const items = await vitePrisma.inventoryItem.findMany({
                where: warehouseId && warehouseId !== 'all' ? { stocks: { some: { warehouseId } } } : {},
                select: { id: true, tenHang: true, code: true },
                orderBy: { tenHang: 'asc' },
              })
              sendJson(200, items)
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/stock-card') {
              const inventoryItemId = (parsedUrl.searchParams.get('inventoryItemId') || '').trim()
              const warehouseId = (parsedUrl.searchParams.get('warehouseId') || '').trim()
              const fromStr = parsedUrl.searchParams.get('from')
              const toStr = parsedUrl.searchParams.get('to')
              const from = fromStr ? new Date(fromStr) : null
              const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null
              if (!inventoryItemId) {
                sendJson(400, { error: 'Thiếu inventoryItemId' })
                return
              }
              const item = await vitePrisma.inventoryItem.findUnique({
                where: { id: inventoryItemId },
                include: { category: true, erpCategory: true, stocks: true },
              })
              if (!item) {
                sendJson(404, { error: 'Không tìm thấy hàng hoá' })
                return
              }
              const stockInWh = warehouseId ? (item.stocks || []).find((s) => s.warehouseId === warehouseId) : null
              const tonHienTai = warehouseId
                ? stockInWh?.soLuong ?? 0
                : (item.stocks || []).reduce((acc, s) => acc + (s.soLuong || 0), 0) || item.soLuong || 0
              const movements = await vitePrisma.stockMovement.findMany({
                where: {
                  inventoryItemId,
                  ...(warehouseId ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] } : {}),
                  ...(from || to
                    ? {
                        createdAt: {
                          ...(from ? { gte: from } : {}),
                          ...(to ? { lte: to } : {}),
                        },
                      }
                    : {}),
                },
                include: {
                  fromWarehouse: { select: { name: true } },
                  toWarehouse: { select: { name: true } },
                },
                orderBy: { createdAt: 'asc' },
              })
              const lines = movements.map((m) => {
                const isIn =
                  m.type === 'nhap' ||
                  (m.type === 'luan-chuyen' && warehouseId && m.toWarehouseId === warehouseId) ||
                  (m.type === 'dieu-chinh' && (m.soLuongSau ?? 0) >= (m.soLuongTruoc ?? 0))
                return {
                  id: m.id,
                  ngay: m.createdAt.toISOString(),
                  type: m.type,
                  soChungTu: m.soChungTu,
                  lyDo: m.lyDo,
                  nguoiThucHien: m.nguoiThucHien,
                  fromKho: m.fromWarehouse?.name || null,
                  toKho: m.toWarehouse?.name || null,
                  nhap: isIn ? m.soLuong : null,
                  xuat: !isIn ? m.soLuong : null,
                  tonCuoi: m.soLuongSau ?? tonHienTai,
                  chenh: m.type === 'dieu-chinh' ? (m.soLuongSau ?? 0) - (m.soLuongTruoc ?? 0) : null,
                }
              })
              const tonDauKy = movements.length > 0 ? movements[0].soLuongTruoc ?? tonHienTai : tonHienTai
              sendJson(200, {
                item: {
                  id: item.id,
                  tenHang: item.tenHang,
                  code: item.code,
                  donVi: item.donVi,
                  giaNhap: item.giaNhap,
                  soLuongMin: stockInWh?.soLuongMin ?? item.soLuongMin ?? 0,
                  category: item.category?.name || item.erpCategory?.name || null,
                },
                tonDauKy,
                tonHienTai,
                lines,
              })
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/reports/bang-ke-xnt') {
              const warehouseId = (parsedUrl.searchParams.get('warehouseId') || '').trim()
              const fromStr = parsedUrl.searchParams.get('from')
              const toStr = parsedUrl.searchParams.get('to')
              const from = fromStr ? new Date(fromStr) : null
              const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null
              const stocks = await vitePrisma.inventoryStock.findMany({
                where: warehouseId ? { warehouseId } : {},
                include: { inventoryItem: true },
              })
              const movements = await vitePrisma.stockMovement.findMany({
                where: {
                  ...(warehouseId ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] } : {}),
                  ...(from || to
                    ? {
                        createdAt: {
                          ...(from ? { gte: from } : {}),
                          ...(to ? { lte: to } : {}),
                        },
                      }
                    : {}),
                },
              })
              const movByItem = new Map<string, { nhapSL: number; xuatSL: number }>()
              movements.forEach((m) => {
                const cur = movByItem.get(m.inventoryItemId) || { nhapSL: 0, xuatSL: 0 }
                if (m.type === 'nhap' || (m.type === 'luan-chuyen' && m.toWarehouseId === warehouseId)) {
                  cur.nhapSL += m.soLuong || 0
                } else if (m.type === 'xuat' || (m.type === 'luan-chuyen' && m.fromWarehouseId === warehouseId)) {
                  cur.xuatSL += m.soLuong || 0
                }
                movByItem.set(m.inventoryItemId, cur)
              })
              const lines = stocks.map((st) => {
                const it = st.inventoryItem
                const donGia = it?.giaNhap || 0
                const tonCuoiSL = st.soLuong || 0
                const mv = movByItem.get(st.inventoryItemId) || { nhapSL: 0, xuatSL: 0 }
                const tonDauSL = Math.max(0, tonCuoiSL - mv.nhapSL + mv.xuatSL)
                return {
                  maSku: it?.code || null,
                  tenHang: it?.tenHang || 'Hàng hoá',
                  donVi: it?.donVi || 'cái',
                  tonDauSL,
                  tonDauTT: tonDauSL * donGia,
                  nhapSL: mv.nhapSL,
                  nhapTT: mv.nhapSL * donGia,
                  xuatSL: mv.xuatSL,
                  xuatTT: mv.xuatSL * donGia,
                  tonCuoiSL,
                  tonCuoiTT: tonCuoiSL * donGia,
                }
              })
              sendJson(200, lines)
              return
            }

            if (
              req.method === 'GET' &&
              (pathname === '/api/plan-finance/reports/bang-ke-nhap' ||
                pathname === '/api/plan-finance/reports/bang-ke-xuat')
            ) {
              const isNhap = pathname.endsWith('bang-ke-nhap')
              const warehouseId = (parsedUrl.searchParams.get('warehouseId') || '').trim()
              const fromStr = parsedUrl.searchParams.get('from')
              const toStr = parsedUrl.searchParams.get('to')
              const from = fromStr ? new Date(fromStr) : null
              const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null
              const movements = await vitePrisma.stockMovement.findMany({
                where: {
                  ...(warehouseId
                    ? isNhap
                      ? { toWarehouseId: warehouseId }
                      : { fromWarehouseId: warehouseId }
                    : { type: isNhap ? 'nhap' : 'xuat' }),
                  ...(from || to
                    ? {
                        createdAt: {
                          ...(from ? { gte: from } : {}),
                          ...(to ? { lte: to } : {}),
                        },
                      }
                    : {}),
                },
                include: {
                  inventoryItem: true,
                  fromWarehouse: true,
                  toWarehouse: true,
                },
                orderBy: { createdAt: 'desc' },
              })
              sendJson(
                200,
                movements.map((m) => {
                  const donGia = m.donGia ?? m.inventoryItem?.giaNhap ?? 0
                  return {
                    soChungTu: m.soChungTu,
                    ngay: m.createdAt.toISOString(),
                    type: m.type,
                    lyDo: m.lyDo,
                    fromKho: m.fromWarehouse?.name || null,
                    toKho: m.toWarehouse?.name || null,
                    maSku: m.inventoryItem?.code || null,
                    tenHang: m.inventoryItem?.tenHang || 'Hàng hoá',
                    donVi: m.inventoryItem?.donVi || 'cái',
                    soLuong: m.soLuong || 0,
                    donGia,
                    thanhTien: (m.soLuong || 0) * donGia,
                  }
                })
              )
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/sales-active') {
              const includeId = parsedUrl.searchParams.get('includeId') || undefined
              const [contracts, saleOrders, retailInvoices] = await Promise.all([
                vitePrisma.contract.findMany({
                  where: includeId
                    ? { OR: [{ trangThai: 'active' }, { id: includeId }] }
                    : { trangThai: 'active' },
                  orderBy: { createdAt: 'desc' },
                  take: 100,
                  select: {
                    id: true,
                    code: true,
                    trangThai: true,
                    giaTriHopDong: true,
                    customer: { select: { name: true, address: true } },
                  },
                }),
                vitePrisma.saleOrder.findMany({
                  where: includeId
                    ? {
                        OR: [
                          {
                            trangThai: { in: ['active', 'confirmed', 'processing', 'approved'] },
                            keToanDuyet: 'approved',
                            trangThaiKho: { not: 'exported' },
                          },
                          { id: includeId },
                        ],
                      }
                    : {
                        trangThai: { in: ['active', 'confirmed', 'processing', 'approved'] },
                        keToanDuyet: 'approved',
                        trangThaiKho: { not: 'exported' },
                      },
                  orderBy: { createdAt: 'desc' },
                  take: 100,
                  select: {
                    id: true,
                    code: true,
                    trangThai: true,
                    trangThaiKho: true,
                    tongTien: true,
                    diaChiGiaoHang: true,
                    customer: { select: { name: true, address: true } },
                    logisticsTickets: { select: { id: true, type: true, status: true } },
                  },
                }),
                vitePrisma.retailInvoice.findMany({
                  where: includeId
                    ? { OR: [{ trangThai: { in: ['partial'] } }, { id: includeId }] }
                    : { trangThai: { in: ['partial'] } },
                  orderBy: { createdAt: 'desc' },
                  take: 100,
                  select: { id: true, code: true, trangThai: true, tongCong: true, tenKhach: true, diaChi: true },
                }),
              ])

              const activeSaleOrders = saleOrders.filter((so) => {
                if (includeId && so.id === includeId) return true
                if (so.trangThaiKho === 'exported') return false
                const tickets = so.logisticsTickets || []
                const packingTickets = tickets.filter((t) => t.type === 'BATCH_PACKING')
                if (packingTickets.length > 0) {
                  const hasCompleted = packingTickets.every((t) => t.status === 'COMPLETED')
                  if (hasCompleted) return false
                  const hasPendingOnly = packingTickets.every((t) => t.status === 'PENDING')
                  if (hasPendingOnly) return false
                }
                return true
              })

              sendJson(200, [
                ...contracts.map((c) => ({
                  id: c.id,
                  code: c.code,
                  type: 'contract',
                  typeLabel: 'Hợp đồng',
                  customer: c.customer?.name ?? null,
                  customerAddress: c.customer?.address ?? null,
                  tongTien: c.giaTriHopDong,
                  trangThai: c.trangThai,
                })),
                ...activeSaleOrders.map((so) => ({
                  id: so.id,
                  code: so.code,
                  type: 'sale-order',
                  typeLabel: 'Đơn bán hàng',
                  customer: so.customer?.name ?? null,
                  customerAddress: so.diaChiGiaoHang || so.customer?.address || null,
                  tongTien: so.tongTien,
                  trangThai: so.trangThai,
                  trangThaiKho: so.trangThaiKho,
                })),
                ...retailInvoices.map((inv) => ({
                  id: inv.id,
                  code: inv.code,
                  type: 'retail-invoice',
                  typeLabel: 'Hoá đơn bán lẻ',
                  customer: inv.tenKhach ?? null,
                  customerAddress: inv.diaChi ?? null,
                  tongTien: inv.tongCong,
                  trangThai: inv.trangThai,
                })),
              ])
              return
            }

            if (req.method === 'GET' && pathname === '/api/plan-finance/inventory/search') {
              const qRaw = String(parsedUrl.searchParams.get('q') || '').trim()
              const idParam = String(parsedUrl.searchParams.get('id') || '').trim()
              const codeParam = String(parsedUrl.searchParams.get('code') || '').trim()
              const warehouseId = String(parsedUrl.searchParams.get('warehouseId') || '').trim()
              const limit = Math.min(50, parseInt(parsedUrl.searchParams.get('limit') || '20', 10) || 20)

              const normalizeVi = (str: unknown) =>
                String(str || '')
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/đ/g, 'd')
                  .trim()

              const allItems = await vitePrisma.inventoryItem.findMany({
                where: idParam ? { id: idParam } : codeParam ? { code: codeParam } : {},
                orderBy: { tenHang: 'asc' },
                include: { stocks: true },
              })

              const qLower = qRaw.toLowerCase()
              const qNorm = normalizeVi(qRaw)

              const filtered = qRaw
                ? allItems.filter((it) => {
                    const code = String(it.code || '').toLowerCase()
                    const maThayThe = String(it.maThayThe || '').toLowerCase()
                    const tenHang = String(it.tenHang || '').toLowerCase()
                    const model = String(it.model || '').toLowerCase()
                    if (
                      code.includes(qLower) ||
                      maThayThe.includes(qLower) ||
                      tenHang.includes(qLower) ||
                      model.includes(qLower)
                    ) {
                      return true
                    }
                    if (qNorm) {
                      return (
                        normalizeVi(it.code).includes(qNorm) ||
                        normalizeVi(it.maThayThe).includes(qNorm) ||
                        normalizeVi(it.tenHang).includes(qNorm) ||
                        normalizeVi(it.model).includes(qNorm)
                      )
                    }
                    return false
                  })
                : allItems

              const mapped = filtered.slice(0, limit).map((it) => {
                const stocks = it.stocks || []
                const matchedStock = warehouseId
                  ? stocks.find((st) => st.warehouseId === warehouseId) || null
                  : stocks.find((st) => (st.soLuong || 0) > 0) || stocks[0] || null
                const soLuongTon = warehouseId
                  ? matchedStock
                    ? matchedStock.soLuong || 0
                    : 0
                  : stocks.reduce((s, st) => s + (st.soLuong || 0), 0) || it.soLuong || 0

                return {
                  id: it.id,
                  code: it.code,
                  maThayThe: it.maThayThe,
                  model: it.model,
                  chatLieu: it.chatLieu,
                  color: it.color,
                  brand: it.brand,
                  thongSoKyThuat: it.thongSoKyThuat,
                  tenHang: it.tenHang,
                  donVi: it.donVi,
                  giaNhap: it.giaNhap,
                  giaBan: it.giaBan,
                  trangThai: it.trangThai,
                  imageUrl: it.imageUrl,
                  soLuongTon,
                  viTriHang: matchedStock?.viTriHang || null,
                  viTriCot: matchedStock?.viTriCot || null,
                  viTriTang: matchedStock?.viTriTang || null,
                }
              })

              sendJson(200, mapped)
              return
            }
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/plan-finance:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: err?.message || 'Lỗi server' }))
            return
          }
        }

        if (req.method === 'GET' && url.startsWith('/api/production/dashboard/recent-orders')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost')
            const includeId = parsedUrl.searchParams.get('includeId') || undefined
            const codeToInclude = includeId ? includeId.replace('LSX', 'DBH') : undefined

            const orders = await vitePrisma.saleOrder.findMany({
              where: includeId
                ? {
                    OR: [
                      {
                        keToanDuyet: 'approved',
                        OR: [
                          { trangThai: 'in_production' },
                          { trangThai: 'pending' },
                          { ngayHoanThanhSanXuat: { not: null } },
                        ],
                      },
                      { code: codeToInclude },
                      { id: includeId },
                    ],
                  }
                : {
                    keToanDuyet: 'approved',
                    OR: [
                      { trangThai: 'in_production' },
                      { trangThai: 'pending' },
                      { ngayHoanThanhSanXuat: { not: null } },
                    ],
                  },
              orderBy: { updatedAt: 'desc' },
              take: 100,
              include: {
                customer: { select: { name: true, address: true } },
                logisticsTickets: { select: { id: true, code: true, type: true, status: true } },
                saleOrderItems: { include: { inventoryItem: true } },
              },
            })

            const result = await Promise.all(
              orders.map(async (order) => {
                const isCompleted = order.ngayHoanThanhSanXuat !== null
                const isRunning = order.trangThai === 'in_production'
                let materialTicket: any =
                  (order.logisticsTickets || []).find((t) => t.type === 'MATERIAL_PICKING' || t.code?.startsWith('MP-') || t.code?.startsWith('CP-')) || null
                let materialExportCode = materialTicket ? materialTicket.code : null
                if (!materialExportCode && order.id) {
                  const foundTicket = await vitePrisma.logisticsTicket.findFirst({
                    where: {
                      OR: [
                        { saleOrderId: order.id },
                        ...(order.code ? [{ saleOrder: { code: order.code } }] : []),
                      ],
                      type: { in: ['MATERIAL_PICKING', 'WARRANTY_MATERIAL'] },
                    },
                    select: { code: true, status: true },
                  })
                  if (foundTicket?.code) {
                    materialExportCode = foundTicket.code
                    materialTicket = foundTicket
                  }
                }
                if (!materialExportCode && order.code) {
                  const sm = await vitePrisma.stockMovement.findFirst({
                    where: {
                      type: 'xuat',
                      OR: [
                        { lyDo: { contains: order.code } },
                        { soChungTu: { contains: order.code } },
                      ],
                    },
                    select: { soChungTu: true },
                  })
                  if (sm?.soChungTu) materialExportCode = sm.soChungTu
                }

                const isInternal = !order.code || order.code.startsWith('LSX')
                const displayName = isInternal
                  ? 'Sản xuất dự trữ hàng hoá'
                  : order.customerId
                    ? 'Sản xuất theo đơn hàng'
                    : 'Sản xuất dự trữ hàng hoá'

                const orderCode = order.code
                  ? order.code.replace('DBH', 'LSX').replace('DHBL', 'LSX').replace('DH', 'LSX')
                  : order.id

                const deadline = order.ngayGiao ? new Date(order.ngayGiao) : null

                return {
                  id: orderCode,
                  saleOrderCode: order.code?.startsWith('LSX') ? null : order.code || null,
                  ngayDat: order.ngayDat,
                  ngayHoanThanh: order.ngayHoanThanhSanXuat || deadline || null,
                  progress: isCompleted ? 100 : 0,
                  status: isCompleted ? 'completed' : isRunning ? 'running' : 'pending',
                  trangThai: order.trangThai,
                  materialTicketCode: materialExportCode,
                  materialTicketStatus: materialTicket ? materialTicket.status : null,
                  customerName: order.customer?.name || null,
                  customerAddress: order.diaChiGiaoHang || order.customer?.address || null,
                  updatedAt: order.updatedAt,
                  name: displayName,
                }
              })
            )

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(result))
            return
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/production/dashboard/recent-orders:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify([]))
            return
          }
        }

        // ── MIDDLEWARE BẢO HIỂM XÃ HỘI & Y TẾ (/api/hr/insurance/*) ──
        if (url.startsWith('/api/hr/insurance')) {
          const sendJson = (status: number, payload: any) => {
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          }
          const readJsonBody = async () => {
            let rawBody = ''
            await new Promise<void>((resolve) => {
              req.on('data', (chunk) => {
                rawBody += chunk
              })
              req.on('end', () => resolve())
            })
            return rawBody ? JSON.parse(rawBody) : {}
          }
          const fmtDateDMY = (dt: any) => {
            if (!dt) return ''
            const d = new Date(dt)
            if (isNaN(d.getTime())) return String(dt)
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
          }

          try {
            // 1. GET /api/hr/insurance/participants
            if (req.method === 'GET' && url.startsWith('/api/hr/insurance/participants')) {
              const [employees, posCategories] = await Promise.all([
                vitePrisma.employee.findMany({
                  include: { user: true },
                  orderBy: { fullName: 'asc' },
                }),
                vitePrisma.category.findMany({ where: { type: 'position' } }),
              ])
              const posMap: Record<string, string> = {}
              for (const c of posCategories) {
                if (c.code) posMap[c.code] = c.name
                if (c.id) posMap[c.id] = c.name
              }
              const list = employees.map((e: any) => {
                const isEnrolled = Boolean(
                  e.isInsuranceEnrolled ||
                    (e.socialInsuranceNumber && String(e.socialInsuranceNumber).trim() !== '') ||
                    (e.insuranceSalary && Number(e.insuranceSalary) > 0)
                )
                return {
                  id: e.userId || e.id,
                  employeeId: e.id,
                  userId: e.userId,
                  code: e.code || '',
                  name: e.fullName,
                  position: posMap[e.position] || e.position || e.user?.role || 'Nhân viên',
                  department: e.departmentName || 'Khối văn phòng',
                  insuranceBookNumber: e.socialInsuranceNumber || '',
                  socialInsuranceNumber: e.socialInsuranceNumber || '',
                  insuranceSalary: Number(e.insuranceSalary || 0),
                  baseSalary: Number(e.baseSalary || 0),
                  hasInsurance: isEnrolled,
                  isInsuranceEnrolled: isEnrolled,
                }
              })
              sendJson(200, list)
              return
            }

            // 2. PUT /api/hr/insurance/employee
            if (req.method === 'PUT' && url.startsWith('/api/hr/insurance/employee')) {
              const body = await readJsonBody()
              const {
                id,
                employeeId,
                employeeName,
                insuranceBookNumber,
                socialInsuranceNumber,
                insuranceSalary,
                hasInsurance,
                isInsuranceEnrolled,
              } = body || {}

              const targetId = employeeId || id
              let emp: any = null
              if (targetId) {
                emp = await vitePrisma.employee.findFirst({
                  where: {
                    OR: [{ id: String(targetId) }, { userId: String(targetId) }, { code: String(targetId) }],
                  },
                })
              }
              if (!emp && employeeName) {
                const allEmps = await vitePrisma.employee.findMany()
                const targetName = String(employeeName).trim().toLowerCase()
                emp = allEmps.find((e) => (e.fullName || '').trim().toLowerCase() === targetName) || null
              }
              if (!emp) {
                sendJson(404, { error: 'Không tìm thấy nhân viên trong cơ sở dữ liệu' })
                return
              }

              const bookNo =
                socialInsuranceNumber !== undefined
                  ? String(socialInsuranceNumber).trim()
                  : insuranceBookNumber !== undefined
                    ? String(insuranceBookNumber).trim()
                    : emp.socialInsuranceNumber

              const enrolledFlag =
                isInsuranceEnrolled !== undefined
                  ? Boolean(isInsuranceEnrolled)
                  : hasInsurance !== undefined
                    ? Boolean(hasInsurance)
                    : emp.isInsuranceEnrolled

              const nextSalary =
                insuranceSalary !== undefined ? Number(insuranceSalary) || 0 : Number(emp.insuranceSalary || 0)

              const updated = await vitePrisma.employee.update({
                where: { id: emp.id },
                data: {
                  socialInsuranceNumber: bookNo || null,
                  insuranceSalary: nextSalary,
                  isInsuranceEnrolled: enrolledFlag,
                },
              })

              try {
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()
                const activeCfg = await vitePrisma.insuranceConfig.findFirst({
                  where: { isActive: true },
                  orderBy: { createdAt: 'desc' },
                })
                const empRate = activeCfg
                  ? (activeCfg.employeeBhxh || 0) + (activeCfg.employeeBhyt || 0) + (activeCfg.employeeBhtn || 0)
                  : 10.5
                const compRate = activeCfg
                  ? (activeCfg.employerBhxh || 0) + (activeCfg.employerBhyt || 0) + (activeCfg.employerBhtn || 0)
                  : 21.5
                const employeeAmount = enrolledFlag ? Math.round((nextSalary * empRate) / 100) : 0
                const employerAmount = enrolledFlag ? Math.round((nextSalary * compRate) / 100) : 0

                await vitePrisma.insuranceHistory.upsert({
                  where: {
                    employeeId_month_year: {
                      employeeId: emp.id,
                      month,
                      year,
                    },
                  },
                  update: {
                    insuranceSalary: nextSalary,
                    employeeAmount,
                    employerAmount,
                    totalAmount: employeeAmount + employerAmount,
                    status: enrolledFlag ? 'active' : 'inactive',
                  },
                  create: {
                    employeeId: emp.id,
                    month,
                    year,
                    insuranceSalary: nextSalary,
                    employeeAmount,
                    employerAmount,
                    totalAmount: employeeAmount + employerAmount,
                    status: enrolledFlag ? 'active' : 'inactive',
                  },
                })
              } catch {}

              sendJson(200, { success: true, data: updated })
              return
            }

            // 3. GET / POST /api/hr/insurance/changes
            if (url.startsWith('/api/hr/insurance/changes')) {
              if (req.method === 'GET') {
                const [changes, posCategories] = await Promise.all([
                  vitePrisma.insuranceChange.findMany({
                    include: { employee: true },
                    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
                  }),
                  vitePrisma.category.findMany({ where: { type: 'position' } }),
                ])
                const posMap: Record<string, string> = {}
                for (const c of posCategories) {
                  if (c.code) posMap[c.code] = c.name
                  if (c.id) posMap[c.id] = c.name
                }
                const mapped = changes.map((c: any) => {
                  const effDate = c.effectiveDate ? new Date(c.effectiveDate) : new Date(c.createdAt)
                  const ym = `${effDate.getFullYear()}${String(effDate.getMonth() + 1).padStart(2, '0')}`
                  const codeSuffix = String(c.id).slice(-4).toUpperCase()
                  const changeType =
                    c.type === 'increase' || c.type === 'decrease' || c.type === 'adjustment'
                      ? c.type
                      : 'adjustment'
                  const changeTypeLabel =
                    changeType === 'increase'
                      ? 'Biến động tăng'
                      : changeType === 'decrease'
                        ? 'Biến động giảm'
                        : 'Điều chỉnh thu nhập'
                  const isApproved = c.status === 'approved' || c.status === 'completed'
                  return {
                    id: c.id,
                    code: `BD-${ym}-${codeSuffix}`,
                    employeeId: c.employeeId,
                    employeeName: c.employee?.fullName || 'Nhân sự',
                    employeeCode: c.employee?.code || '',
                    department: c.employee?.departmentName || 'Văn phòng',
                    position: posMap[c.employee?.position] || c.employee?.position || 'Nhân viên',
                    changeType,
                    changeTypeLabel,
                    description: c.reason || '',
                    oldSalary: Number(c.oldSalary || 0),
                    newSalary: Number(c.newSalary || 0),
                    effectiveDate: fmtDateDMY(c.effectiveDate),
                    createdDate: fmtDateDMY(c.createdAt),
                    status: isApproved ? 'approved' : 'processing',
                    statusText: isApproved ? 'Cơ quan BHXH đã duyệt' : 'Đang xử lý hồ sơ',
                  }
                })
                sendJson(200, mapped)
                return
              }

              if (req.method === 'POST') {
                const body = await readJsonBody()
                const {
                  employeeNames = [],
                  employeeIds = [],
                  changeType = 'increase',
                  effectiveDate,
                  newSalary,
                  description,
                  status = 'approved',
                } = body || {}

                const allEmps = await vitePrisma.employee.findMany()
                const targetEmps: any[] = []
                if (Array.isArray(employeeIds) && employeeIds.length > 0) {
                  for (const eid of employeeIds) {
                    const found = allEmps.find((e) => e.id === eid || e.userId === eid || e.code === eid)
                    if (found && !targetEmps.some((t) => t.id === found.id)) targetEmps.push(found)
                  }
                }
                const nameList = Array.isArray(employeeNames)
                  ? employeeNames
                  : String(employeeNames || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                for (const name of nameList) {
                  const lower = name.toLowerCase()
                  const found = allEmps.find((e) => (e.fullName || '').trim().toLowerCase() === lower)
                  if (found && !targetEmps.some((t) => t.id === found.id)) targetEmps.push(found)
                }

                if (targetEmps.length === 0) {
                  sendJson(400, { error: 'Không tìm thấy nhân viên hợp lệ trong cơ sở dữ liệu' })
                  return
                }

                const parsedEffDate = effectiveDate ? new Date(effectiveDate) : new Date()
                const cleanNewSalary = Number(String(newSalary || 0).replace(/\D/g, '')) || 0

                const createdList = []
                for (const emp of targetEmps) {
                  const created = await vitePrisma.insuranceChange.create({
                    data: {
                      employeeId: emp.id,
                      type: changeType,
                      effectiveDate: isNaN(parsedEffDate.getTime()) ? new Date() : parsedEffDate,
                      oldSalary: Number(emp.insuranceSalary || 0),
                      newSalary:
                        changeType === 'decrease'
                          ? 0
                          : cleanNewSalary || Number(emp.insuranceSalary || emp.baseSalary || 0),
                      reason: description || '',
                      status: status || 'approved',
                    },
                    include: { employee: true },
                  })
                  createdList.push(created)

                  if (changeType === 'increase') {
                    await vitePrisma.employee.update({
                      where: { id: emp.id },
                      data: {
                        isInsuranceEnrolled: true,
                        ...(cleanNewSalary > 0 ? { insuranceSalary: cleanNewSalary } : {}),
                      },
                    })
                  } else if (changeType === 'decrease') {
                    await vitePrisma.employee.update({
                      where: { id: emp.id },
                      data: { isInsuranceEnrolled: false },
                    })
                  } else if (changeType === 'adjustment' && cleanNewSalary > 0) {
                    await vitePrisma.employee.update({
                      where: { id: emp.id },
                      data: { isInsuranceEnrolled: true, insuranceSalary: cleanNewSalary },
                    })
                  }
                }
                sendJson(201, { success: true, data: createdList })
                return
              }
            }

            // 4. GET / POST /api/hr/insurance/benefits
            if (url.startsWith('/api/hr/insurance/benefits')) {
              if (req.method === 'GET') {
                const benefits = await vitePrisma.insuranceBenefit.findMany({
                  include: { employee: true },
                  orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
                })
                const mapped = benefits.map((b: any) => {
                  const sDate = b.startDate ? new Date(b.startDate) : new Date(b.createdAt)
                  const eDate = b.endDate ? new Date(b.endDate) : sDate
                  const ym = `${sDate.getFullYear()}${String(sDate.getMonth() + 1).padStart(2, '0')}`
                  const codeSuffix = String(b.id).slice(-4).toUpperCase()
                  const diffDays = Math.max(
                    1,
                    Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  )
                  const isApproved = b.status === 'approved' || b.status === 'completed'
                  return {
                    id: `CD-${ym}-${codeSuffix}`,
                    dbId: b.id,
                    employeeId: b.employeeId,
                    employeeName: b.employee?.fullName || 'Nhân sự',
                    employeeCode: b.employee?.code || '',
                    department: b.employee?.departmentName || 'Văn phòng',
                    claimType: b.regimeType || 'Ốm đau ngắn ngày',
                    fromDate: fmtDateDMY(b.startDate),
                    toDate: fmtDateDMY(b.endDate),
                    days: isNaN(diffDays) ? 1 : diffDays,
                    amount: Number(b.amount || 0),
                    status: isApproved ? 'approved' : 'processing',
                    statusText: isApproved ? 'Đã thanh toán' : 'Đang gửi hồ sơ điện tử',
                    note: b.notes || '',
                  }
                })
                sendJson(200, mapped)
                return
              }

              if (req.method === 'POST') {
                const body = await readJsonBody()
                const {
                  employeeId,
                  employeeName,
                  claimType = 'Ốm đau ngắn ngày',
                  fromDate,
                  toDate,
                  amount = 0,
                  note = '',
                  status = 'processing',
                } = body || {}

                let emp: any = null
                if (employeeId) {
                  emp = await vitePrisma.employee.findFirst({
                    where: {
                      OR: [{ id: String(employeeId) }, { userId: String(employeeId) }, { code: String(employeeId) }],
                    },
                  })
                }
                if (!emp && employeeName) {
                  const allEmps = await vitePrisma.employee.findMany()
                  const lower = String(employeeName).trim().toLowerCase()
                  emp = allEmps.find((e) => (e.fullName || '').trim().toLowerCase() === lower) || null
                }
                if (!emp) {
                  sendJson(400, { error: 'Vui lòng chọn nhân viên hợp lệ trong cơ sở dữ liệu' })
                  return
                }

                const sDate = fromDate ? new Date(fromDate) : new Date()
                const eDate = toDate ? new Date(toDate) : sDate
                const cleanAmount = Number(String(amount || 0).replace(/\D/g, '')) || 0

                const created = await vitePrisma.insuranceBenefit.create({
                  data: {
                    employeeId: emp.id,
                    regimeType: claimType,
                    startDate: isNaN(sDate.getTime()) ? new Date() : sDate,
                    endDate: isNaN(eDate.getTime()) ? new Date() : eDate,
                    amount: cleanAmount,
                    status: status || 'processing',
                    notes: note || null,
                  },
                  include: { employee: true },
                })
                sendJson(201, { success: true, data: created })
                return
              }
            }

            // 5. GET / PUT /api/hr/insurance/config
            if (url.startsWith('/api/hr/insurance/config')) {
              if (req.method === 'GET') {
                let cfg = await vitePrisma.insuranceConfig.findFirst({
                  where: { isActive: true },
                  orderBy: { createdAt: 'desc' },
                })
                if (!cfg) {
                  cfg = await vitePrisma.insuranceConfig.findFirst({
                    orderBy: { createdAt: 'desc' },
                  })
                }
                const extraPolicy = await vitePrisma.laborPolicy
                  .findFirst({ where: { type: 'insurance_config_extra' } })
                  .catch(() => null)
                let extra: Record<string, any> = {}
                if (extraPolicy?.content) {
                  try {
                    extra = JSON.parse(extraPolicy.content)
                  } catch {}
                }
                sendJson(200, cfg ? { ...cfg, ...extra } : extra)
                return
              }

              if (req.method === 'PUT') {
                const body = await readJsonBody()
                const existing = await vitePrisma.insuranceConfig.findFirst({
                  where: { isActive: true },
                  orderBy: { createdAt: 'desc' },
                })

                const dataPayload = {
                  employerBhxh: body.compBhxhRate !== undefined ? Number(body.compBhxhRate) : 17.5,
                  employerBhyt: body.compBhytRate !== undefined ? Number(body.compBhytRate) : 3.0,
                  employerBhtn: body.compBhtnRate !== undefined ? Number(body.compBhtnRate) : 1.0,
                  employeeBhxh: body.empBhxhRate !== undefined ? Number(body.empBhxhRate) : 8.0,
                  employeeBhyt: body.empBhytRate !== undefined ? Number(body.empBhytRate) : 1.5,
                  employeeBhtn: body.empBhtnRate !== undefined ? Number(body.empBhtnRate) : 1.0,
                  baseReferenceWage: body.baseSalary !== undefined ? Number(body.baseSalary) : 2340000,
                  sickLeaveRate: body.sicknessRate !== undefined ? Number(body.sicknessRate) : 75,
                  maternityRate: body.maternityRate !== undefined ? Number(body.maternityRate) : 100,
                  maternityAllowance:
                    body.maternityOneTimeMultiplier !== undefined ? Number(body.maternityOneTimeMultiplier) : 2,
                  recoveryRate:
                    body.convalescenceDailyRate !== undefined ? Number(body.convalescenceDailyRate) : 30,
                  funeralAllowance: body.funeralMultiplier !== undefined ? Number(body.funeralMultiplier) : 10,
                  isActive: true,
                }

                const saved = existing
                  ? await vitePrisma.insuranceConfig.update({
                      where: { id: existing.id },
                      data: dataPayload,
                    })
                  : await vitePrisma.insuranceConfig.create({
                      data: dataPayload,
                    })

                const extraPayload = {
                  unemploymentRate: body.unemploymentRate !== undefined ? Number(body.unemploymentRate) : 60,
                  survivorRateNormal: body.survivorRateNormal !== undefined ? Number(body.survivorRateNormal) : 50,
                  authorityName: body.authorityName || 'Bảo hiểm xã hội Thành phố Hà Nội',
                  agencyCode: body.agencyCode || 'TZ0123A',
                }
                const existingExtra = await vitePrisma.laborPolicy
                  .findFirst({ where: { type: 'insurance_config_extra' } })
                  .catch(() => null)
                if (existingExtra) {
                  await vitePrisma.laborPolicy.update({
                    where: { id: existingExtra.id },
                    data: { content: JSON.stringify(extraPayload) },
                  })
                } else {
                  await vitePrisma.laborPolicy.create({
                    data: {
                      type: 'insurance_config_extra',
                      title: 'Cấu hình mở rộng Bảo hiểm xã hội',
                      content: JSON.stringify(extraPayload),
                      isActive: true,
                    },
                  })
                }

                sendJson(200, { success: true, data: { ...saved, ...extraPayload } })
                return
              }
            }
          } catch (err: any) {
            console.error('Lỗi Vite middleware /api/hr/insurance:', err)
            sendJson(500, { error: err?.message || 'Lỗi xử lý bảo hiểm' })
            return
          }
        }

        if (url.startsWith('/api') || url.startsWith('/uploads')) {
          try {
            const expressApp = await getEmbeddedExpressApp()
            if (expressApp) {
              expressApp(req, res, next)
              return
            }
          } catch (err: any) {
            console.error('Lỗi Embedded Express middleware:', err)
          }
        }

        next()
      })

      server.httpServer?.on('close', cleanup)
      process.on('exit', cleanup)
      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      server.watcher.add(path.join(__dirname, 'server.js'))
      server.watcher.add(path.join(__dirname, 'server', 'financeAccountingRouter.js'))
      server.watcher.add(path.join(__dirname, 'services', 'prismaFinanceSyncService.js'))
      server.watcher.add(path.join(__dirname, 'services', 'journalSyncService.js'))
      server.watcher.on('change', (file) => {
        if (file.endsWith('server.js')) {
          console.log('\x1b[33m%s\x1b[0m', '⚡ [Vite Plugin] server.js thay đổi -> Nạp lại Embedded Backend...')
          embeddedExpressPromise = null
          getEmbeddedExpressApp()
        } else if (
          file.endsWith('financeAccountingRouter.js') ||
          file.endsWith('prismaFinanceSyncService.js') ||
          file.endsWith('journalSyncService.js')
        ) {
          console.log('\x1b[33m%s\x1b[0m', `⚡ [Vite Plugin] ${path.basename(file)} thay đổi -> Khởi động lại server để xóa ESM cache...`)
          server.restart()
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
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 5175,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
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
