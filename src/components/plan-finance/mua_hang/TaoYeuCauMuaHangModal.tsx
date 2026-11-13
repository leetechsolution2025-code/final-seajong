import React from "react";
import { useSession } from "next-auth/react";
import {
  UiChecks,
  Send,
  XLg,
  CheckCircleFill,
  ExclamationTriangleFill,
  PlusLg,
  Trash3,
} from "react-bootstrap-icons";
import { Button } from "../../common/Button";
import { Badge } from "../../common/Badge";
import { Input } from "../../common/Input";
import { DatePicker } from "../../common/DatePicker";
import { NumberInput } from "../../common/NumberInput";
import { SuggestionInput } from "../../common/SuggestionInput";
import {
  EmployeeSelect,
  fetchEmployeesFromDb,
  normalizeDepartmentKey,
  type EmployeeItem,
} from "../../common/EmployeeSelect";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ItemSuggestion {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  giaNhap: number;
}
interface ReqLine {
  id: string;
  item: ItemSuggestion | null;
  itemSearch: string;
  suggestions: ItemSuggestion[];
  showSugg: boolean;
  soLuong: number;
  donGiaDK: number;
  ghiChu: string;
}
interface InitialLine {
  tenHang: string;
  soLuong: number;
  donVi?: string;
  ghiChu?: string;
}
interface TaoYeuCauModalProps {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: {
    lyDo?: string;
    nguoiYeuCau?: string;
    lines?: InitialLine[];
  };
}

// ── Department Code -> Full Name Map ──────────────────────────────────────────
const DEPARTMENT_NAME_MAP: Record<string, string> = {
  board: "Ban Giám đốc",
  bom: "Ban Giám đốc",
  bgd: "Ban Giám đốc",
  director: "Ban Giám đốc",
  sales: "Phòng Kinh doanh",
  kd: "Phòng Kinh doanh",
  business: "Phòng Kinh doanh",
  marketing: "Phòng Marketing",
  mkt: "Phòng Marketing",
  procurement: "Phòng Mua hàng & Cung ứng",
  purchase: "Phòng Mua hàng & Cung ứng",
  purchasing: "Phòng Mua hàng & Cung ứng",
  mh: "Phòng Mua hàng & Cung ứng",
  accounting: "Phòng Tài chính - Kế toán",
  finance: "Phòng Tài chính - Kế toán",
  tckt: "Phòng Tài chính - Kế toán",
  kt: "Phòng Tài chính - Kế toán",
  hr: "Phòng Hành chính - Nhân sự",
  hcns: "Phòng Hành chính - Nhân sự",
  logistics: "Phòng Kho vận & Giao nhận",
  warehouse: "Phòng Kho vận & Giao nhận",
  kho: "Phòng Kho vận & Giao nhận",
  production: "Xưởng Sản xuất & Lắp ráp",
  sx: "Xưởng Sản xuất & Lắp ráp",
  qa: "Phòng Đảm bảo chất lượng (QA/QC)",
  qc: "Phòng Đảm bảo chất lượng (QA/QC)",
  warranty: "Phòng Bảo hành & Kỹ thuật",
  bh: "Phòng Bảo hành & Kỹ thuật",
  project: "Phòng Dự án",
  legal: "Phòng Pháp chế",
  it: "Phòng Công nghệ thông tin",
  general: "Khối Văn phòng",
  all: "Ban Giám đốc",
};

const DEFAULT_DEPARTMENT_SUGGESTIONS = [
  "Ban Giám đốc",
  "Phòng Kinh doanh",
  "Phòng Marketing",
  "Phòng Mua hàng & Cung ứng",
  "Phòng Tài chính - Kế toán",
  "Phòng Hành chính - Nhân sự",
  "Phòng Kho vận & Giao nhận",
  "Xưởng Sản xuất & Lắp ráp",
  "Phòng Đảm bảo chất lượng (QA/QC)",
  "Phòng Bảo hành & Kỹ thuật",
];

