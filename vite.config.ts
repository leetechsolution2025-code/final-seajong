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

            if (req.method === 'GET' && parsedUrl.pathname === '/api/user-tasks') {
              const allTasks: any[] = []

              // Chỉ lấy các hồ sơ đại lý đã ký hợp đồng trong quy trình Phát triển đại lý (MarketingLead)
              const leads = await vitePrisma.marketingLead.findMany({ orderBy: { updatedAt: 'desc' } })
              for (const lead of leads) {
                let fv: Record<string, any> = {}
                try {
                  fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                } catch {
                  fv = {}
                }
                const contractCode = String(fv.contractNo || fv.hdCode || '').trim()
                if (!contractCode) continue
                if (fv.constructionTasksDeleted) continue

                const customerName = fv.companyName || lead.fullName || 'Đại lý Seajong'
                const customerAddress = fv.address || fv.area || 'Chưa cập nhật địa chỉ'
                const executor = fv.executor || 'Nguyên Văn Thành'

                // Kiểm tra đã có Phụ lục hợp đồng chưa
                const hasAppendix = Boolean(
                  (fv.plNo && String(fv.plNo).trim() !== '') ||
                    (fv.plPdf && String(fv.plPdf).trim() !== '')
                )

                if (!hasAppendix) {
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
                        contractCode,
                        project: customerName,
                        customerName,
                        customerAddress,
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

                allTasks.push(...mergedTasks)
              }

              const department = parsedUrl.searchParams.get('department') || ''
              const assignee = parsedUrl.searchParams.get('assignee') || ''
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
              const newTask = {
                id: `utask-${Date.now()}`,
                title: body.title || 'Công việc mới',
                project: body.project || body.customerName || 'Dự án thi công trưng bày',
                contractCode: body.contractCode || 'HD-SEAJONG',
                customerName: body.customerName || body.project || 'Đại lý Seajong',
                customerAddress: body.customerAddress || 'Chưa cập nhật địa chỉ',
                assignee: body.assignee || 'Chưa phân công',
                assigner: body.assigner || 'Ban Giám đốc',
                department: body.department || 'Phòng Kinh doanh',
                priority: body.priority || 'Trung bình',
                startDate: body.startDate || '2026-10-29',
                endDate: body.endDate || '2026-10-31',
                progress: Number(body.progress) || 0,
                status: body.status || 'not_started',
                statusLabel: body.statusLabel || 'Chưa thực hiện',
                description: body.description || '',
                category: 'production',
              }

              const targetCode = String(newTask.contractCode || '').trim().toUpperCase()
              const leads = await vitePrisma.marketingLead.findMany({ orderBy: { updatedAt: 'desc' } })
              let saved = false
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
                  saved = true
                  break
                }
              }

              if (!saved && leads.length > 0) {
                const lead = leads[0]
                let fv: Record<string, any> = {}
                try {
                  fv = lead.formValues ? JSON.parse(lead.formValues) : {}
                } catch {
                  fv = {}
                }
                const list = Array.isArray(fv.constructionTasks) ? fv.constructionTasks : []
                list.push(newTask)
                fv.constructionTasks = list
                await vitePrisma.marketingLead.update({
                  where: { id: lead.id },
                  data: { formValues: JSON.stringify(fv) },
                })
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
              res.end(JSON.stringify({ id: taskId, ...body }))
              return
            }

            if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/api/user-tasks/contract/')) {
              const rawCode = decodeURIComponent(parsedUrl.pathname.replace('/api/user-tasks/contract/', ''))
                .trim()
                .toUpperCase()
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