function resolveDepartmentFullName(
  raw?: string | null,
  empDeptName?: string | null,
  dynamicMap?: Record<string, string>
): string {
  if (empDeptName && empDeptName.trim()) {
    const key = empDeptName.trim().toLowerCase();
    if (dynamicMap?.[key]) return dynamicMap[key];
    if (DEPARTMENT_NAME_MAP[key]) return DEPARTMENT_NAME_MAP[key];
    return empDeptName.trim();
  }
  if (!raw || !raw.trim()) return "";
  const key = raw.trim().toLowerCase();
  if (dynamicMap?.[key]) return dynamicMap[key];
  return DEPARTMENT_NAME_MAP[key] || raw.trim();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): ReqLine => ({
  id: uid(),
  item: null,
  itemSearch: "",
  suggestions: [],
  showSugg: false,
  soLuong: 1,
  donGiaDK: 0,
  ghiChu: "",
});

// ── Component ─────────────────────────────────────────────────────────────────
export function TaoYeuCauMuaHangModal({
  onClose,
  onSaved,
  initialData,
}: TaoYeuCauModalProps) {
  const [soYeuCau, setSoYeuCau] = React.useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `YCMH-${yyyy}${mm}${dd}-001`;
  });

  const [deptMap, setDeptMap] = React.useState<Record<string, string>>(DEPARTMENT_NAME_MAP);
  const [deptSuggestions, setDeptSuggestions] = React.useState<string[]>(DEFAULT_DEPARTMENT_SUGGESTIONS);

  React.useEffect(() => {
    fetch("/api/departments")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          const nextMap: Record<string, string> = { ...DEPARTMENT_NAME_MAP };
          const names = new Set<string>(DEFAULT_DEPARTMENT_SUGGESTIONS);
          res.data.forEach((d: any) => {
            if (d?.code && d?.nameVi) {
              nextMap[String(d.code).trim().toLowerCase()] = String(d.nameVi).trim();
              names.add(String(d.nameVi).trim());
            }
          });
          setDeptMap(nextMap);
          setDeptSuggestions(Array.from(names));
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    fetch("/api/plan-finance/purchase-requests?page=1&limit=200")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.items) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const todayItems = data.items.filter((item: any) => {
            const itemDate = new Date(item.ngayTao);
            return itemDate >= todayStart;
          });

          const nextSTT = String(todayItems.length + 1).padStart(3, "0");
          setSoYeuCau(`YCMH-${dateStr}-${nextSTT}`);
        }
      })
      .catch(() => {});
  }, []);

  const [ngayTao] = React.useState(() => new Date().toISOString().slice(0, 10));
  const { data: session } = useSession();
  const [donVi, setDonVi] = React.useState("");
  const [nguoiYeuCau, setNguoiYeuCau] = React.useState(initialData?.nguoiYeuCau ?? "");
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [ngayCanCo, setNgayCanCo] = React.useState("");
  const [lyDo, setLyDo] = React.useState(initialData?.lyDo ?? "");
  const [lines, setLines] = React.useState<ReqLine[]>(() => {
    if (initialData?.lines?.length) {
      return initialData.lines.map((il) => ({
        id: uid(),
        item: null,
        itemSearch: il.tenHang,
        suggestions: [],
        showSugg: false,
        soLuong: il.soLuong,
        donGiaDK: 0,
        ghiChu: il.ghiChu ?? "",
      }));
    }
    return [emptyLine()];
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchEmployeesFromDb().then((list) => {
      if (!cancelled) setEmployees(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDonViChange = React.useCallback(
    (rawVal: string) => {
      const mapped = deptMap[rawVal.trim().toLowerCase()] || rawVal;
      setDonVi(mapped);
      if (error) setError("");

      const targetKey = normalizeDepartmentKey(mapped);
      if (targetKey && employees.length > 0) {
        const deptEmps = employees.filter(
          (e) => normalizeDepartmentKey(e.departmentCode || e.department) === targetKey
        );
        const stillInDept = deptEmps.some(
          (e) => e.name.trim().toLowerCase() === nguoiYeuCau.trim().toLowerCase()
        );
        if (!stillInDept) {
          setNguoiYeuCau(deptEmps[0]?.name ?? "");
        }
      } else if (!rawVal.trim()) {
        setNguoiYeuCau("");
      }
    },
    [deptMap, employees, error, nguoiYeuCau]
  );

  // Default values from session (resolve full department name instead of code)
  const initializedFromSessionRef = React.useRef(false);
  React.useEffect(() => {
    if (session?.user && !initializedFromSessionRef.current) {
      initializedFromSessionRef.current = true;
      const u = session.user as any;
      const resolvedDept = resolveDepartmentFullName(
        u.departmentName || u.employee?.departmentCode || u.departmentCode || "",
        u.employee?.departmentName,
        deptMap
      );
      if (!donVi || deptMap[donVi.trim().toLowerCase()]) {
        setDonVi(resolvedDept);
      }
      if (!nguoiYeuCau) {
        setNguoiYeuCau(u.employee?.fullName || u.name || "");
      }
    }
  }, [session, donVi, nguoiYeuCau, deptMap]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onItemSearch = (lineId: string, q: string) => {
    setLines((ls) =>
      ls.map((l) => (l.id === lineId ? { ...l, itemSearch: q, showSugg: q.length > 0 } : l))
    );
    clearTimeout(timers.current[lineId]);
    if (!q.trim()) return;
    timers.current[lineId] = setTimeout(async () => {
      try {
        const data: ItemSuggestion[] = await fetch(
          `/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8`
        ).then((r) => r.json());
        setLines((ls) =>
          ls.map((l) =>
            l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l
          )
        );
      } catch {
        /* ignore */
      }
    }, 250);
  };
  const selectItem = (lineId: string, item: ItemSuggestion) =>
    setLines((ls) =>
      ls.map((l) =>
        l.id === lineId
          ? {
              ...l,
              item,
              itemSearch: item.tenHang,
              suggestions: [],
              showSugg: false,
              donGiaDK: item.giaNhap,
            }
          : l
      )
    );
  const updateLine = <K extends keyof ReqLine>(lineId: string, key: K, val: ReqLine[K]) =>
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, [key]: val } : l)));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (id: string) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));

  const validLines = lines.filter((l) => (l.item || l.itemSearch.trim()) && l.soLuong > 0);
  const tongDuKien = validLines.reduce((s, l) => s + l.soLuong * l.donGiaDK, 0);

  const handleSave = async () => {
    setError("");
    if (!ngayCanCo.trim()) {
      setError("Vui lòng chọn ngày cần có hàng");
      return;
    }
    if (!donVi.trim()) {
      setError("Vui lòng nhập đơn vị / phòng ban yêu cầu");
      return;
    }
    if (!nguoiYeuCau.trim()) {
      setError("Vui lòng nhập người yêu cầu");
      return;
    }
    if (!lyDo.trim()) {
      setError("Vui lòng nhập lý do yêu cầu");
      return;
    }
    if (!validLines.length) {
      setError("Cần ít nhất 1 mặt hàng hợp lệ");
      return;
    }

    const normalizedDonVi = resolveDepartmentFullName(donVi, null, deptMap) || donVi.trim();

    setSaving(true);
    try {
      const res = await fetch("/api/plan-finance/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donVi: normalizedDonVi,
          nguoiYeuCau: nguoiYeuCau.trim(),
          ngayCanCo,
          lyDo: lyDo.trim(),
          lines: validLines.map((l, i) => ({
            inventoryItemId: l.item?.id ?? null,
            tenHang: l.item?.tenHang ?? l.itemSearch,
            donVi: l.item?.donVi ?? null,
            soLuong: l.soLuong,
            donGiaDK: l.donGiaDK,
            ghiChu: l.ghiChu || null,
            sortOrder: i,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Lỗi khi tạo yêu cầu, thử lại sau");
        return;
      }

      setSuccess(true);
      onSaved?.();
    } catch {
      setError("Không kết nối được server, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5100,
        display: "flex",
        flexDirection: "column",
        background: "#f1f5f9",
        overflow: "hidden",
        padding: 8,
        gap: 8,
      }}
    >
      {/* ══ TOPBAR CHUẨN ENTERPRISE ══ */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 18px",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#1d4ed8",
            }}
          >
            <UiChecks size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                Tạo yêu cầu mua hàng
              </h2>
              <Badge variant="info">{soYeuCau}</Badge>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Khai báo danh mục vật tư, hàng hoá cần mua sắm và thời hạn yêu cầu cung ứng
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {success ? (
            <Badge variant="success">
              <CheckCircleFill size={12} style={{ marginRight: 5 }} />
              Đã tạo thành công!
            </Badge>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send size={13} />}
              isLoading={saving}
              disabled={saving}
              onClick={handleSave}
            >
              Gửi yêu cầu
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
          >
            <XLg size={16} />
          </Button>
        </div>
      </div>

      {/* ══ CONTENT (Left + Right) ══ */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 8, overflow: "hidden" }}>
        {/* ── LEFT PANEL: Thông tin chung ────────────────────────────────── */}
        <div
          style={{
            width: 340,
            flexShrink: 0,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          {/* Tiêu đề panel */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              flexShrink: 0,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a" }}>
              Thông tin chung
            </p>
          </div>

          {/* Form fields */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
            }}
          >
            {/* Số phiếu — read only */}
            <Input
              label="Số yêu cầu"
              value={soYeuCau}
              readOnly
              style={{
                background: "#f8fafc",
                color: "#475569",
                fontFamily: "monospace",
                fontSize: "0.8125rem",
                fontWeight: 600,
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                label="Ngày tạo"
                value={new Date(ngayTao).toLocaleDateString("vi-VN")}
                readOnly
                style={{ background: "#f8fafc", color: "#475569" }}
              />
              <DatePicker
                label="Ngày cần có"
                required
                min={ngayTao}
                value={ngayCanCo}
                onChange={(val) => {
                  setNgayCanCo(val);
                  if (error) setError("");
                }}
                placeholder="dd/mm/yyyy"
              />
            </div>

            {/* Đơn vị / phòng ban (hiển thị tên đầy đủ) */}
            <SuggestionInput
              label="Đơn vị / phòng ban"
              required
              value={donVi}
              onChange={(val) => handleDonViChange(val)}
              onSelectSuggestion={(item) => handleDonViChange(item.value)}
              suggestions={deptSuggestions}
              placeholder="Chọn hoặc nhập tên phòng ban"
            />

            {/* Người yêu cầu (lọc theo đơn vị / phòng ban đã chọn) */}
            <EmployeeSelect
              label="Người yêu cầu"
              required
              multiple={false}
              departmentFilter={donVi}
              value={nguoiYeuCau}
              onChange={(val) => {
                setNguoiYeuCau(val);
                if (error) setError("");
              }}
              placeholder="Chọn nhân viên thuộc phòng ban..."
            />

            {/* Lý do yêu cầu — tự động chiếm hết chiều cao khả dụng */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 110,
              }}
            >
              <label
                className="form-label"
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Lý do yêu cầu <span style={{ color: "var(--color-danger, #ef4444)" }}>*</span>
              </label>
              <textarea
                value={lyDo}
                onChange={(e) => {
                  setLyDo(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Mô tả lý do cần mua hàng..."
                className="form-input"
                style={{
                  flex: 1,
                  width: "100%",
                  height: "100%",
                  minHeight: 90,
                  resize: "none",
                  padding: "10px 12px",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Tổng dự kiến — chuẩn màu xanh dương Enterprise */}
          {tongDuKien > 0 && (
            <div
              style={{
                padding: "12px 18px",
                borderTop: "1px solid #dbeafe",
                background: "#eff6ff",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                  Tổng giá trị dự kiến
                </span>
                <Badge variant="brand">{validLines.length} mặt hàng</Badge>
              </div>
              <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#1d4ed8" }}>
                {tongDuKien.toLocaleString("vi-VN")} ₫
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                margin: "10px 16px 14px",
                padding: "9px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexShrink: 0,
              }}
            >
              <ExclamationTriangleFill size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Danh sách mặt hàng ───────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              flexShrink: 0,
              padding: "12px 20px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a" }}>
                Danh sách mặt hàng yêu cầu
              </p>
              <Badge variant="neutral">{lines.length} dòng</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PlusLg size={12} />}
              onClick={addLine}
            >
              Thêm mặt hàng
            </Button>
          </div>

          {/* Table header */}
          <div
            style={{
              flexShrink: 0,
              display: "grid",
              gridTemplateColumns: "36px 1fr 80px 110px 170px 140px 36px",
              gap: 8,
              padding: "9px 20px",
              background: "#f1f5f9",
              borderBottom: "1px solid #e2e8f0",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <div style={{ textAlign: "center" }}>#</div>
            <div>Mặt hàng</div>
            <div style={{ textAlign: "center" }}>ĐVT</div>
            <div style={{ textAlign: "center" }}>SL yêu cầu</div>
            <div style={{ textAlign: "right" }}>Đơn giá (₫)</div>
            <div style={{ textAlign: "right" }}>Thành tiền (₫)</div>
            <div />
          </div>

          {/* Lines — scrollable */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {lines.map((line, idx) => (
              <LineRow
                key={line.id}
                line={line}
                idx={idx}
                onItemSearch={(q) => onItemSearch(line.id, q)}
                onSelectItem={(item) => selectItem(line.id, item)}
                onUpdate={(k, v) => updateLine(line.id, k, v)}
                onRemove={() => removeLine(line.id)}
                canRemove={lines.length > 1}
              />
            ))}
          </div>

          {/* Add line footer */}
          <div
            style={{
              flexShrink: 0,
              padding: "10px 20px",
              borderTop: "1px dashed #cbd5e1",
              background: "#f8fafc",
            }}
          >
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PlusLg size={12} />}
              onClick={addLine}
            >
              Thêm mặt hàng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────
function LineRow({
  line,
  idx,
  onItemSearch,
  onSelectItem,
  onUpdate,
  onRemove,
  canRemove,
}: {
  line: ReqLine;
  idx: number;
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate: <K extends keyof ReqLine>(key: K, val: ReqLine[K]) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const thanhTien = line.soLuong * (line.donGiaDK || 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 80px 110px 170px 140px 36px",
        gap: 8,
        padding: "8px 20px",
        borderBottom: "1px solid #f1f5f9",
        alignItems: "center",
        background: idx % 2 !== 0 ? "#f8fafc" : "#ffffff",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: "0.78rem",
          color: "#64748b",
          fontWeight: 600,
        }}
      >
        {idx + 1}
      </div>

      {/* Item search */}
      <div style={{ position: "relative" }}>
        <input
          value={line.itemSearch}
          onChange={(e) => onItemSearch(e.target.value)}
          onFocus={() => {
            if (line.itemSearch) onUpdate("showSugg", true);
          }}
          placeholder="Tìm hoặc nhập tên hàng hoá..."
          className="form-input"
          style={{
            width: "100%",
            paddingRight: line.item ? 30 : 10,
            borderColor: line.item ? "#93c5fd" : undefined,
            background: line.item ? "#eff6ff" : "#ffffff",
            fontSize: "0.8125rem",
          }}
        />
        {line.item && (
          <CheckCircleFill
            size={13}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#2563eb",
              pointerEvents: "none",
            }}
          />
        )}
        {line.showSugg && line.suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 200,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              boxShadow: "0 10px 25px -5px rgba(15,23,42,0.12)",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {line.suggestions.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectItem(s)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#0f172a" }}>
                  {s.tenHang}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {s.code ?? "—"} · {s.donVi ?? "—"} ·{" "}
                  {(s.giaNhap || 0).toLocaleString("vi-VN")} ₫
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: "#475569",
          fontWeight: 600,
        }}
      >
        {line.item?.donVi ?? "—"}
      </div>

      <NumberInput
        min={1}
        hideZero={false}
        value={line.soLuong}
        onValueChange={(val) => onUpdate("soLuong", Math.max(1, val || 1))}
        style={{ textAlign: "center" }}
      />

      <NumberInput
        min={0}
        value={line.donGiaDK}
        suffix="₫"
        placeholder="0"
        onValueChange={(val) => onUpdate("donGiaDK", Math.max(0, val || 0))}
        style={{ textAlign: "right" }}
      />

      <div
        style={{
          textAlign: "right",
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: thanhTien > 0 ? "#0f172a" : "#94a3b8",
        }}
      >
        {thanhTien > 0 ? `${thanhTien.toLocaleString("vi-VN")} ₫` : "—"}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        title="Xóa dòng"
        style={{
          width: 28,
          height: 28,
          color: canRemove ? "#ef4444" : "#cbd5e1",
        }}
      >
        <Trash3 size={13} />
      </Button>
    </div>
  );
}
