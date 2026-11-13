import React from "react";
import { Floppy, FileEarmarkPdf, Printer, SendCheck } from "react-bootstrap-icons";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { exportElementToPDF } from "@/lib/utils/pdf";
import { Button } from "../../common/Button";
import { Badge } from "../../common/Badge";
import { Input } from "../../common/Input";
import { Select } from "../../common/Select";
import { DatePicker } from "../../common/DatePicker";
import { Toggle } from "../../common/Toggle";

// ── Types ───────────────────────────────────────────────────────────────────────
interface ReqItem {
  id: string;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  inventoryItemId: string | null;
  inventoryItem: { code: string | null; tenHang: string; donVi: string | null; categoryId: string | null; thongSoKyThuat: string | null; imageUrl: string | null } | null;
}

interface Assignment {
  itemId: string;
  supplierId: string | null;
  donGia: number;
  ngayGiao: string;
  skip: boolean;
}

interface Supplier {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  contactName: string | null;
  xungHo: string | null;
  email: string | null;
}

interface CompanyInfo {
  name: string;
  shortName?: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  logoUrl: string | null;
  legalRep: string | null;
  slogan?: string | null;
}

interface Props {
  reqId?: string;
  reqCode?: string | null;
  supplierId: string;
  supplierName: string;
  assignments: Assignment[];
  items: ReqItem[];
  onClose: () => void;
  onCreated: (orders: { code: string | null; supplierName: string; soMatHang: number }[]) => void;
  isEdit?: boolean;
  editOrderId?: string;
  editOrderCode?: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function fmtVnd(n: number) { return n.toLocaleString("vi-VN"); }
function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function soThanhChu(n: number): string {
  if (n === 0) return "Không đồng";
  const CS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  function doc3(num: number, leading: boolean): string {
    if (num === 0) return "";
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    let s = "";
    if (h > 0) { s = CS[h] + " trăm"; }
    else if (!leading) { if (t === 0) return "lẻ " + CS[u]; s = "không trăm"; }
    if (t === 0) { if (u > 0) s += (s ? " lẻ " : "") + CS[u]; }
    else if (t === 1) { s += (s ? " " : "") + "mười"; if (u === 5) s += " lăm"; else if (u > 0) s += " " + CS[u]; }
    else { s += (s ? " " : "") + CS[t] + " mươi"; if (u === 1) s += " mốt"; else if (u === 5) s += " lăm"; else if (u > 0) s += " " + CS[u]; }
    return s;
  }
  const scales = [{ v: 1_000_000_000, label: "tỷ" }, { v: 1_000_000, label: "triệu" }, { v: 1_000, label: "nghìn" }, { v: 1, label: "" }];
  let result = ""; let rem = Math.round(n); let first = true;
  for (const { v, label } of scales) {
    const q = Math.floor(rem / v); rem %= v; if (q === 0) continue;
    const part = doc3(q, first) + (label ? " " + label : "");
    result += (result ? " " : "") + part; first = false;
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

function soThanhChuZh(n: number): string {
  if (n === 0) return "零元整";
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']];
  const head = n < 0 ? '欠' : '';
  n = Math.abs(n);
  let s = '';
  let intPart = Math.floor(n);
  for (let i = 0; i < unit[0].length && intPart > 0; i++) {
    let p = '';
    for (let j = 0; j < unit[1].length && intPart > 0; j++) {
      p = digit[intPart % 10] + unit[1][j] + p;
      intPart = Math.floor(intPart / 10);
    }
    s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
  }
  return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整') + "整";
}

const zhDictionary: Record<string, string> = {
  "BỒN CẦU LIỀN KHỐI": "连体座便器",
  "BỒN CẦU THÔNG MINH": "智能马桶",
  "BỒN CẦU": "座便器",
  "SEN CÂY": "淋浴花洒套装",
  "SEN TẮM": "淋浴花洒",
  "VÒI SEN": "淋浴花洒",
  "BÁT SEN": "花洒喷头",
  "VÒI LAVABO": "面盆龙头",
  "VÒI RỬA MẶT": "面盆龙头",
  "VÒI RỬA BÁT": "厨房水槽龙头",
  "VÒI BẾP": "厨房龙头",
  "CHẬU RỬA MẶT": "洗脸盆",
  "CHẬU LAVABO": "洗脸盆",
  "CHẬU RỬA BÁT": "厨房水槽",
  "BỒN TẮM": "浴缸",
  "BỂ TIỂU": "小便器",
  "BỒN TIỂU": "小便器",
  "PHỤ KIỆN PHÒNG TẮM": "卫浴配件",
  "GƯƠNG TẮM": "浴室镜",
  "GƯƠNG LED": "LED智能镜",
  "GƯƠNG": "镜子",
  "VÒI XỊT": "妇洗喷枪",
  "BỘ XỊT": "喷枪套装",
  "LÕI ĐỒNG": "铜阀芯",
  "DÂY CẤP": "进水软管",
  "VAN CHỮ T": "T型角阀",
  "VAN GÓC": "角阀",
  "VAN": "阀门",
  "THÂN VAN": "阀体",
  "NẮP BỒN CẦU": "马桶盖板",
  "XI PHÔNG": "下水器 (虹吸管)",
  "THOÁT SÀN": "地漏",
  "CHÂN SEN": "花洒支架",
  "CỦ SEN": "淋浴混水阀",
  "TAY SEN": "手持花洒",
  "CÁI": "个",
  "BỘ": "套",
  "CHIẾC": "件",
  "HỘP": "盒",
  "THÙNG": "箱",
  "Xe tải": "卡车",
  "Xe máy": "摩托车",
  "Xe container": "集装箱车",
  "Xe khách": "客车",
  "Giao hàng tận nơi": "送货上门",
  "Nhận tại kho NCC": "供应商仓库自提",
  "Qua đơn vị vận chuyển": "通过物流公司",
  "Chuyển khoản": "银行转账",
  "Tiền mặt": "现金",
  "Công nợ": "挂账",
  "Khác": "其他",
  "Vui lòng xác nhận thông tin": "请确认信息",
  "Vui lòng xác nhận thông tin đơn hàng": "请确认订单信息",
  "Giao hàng đúng hẹn": "按时交货",
  "Đóng gói cẩn thận": "小心包装",
  "Hàng dễ vỡ, xin cẩn thận": "易碎品，请小心"
};

function translateProduct(name: string, lang: string): string {
  if (lang !== "zh" || !name) return name;
  let translated = name;
  // Thay thế không phân biệt hoa thường theo từ điển
  const sortedKeys = Object.keys(zhDictionary).sort((a, b) => b.length - a.length); // Thay từ dài trước
  for (const k of sortedKeys) {
    const regex = new RegExp(k, "gi");
    if (regex.test(translated)) {
      translated = translated.replace(regex, zhDictionary[k]);
    }
  }
  return translated;
}

const today = new Date().toISOString().slice(0, 10);
const inp = printStyles.sidebarInput;
const secHead = printStyles.secHead;
const bodyCell = printStyles.bodyCell;

const SField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
    {children}
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────────
export default function XemTruocDonMuaHangModal({
  reqId, reqCode, supplierId, supplierName, assignments, items, onClose, onCreated,
  isEdit = false, editOrderId, editOrderCode,
}: Props) {
  const [company, setCompany] = React.useState<CompanyInfo | null>(null);
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submittingApproval, setSubmittingApproval] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [lang, setLang] = React.useState<"vi" | "zh">("vi");

  const [ngayDat, setNgayDat] = React.useState(today);
  const [isRMB, setIsRMB] = React.useState(true);
  const [tyGiaStr, setTyGiaStr] = React.useState("3.500");
  const tyGia = parseFloat(tyGiaStr.replace(/\./g, "").replace(/,/g, ".")) || 1;
  const [tyGiaUpdatedAt, setTyGiaUpdatedAt] = React.useState<string | null>(null);
  const [showImage, setShowImage] = React.useState(true);
  const [hinhThucTT, setHinhThucTT] = React.useState("Chuyển khoản");
  const [hinhThucGH, setHinhThucGH] = React.useState("Giao hàng tận nơi");
  const [phuongTien, setPhuongTien] = React.useState("Xe tải");
  const [thueVAT, setThueVAT] = React.useState(10);
  const [datCocPct, setDatCocPct] = React.useState(0);
  const [diaDiemGiaoHang, setDiaDiemGiaoHang] = React.useState("");
  const [nguoiNhan, setNguoiNhan] = React.useState("");
  const [sdtNhan, setSdtNhan] = React.useState("");
  const [ghiChu, setGhiChu] = React.useState("");
  const [translatedGhiChu, setTranslatedGhiChu] = React.useState("");
  const addressRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = addressRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  }, [diaDiemGiaoHang]);

  React.useEffect(() => {
    if (lang === "zh" && ghiChu.trim()) {
      const timer = setTimeout(() => {
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(ghiChu)}&langpair=vi|zh-CN`)
          .then(r => r.json())
          .then(d => {
            if (d?.responseData?.translatedText) {
              setTranslatedGhiChu(d.responseData.translatedText);
            }
          })
          .catch(() => {});
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setTranslatedGhiChu("");
    }
  }, [ghiChu, lang]);

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => {
      setCompany(d);
      if (d?.address) setDiaDiemGiaoHang(d.address);
      if (d?.legalRep) setNguoiNhan(d.legalRep);
      if (d?.phone) setSdtNhan(d.phone);
    }).catch(() => { });
    fetch(`/api/plan-finance/suppliers/${supplierId}`)
      .then(r => r.json()).then(d => setSupplier(d.supplier ?? d)).catch(() => { });
      
    // Lấy tỷ giá thực tế
    fetch("https://open.er-api.com/v6/latest/CNY")
      .then(r => r.json())
      .then(d => {
        if (d?.rates?.VND) {
          const rate = Math.round(d.rates.VND);
          setTyGiaStr(rate.toLocaleString("vi-VN"));
          const date = new Date(d.time_last_update_unix * 1000);
          setTyGiaUpdatedAt(`Cập nhật: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
        }
      }).catch(() => {});
  }, [supplierId]);

  const orderItems = React.useMemo(() => {
    const rawList = assignments.map(a => ({ ...a, item: items.find(i => i.id === a.itemId) })).filter(x => x.item);

    // Group by tenHang to aggregate quantities for items with same name
    const groups: Record<string, {
      itemId: string;
      supplierId: string | null;
      donGia: number;
      ngayGiao: string;
      skip: boolean;
      item: {
        id: string;
        tenHang: string;
        donVi: string | null;
        soLuong: number;
        inventoryItemId: string | null;
        inventoryItem: any;
      };
    }> = {};

    rawList.forEach(x => {
      const key = x.item!.tenHang;
      if (!groups[key]) {
        groups[key] = {
          itemId: x.itemId,
          supplierId: x.supplierId,
          donGia: x.donGia,
          ngayGiao: x.ngayGiao,
          skip: x.skip,
          item: {
            id: x.item!.id,
            tenHang: x.item!.tenHang,
            donVi: x.item!.donVi,
            soLuong: 0,
            inventoryItemId: x.item!.inventoryItemId,
            inventoryItem: x.item!.inventoryItem
          }
        };
      }
      groups[key].item.soLuong += x.item!.soLuong;
    });

    return Object.values(groups);
  }, [assignments, items]);
  const tongTienHang = orderItems.reduce((s, x) => s + x.item!.soLuong * x.donGia, 0);
  const tienThue = Math.round(tongTienHang * thueVAT / 100);
  const tongCong = tongTienHang + tienThue;
  const tienDatCoc = Math.round((tongCong * datCocPct) / 100);

  const poSuffix = React.useMemo(() => {
    const ts4 = Date.now().toString().slice(-4);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand4 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return ts4 + "-" + rand4;
  }, []);

  const poDraft = isEdit ? (editOrderCode ?? editOrderId ?? "") : `PO-${ngayDat.replace(/-/g, "")}-${poSuffix}`;
  const supName = supplier?.name ?? supplierName;
  const companyName = company?.name ?? "—";
  const ngayStr = fmtDate(ngayDat);

  const callCreateOrders = async () => {
    const res = await fetch(`/api/plan-finance/purchase-requests/${reqId}/create-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, meta: { ngayDat, hinhThucTT, hinhThucGH, phuongTien, thueVAT, datCocPct, tienDatCoc } }),
    });
    const text = await res.text();
    let data: { createdOrders?: unknown[]; error?: string } = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
    return { res, data, text };
  };

  const handleSave = async () => {
    if (saving || submitting) return;
    setSaving(true);
    try {
      const { res, data, text } = await callCreateOrders();
      if (res.ok) {
        setSaveMsg("✓ Đã lưu đơn đặt hàng");
        setTimeout(() => setSaveMsg(null), 3000);
        const orders = (data.createdOrders ?? []) as { code: string | null; supplierName: string; soMatHang: number }[];
        onCreated(orders);
      } else {
        const msg = data.error ?? `Lỗi server (HTTP ${res.status})`;
        alert(msg); console.error("[save-order]", msg, text);
      }
    } catch (err) {
      alert("Lỗi kết nối. Vui lòng thử lại."); console.error(err);
    } finally { setSaving(false); }
  };

  const handlePrint = async () => {
    if (submitting || saving) return;
    setSubmitting(true);
    try {
      const { res, data, text } = await callCreateOrders();
      if (res.ok) {
        const orders = (data.createdOrders ?? []) as { code: string | null; supplierName: string; soMatHang: number }[];
        printDocumentById("po-document", "portrait", `Đơn đặt hàng - ${poDraft}`, true, "15mm 10mm");
        onCreated(orders);
      } else {
        const msg = data.error ?? `Lỗi server (HTTP ${res.status})`;
        alert(msg); console.error("[create-orders] error:", msg, text);
      }
    } catch (err) {
      alert("Lỗi kết nối."); console.error(err);
    } finally { setSubmitting(false); }
  };

  // ── Translate Dictionary ──────────────────────────────────────────────────
  const T = {
    vi: {
      donDatHang: "ĐƠN ĐẶT HÀNG",
      notePO: "Số phiếu này phải xuất hiện trên tất cả các chứng từ giao nhận, hóa đơn và kiện hàng.",
      ngayDatHang: "NGÀY ĐẶT HÀNG",
      soDonHang: "SỐ ĐƠN HÀNG",
      nhaCungCap: "NHÀ CUNG CẤP",
      giaoHangDen: "GIAO HÀNG ĐẾN",
      nguoiLienHe: "Người liên hệ",
      sdt: "Số điện thoại",
      mst: "MST",
      diaChi: "Địa chỉ",
      email: "Email",
      phuongThucVC: "PHƯƠNG THỨC VẬN CHUYỂN",
      hinhThucGH: "HÌNH THỨC GIAO HÀNG",
      thanhToan: "THANH TOÁN",
      stt: "STT",
      tenHang: "TÊN HÀNG / MÔ TẢ",
      dvt: "ĐVT",
      soLuong: "SỐ LƯỢNG",
      donGia: "ĐƠN GIÁ",
      thanhTien: "THÀNH TIỀN",
      ngayGiao: "Ngày giao:",
      ghiChuQuanTrong: "GHI CHÚ QUAN TRỌNG:",
      notes: [
        "1. Vui lòng ghi xác nhận đơn hàng trong vòng 24 giờ sau khi nhận được PO này.",
        "2. Hàng hóa phải được giao đúng số lượng, quy cách và thời gian đã cam kết.",
        "3. Hóa đơn GTGT phải được xuất đúng theo thông tin công ty và gửi kèm khi giao hàng.",
        "4. Mọi thay đổi phải được thông báo và chấp thuận bằng văn bản trước khi giao hàng.",
      ],
      ghiChu: "Ghi chú:",
      congTienHang: "Cộng tiền hàng:",
      thueGtgt: "Thuế GTGT",
      tongCong: "TỔNG CỘNG:",
      yeuCauDatCoc: "Yêu cầu đặt cọc",
      bangChu: "Bằng chữ:",
      nguoiLapPhieu: "NGƯỜI LẬP PHIẾU",
      keToanTruong: "KẾ TOÁN TRƯỞNG",
      giamDoc: "GIÁM ĐỐC",
      kyGhiRoHoTen: "(Ký, ghi rõ họ tên)",
      kyGhiRoHoTenDongDau: "(Ký, ghi rõ họ tên và đóng dấu)",
    },
    zh: {
      donDatHang: "订购单",
      notePO: "此号码必须出现在所有交接文件、发票和包裹上。",
      ngayDatHang: "订购日期",
      soDonHang: "订单号",
      nhaCungCap: "供应商",
      giaoHangDen: "送货至",
      nguoiLienHe: "联系人",
      sdt: "电话号码",
      mst: "税号",
      diaChi: "地址",
      email: "电子邮件",
      phuongThucVC: "运输方式",
      hinhThucGH: "交货方式",
      thanhToan: "付款方式",
      stt: "序号",
      tenHang: "品名 / 描述",
      dvt: "单位",
      soLuong: "数量",
      donGia: "单价",
      thanhTien: "金额",
      ngayGiao: "交货日期:",
      ghiChuQuanTrong: "重要提示：",
      notes: [
        "1. 请在收到此PO后24小时内确认订单。",
        "2. 货物必须按承诺的数量、规格和时间交货。",
        "3. 增值税发票必须根据公司信息正确开具，并在交货时附上。",
        "4. 任何变更必须在交货前以书面形式通知并获得批准。"
      ],
      ghiChu: "备注:",
      congTienHang: "商品总计:",
      thueGtgt: "增值税",
      tongCong: "总计:",
      yeuCauDatCoc: "预付定金",
      bangChu: "大写:",
      nguoiLapPhieu: "制单人",
      keToanTruong: "首席会计师",
      giamDoc: "经理",
      kyGhiRoHoTen: "(签字并写明姓名)",
      kyGhiRoHoTenDongDau: "(签字、写明姓名并盖章)",
    }
  };
  const t = T[lang];

  const sidebar = (
    <>
      <SField label="Ngôn ngữ in (Print language)">
        <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input type="radio" name="lang" checked={lang === "vi"} onChange={() => setLang("vi")} /> Tiếng Việt
          </label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input type="radio" name="lang" checked={lang === "zh"} onChange={() => setLang("zh")} /> 中文
          </label>
        </div>
      </SField>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ flex: 1, paddingTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", height: 34, padding: "0 10px", background: "var(--background)", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <Toggle
              checked={isRMB}
              onChange={setIsRMB}
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Nhân dân tệ</span>}
            />
          </div>
        </div>
        <div style={{ width: 118 }}>
          <SField label="Tỷ giá">
            <Input
              type="text"
              suffix="₫"
              value={tyGiaStr}
              disabled={!isRMB}
              onChange={e => {
                let raw = e.target.value;
                let val = raw.replace(/[^0-9.,]/g, "");
                if (!val) {
                  setTyGiaStr("");
                  return;
                }
                const parts = val.split(',');
                if (parts.length > 1) {
                  val = parts[0] + ',' + parts.slice(1).join('');
                }
                const p = val.split(',');
                if (p[0]) {
                  const intPart = p[0].replace(/\./g, "");
                  p[0] = parseInt(intPart || '0', 10).toLocaleString("vi-VN");
                }
                setTyGiaStr(p.join(','));
              }}
              style={{ textAlign: "right", height: 34 }}
            />
          </SField>
          {tyGiaUpdatedAt && (
            <p style={{ margin: "4px 0 0", fontSize: 9, color: "var(--muted-foreground)", textAlign: "right", whiteSpace: "nowrap" }}>{tyGiaUpdatedAt}</p>
          )}
        </div>
      </div>

      <SField label="Ngày đặt hàng">
        <DatePicker value={ngayDat} onChange={setNgayDat} style={{ height: 34 }} />
      </SField>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SField label="Thanh toán">
            <Select value={hinhThucTT} onChange={e => setHinhThucTT(e.target.value)} style={{ height: 34 }}>
              {["Chuyển khoản", "Tiền mặt", "Công nợ", "Khác"].map(x => <option key={x}>{x}</option>)}
            </Select>
          </SField>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SField label="Giao hàng">
            <Select value={hinhThucGH} onChange={e => setHinhThucGH(e.target.value)} style={{ height: 34 }}>
              {["Giao hàng tận nơi", "Nhận tại kho NCC", "Qua đơn vị vận chuyển"].map(x => <option key={x}>{x}</option>)}
            </Select>
          </SField>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1.4, minWidth: 0 }}>
          <SField label="Phương tiện">
            <Select value={phuongTien} onChange={e => setPhuongTien(e.target.value)} style={{ height: 34 }}>
              {["Xe tải", "Xe máy", "Xe container", "Xe khách", "Khác"].map(x => <option key={x}>{x}</option>)}
            </Select>
          </SField>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SField label="VAT">
            <Input
              type="number"
              hideZero={false}
              suffix="%"
              min={0}
              max={100}
              value={thueVAT}
              onNumericChange={(num) => setThueVAT(Math.min(100, Math.max(0, num)))}
              style={{ textAlign: "right", height: 34 }}
            />
          </SField>
        </div>
      </div>

      <div>
        <SField label="Yêu cầu đặt cọc">
          <Input
            type="number"
            hideZero={false}
            suffix="%"
            min={0}
            max={100}
            value={datCocPct}
            onNumericChange={(num) => setDatCocPct(Math.min(100, Math.max(0, num)))}
            style={{ textAlign: "right", height: 34 }}
          />
        </SField>
        {datCocPct > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11, color: "#0369a1", fontWeight: 600 }}>
            <span>Giá trị đặt cọc ({datCocPct}%):</span>
            <span>
              {(isRMB ? tienDatCoc / tyGia : tienDatCoc).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {isRMB ? "¥" : "₫"}
            </span>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>Giao hàng đến</p>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={showImage} onChange={e => setShowImage(e.target.checked)} style={{ width: 13, height: 13, margin: 0 }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Hiện ảnh SP</span>
          </label>
        </div>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 10.5, color: "#64748b", fontWeight: 500 }}>Địa chỉ</p>
          <textarea
            ref={addressRef}
            value={diaDiemGiaoHang}
            onChange={e => setDiaDiemGiaoHang(e.target.value)}
            rows={1}
            placeholder="Nhập địa chỉ..."
            style={{ ...inp, resize: "none", overflow: "hidden", lineHeight: 1.45, minHeight: 44 }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 4px", fontSize: 10.5, color: "#64748b", fontWeight: 500 }}>Người nhận</p>
            <Input value={nguoiNhan} onChange={e => setNguoiNhan(e.target.value)} placeholder="Họ tên..." style={{ height: 34 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 4px", fontSize: 10.5, color: "#64748b", fontWeight: 500 }}>Số điện thoại</p>
            <Input value={sdtNhan} onChange={e => setSdtNhan(e.target.value)} placeholder="Số điện thoại..." style={{ height: 34 }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ghi chú thêm</p>
        <textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="Ghi chú, yêu cầu đặc biệt..." style={{ ...inp, flex: 1, resize: "none", lineHeight: 1.6 }} />
      </div>
    </>
  );

  // ── Document ──────────────────────────────────────────────────────────────
  const doc = (
    <div
      className="pdf-content-page"
      translate="no"
      style={{
        fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif",
        fontSize: 13,
        color: "#000",
        lineHeight: 1.45,
        width: "100%",
        minHeight: "1123px",
        background: "#ffffff",
        padding: "32px 38px",
        boxSizing: "border-box",
        boxShadow: "0 4px 24px rgba(15, 23, 42, 0.12)",
        borderRadius: 4,
      }}
    >
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "none", marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", border: "none" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {company?.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={company.logoUrl} alt="logo" style={{ width: 120, height: 65, objectFit: "contain", flexShrink: 0, marginRight: 0 }} />
                  : <div style={{ width: 120, height: 65, background: "#e2e8f0", borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8", marginRight: 0 }}>LOGO</div>
                }
                <div style={{ fontSize: 10.5 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 12.5, color: "#1e293b", lineHeight: 1.3, textTransform: "uppercase" }}>{companyName}</p>
                  {company?.address && <p style={{ margin: "0 0 2px" }}>{t.diaChi} {company.address}</p>}
                  <p style={{ margin: "0 0 2px" }}>
                    {t.sdt}: {company?.phone ?? "—"}
                    {company?.email && <span style={{ marginLeft: 10 }}>{t.email} {company.email}</span>}
                  </p>
                </div>
              </div>
            </td>
            <td style={{ verticalAlign: "top", width: 330, paddingLeft: 20, border: "none" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", border: "2px solid #003087" }}>
                <tbody>
                  <tr><td colSpan={2} className="pdf-brand-bg" style={{ background: "#003087", color: "#fff", textAlign: "center", padding: "8px 20px", fontWeight: 900, fontSize: 20, letterSpacing: "0.08em" }}>{t.donDatHang}</td></tr>
                  <tr><td colSpan={2} style={{ borderBottom: "1px solid #003087", borderTop: "1px solid #003087", padding: "8px 6px", textAlign: "center", fontSize: 8.2, fontStyle: "italic", color: "#003087", lineHeight: 1.3, whiteSpace: "nowrap" }}>{t.notePO}</td></tr>
                  <tr>
                    <td className="pdf-brand-light-bg" style={{ width: "45%", borderRight: "1px solid #003087", borderBottom: "1px solid #003087", padding: "6px 14px", fontWeight: 800, fontSize: 11, textAlign: "center", background: "rgba(0, 48, 135, 0.05)", color: "#003087" }}>{t.ngayDatHang}</td>
                    <td className="pdf-brand-light-bg" style={{ width: "55%", borderBottom: "1px solid #003087", padding: "6px 14px", fontWeight: 800, fontSize: 11, textAlign: "center", background: "rgba(0, 48, 135, 0.05)", color: "#003087" }}>{t.soDonHang}</td>
                  </tr>
                  <tr>
                    <td style={{ width: "45%", borderRight: "1px solid #003087", padding: "7px 14px", textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>{ngayStr}</td>
                    <td style={{ width: "55%", padding: "7px 14px", textAlign: "center", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{poDraft}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Supplier / Delivery */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, border: "1px solid #003087" }}>
        <thead><tr>
          <th style={{ ...secHead, border: "none", borderBottom: "1px solid #003087", borderRight: "1px solid #003087", width: "50%", textAlign: "center", background: "#003087", color: "#fff" }}>{t.nhaCungCap}</th>
          <th style={{ ...secHead, border: "none", borderBottom: "1px solid #003087", width: "50%", textAlign: "center", background: "#003087", color: "#fff" }}>{t.giaoHangDen}</th>
        </tr></thead>
        <tbody><tr>
          <td style={{ ...bodyCell, border: "none", borderRight: "1px solid #003087", verticalAlign: "top", padding: "10px 12px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase" }}>{supName}</p>
            {supplier?.address && <p style={{ margin: 0 }}>{supplier.address}</p>}
            {supplier?.taxCode && <p style={{ margin: 0 }}>{t.mst}: {supplier.taxCode}</p>}
            <p style={{ margin: 0 }}>{t.nguoiLienHe}: {supplier?.contactName ?? "---"}</p>
            <p style={{ margin: 0 }}>{t.sdt}: {supplier?.phone ?? "—"}</p>
          </td>
          <td style={{ ...bodyCell, border: "none", verticalAlign: "top", padding: "10px 12px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase" }}>{companyName}</p>
            <p style={{ margin: 0 }}>{diaDiemGiaoHang || company?.address || "—"}</p>
            <p style={{ margin: 0 }}>{t.nguoiLienHe}: {nguoiNhan || company?.legalRep || "—"}</p>
            <p style={{ margin: 0 }}>{t.sdt}: {sdtNhan || company?.phone || "—"}</p>
          </td>
        </tr></tbody>
      </table>

      {/* Shipping/Payment */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, border: "1px solid #003087" }}>
        <thead><tr>
          <th style={{ ...secHead, border: "none", borderBottom: "1px solid #003087", borderRight: "1px solid #003087", width: "33.33%", textAlign: "center", background: "#003087", color: "#fff" }}>{t.phuongThucVC}</th>
          <th style={{ ...secHead, border: "none", borderBottom: "1px solid #003087", borderRight: "1px solid #003087", width: "33.33%", textAlign: "center", background: "#003087", color: "#fff" }}>{t.hinhThucGH}</th>
          <th style={{ ...secHead, border: "none", borderBottom: "1px solid #003087", width: "33.33%", textAlign: "center", background: "#003087", color: "#fff" }}>{t.thanhToan}</th>
        </tr></thead>
        <tbody><tr>
          <td style={{ ...bodyCell, border: "none", borderRight: "1px solid #003087", textAlign: "center" }}>{translateProduct(phuongTien, lang)}</td>
          <td style={{ ...bodyCell, border: "none", borderRight: "1px solid #003087", textAlign: "center" }}>{translateProduct(hinhThucGH, lang)}</td>
          <td style={{ ...bodyCell, border: "none", textAlign: "center" }}>{translateProduct(hinhThucTT, lang)}</td>
        </tr></tbody>
      </table>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr style={{ background: "#003087", borderTop: "1.5px solid #003087", borderBottom: "1.5px solid #003087" }}>
            {[
              { h: t.stt, w: 36, align: "center" as const },
              ...(showImage ? [{ h: "", w: 50, align: "center" as const }] : []),
              { h: t.tenHang, w: 0, align: "left" as const },
              { h: t.dvt, w: 50, align: "center" as const },
              { h: t.soLuong, w: 70, align: "center" as const },
              { h: t.donGia + (isRMB ? " (¥)" : " (₫)"), w: 90, align: "right" as const },
              { h: t.thanhTien + (isRMB ? " (¥)" : " (₫)"), w: 96, align: "right" as const }
            ].map(col => (
              <th key={col.h} style={{ ...secHead, border: "none", borderBottom: "1.5px solid #003087", textAlign: col.align, width: col.w || undefined, fontSize: 11, background: "#003087", color: "#fff" }}>{col.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderItems.map((x, idx) => {
            const donGiaHienThi = isRMB ? x.donGia / tyGia : x.donGia;
            const thanhTienHienThi = x.item!.soLuong * donGiaHienThi;
            const rowBorder: React.CSSProperties = { border: "none", borderBottom: "1px solid #cbd5e1" };
            return (
              <tr key={x.itemId} className={idx % 2 === 1 ? "zebra-stripe" : undefined} style={{ background: idx % 2 === 1 ? "#f8fafc" : "#fff" }}>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                {showImage && (
                  <td style={{ ...bodyCell, ...rowBorder, textAlign: "center", padding: "4px 8px" }}>
                    {x.item?.inventoryItem?.imageUrl ? (
                      <img src={x.item.inventoryItem.imageUrl} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, display: "block", margin: "0 auto" }} alt="" />
                    ) : <span style={{ color: "#cbd5e1", fontSize: 10 }}>—</span>}
                  </td>
                )}
                <td style={{ ...bodyCell, ...rowBorder }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{translateProduct(x.item!.tenHang, lang)}</p>

                  {x.ngayGiao && <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#64748b" }}>{t.ngayGiao} {fmtDate(x.ngayGiao)}</p>}
                </td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "center" }}>{translateProduct(x.item!.donVi ?? "—", lang)}</td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "center", fontWeight: 700 }}>{x.item!.soLuong.toLocaleString()}</td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "right" }}>{donGiaHienThi.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "right", fontWeight: 700 }}>{thanhTienHienThi.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Notes + Totals */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "none", marginBottom: 28 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", border: "none", paddingRight: 32 }}>
              <div style={{ fontSize: 11.5, lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 5px", fontWeight: 700 }}>{t.ghiChuQuanTrong}</p>
                {t.notes.map(n => <p key={n} style={{ margin: 0 }}>{n}</p>)}
                {ghiChu && <p style={{ margin: "8px 0 0", color: "#003087", fontWeight: 600 }}>• {t.ghiChu} {lang === "zh" && translatedGhiChu ? translatedGhiChu : translateProduct(ghiChu, lang)}</p>}
              </div>
            </td>
            <td style={{ verticalAlign: "top", width: 240, border: "none" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: "5px 6px", fontSize: 12.5 }}>{t.congTienHang}</td><td style={{ padding: "5px 6px", fontSize: 12.5, textAlign: "right" }}>{(isRMB ? tongTienHang / tyGia : tongTienHang).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {isRMB ? "¥" : "₫"}</td></tr>
                  <tr><td style={{ padding: "5px 6px", fontSize: 12.5 }}>{t.thueGtgt} ({thueVAT}%):</td><td style={{ padding: "5px 6px", fontSize: 12.5, textAlign: "right" }}>{(isRMB ? tienThue / tyGia : tienThue).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {isRMB ? "¥" : "₫"}</td></tr>
                  <tr style={{ borderTop: "1.5px solid #003087" }}>
                    <td style={{ padding: "6px 6px", fontSize: 13.5, fontWeight: 800, color: "#003087" }}>{t.tongCong}</td>
                    <td style={{ padding: "6px 6px", fontSize: 13.5, fontWeight: 800, color: "#003087", textAlign: "right" }}>{(isRMB ? tongCong / tyGia : tongCong).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {isRMB ? "¥" : "₫"}</td>
                  </tr>
                  {datCocPct > 0 && (
                    <tr>
                      <td style={{ padding: "4px 6px", fontSize: 12, fontWeight: 600, color: "#0369a1" }}>{t.yeuCauDatCoc} ({datCocPct}%):</td>
                      <td style={{ padding: "4px 6px", fontSize: 12, fontWeight: 700, color: "#0369a1", textAlign: "right" }}>{(isRMB ? tienDatCoc / tyGia : tienDatCoc).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {isRMB ? "¥" : "₫"}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p style={{ margin: "6px 6px 0", fontSize: 10.5, fontStyle: "italic", color: "#64748b" }}>({t.bangChu} {lang === "zh" ? soThanhChuZh(isRMB ? tongCong / tyGia : tongCong) : soThanhChu(isRMB ? tongCong / tyGia : tongCong).replace("đồng", isRMB ? "nhân dân tệ" : "đồng")})</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", paddingBottom: 24 }}>
        {[
          { role: t.nguoiLapPhieu, note: t.kyGhiRoHoTen },
          { role: t.keToanTruong, note: t.kyGhiRoHoTen },
          { role: t.giamDoc, note: t.kyGhiRoHoTenDongDau }
        ].map(s => (
          <div key={s.role} style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", minHeight: 120 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.02em" }}>{s.role}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#64748b", fontStyle: "italic" }}>{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleEditPrint = () => {
    printDocumentById("po-document", "portrait", `Đơn đặt hàng - ${poDraft}`, true, "15mm 10mm");
    onCreated([]);
  };

  const handleEditExportPDF = async () => {
    await exportElementToPDF("po-document", `DonDatHang_${poDraft}.pdf`, {
      keepOriginalStyles: true,
      orientation: "portrait",
      marginTop: 15,
      marginBottom: 10
    });
    onCreated([]);
  };

  const handleExportPDF = async () => {
    if (submitting || saving) return;
    setSubmitting(true);
    try {
      const { res, data, text } = await callCreateOrders();
      if (res.ok) {
        const orders = (data.createdOrders ?? []) as { code: string | null; supplierName: string; soMatHang: number }[];
        await exportElementToPDF("po-document", `DonDatHang_${poDraft}.pdf`, {
          keepOriginalStyles: true,
          orientation: "portrait",
          marginTop: 15,
          marginBottom: 10
        });
        onCreated(orders);
      } else {
        const msg = data.error ?? `Lỗi server (HTTP ${res.status})`;
        alert(msg); console.error("[create-orders] error:", msg, text);
      }
    } catch (err) {
      alert("Lỗi kết nối."); console.error(err);
    } finally { setSubmitting(false); }
  };

  const handleSubmitApproval = async () => {
    if (submittingApproval || submitting || saving) return;
    setSubmittingApproval(true);
    try {
      let targetOrderId = editOrderId || "";
      let targetOrderCode = editOrderCode || poDraft;
      let createdOrders: { id?: string; code: string | null; supplierName: string; soMatHang: number }[] = [];

      if (!isEdit) {
        const { res, data, text } = await callCreateOrders();
        if (!res.ok) {
          const msg = data.error ?? `Lỗi server (HTTP ${res.status})`;
          alert(msg); console.error("[submit-approval create-orders]", msg, text);
          return;
        }
        createdOrders = (data.createdOrders ?? []) as { id?: string; code: string | null; supplierName: string; soMatHang: number }[];
        if (createdOrders[0]?.id) targetOrderId = createdOrders[0].id;
        if (createdOrders[0]?.code) targetOrderCode = createdOrders[0].code;
      }

      const approvalRes = await fetch("/api/approval-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "purchase_order",
          entityId: targetOrderId || targetOrderCode,
          entityCode: targetOrderCode,
          entityTitle: `Đơn mua hàng ${targetOrderCode} - ${supName}`,
          department: "Phòng Mua hàng & Cung ứng",
          amount: tongCong,
          priority: "high",
          reason: `Trình duyệt đơn mua hàng ${targetOrderCode} cho nhà cung cấp ${supName}${datCocPct > 0 ? ` (Yêu cầu đặt cọc ${datCocPct}% = ${tienDatCoc.toLocaleString("vi-VN")} đ)` : ""}`,
          metadata: {
            supplierId,
            supplierName: supName,
            ngayDat,
            hinhThucTT,
            hinhThucGH,
            phuongTien,
            thueVAT,
            tongTienHang,
            tienThue,
            tongCong,
            datCocPct,
            tienDatCoc,
            isRMB,
            tyGia: isRMB ? tyGia : 1,
            ghiChu,
            items: orderItems.map(x => ({
              tenHang: x.item!.tenHang,
              donVi: x.item!.donVi,
              soLuong: x.item!.soLuong,
              donGia: x.donGia,
              thanhTien: x.item!.soLuong * x.donGia,
              ngayGiao: x.ngayGiao,
            })),
          },
        }),
      });

      if (!approvalRes.ok) {
        const errData = await approvalRes.json().catch(() => ({}));
        alert(errData.error ?? `Lỗi trình duyệt (HTTP ${approvalRes.status})`);
        return;
      }

      setSaveMsg("✓ Đã trình Giám đốc duyệt");
      setTimeout(() => setSaveMsg(null), 3500);
      onCreated(createdOrders);
    } catch (err) {
      alert("Lỗi kết nối. Vui lòng thử lại."); console.error(err);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const actions = isEdit ? (
    <>
      {saveMsg && <Badge variant="success">{saveMsg}</Badge>}
      <Button
        variant="outline"
        size="icon"
        title="Xuất PDF"
        aria-label="Xuất PDF"
        onClick={handleEditExportPDF}
        style={{ width: 32, height: 32, padding: 0 }}
      >
        <FileEarmarkPdf size={15} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        title="In đơn hàng"
        aria-label="In đơn hàng"
        onClick={handleEditPrint}
        style={{ width: 32, height: 32, padding: 0 }}
      >
        <Printer size={15} />
      </Button>
      <Button
        variant="primary"
        size="sm"
        leftIcon={<SendCheck size={14} />}
        isLoading={submittingApproval}
        disabled={submittingApproval || submitting || saving}
        onClick={handleSubmitApproval}
      >
        {submittingApproval ? "Đang trình..." : "Trình duyệt"}
      </Button>
    </>
  ) : (
    <>
      {saveMsg && <Badge variant="success">{saveMsg}</Badge>}
      <Button
        variant="outline"
        size="icon"
        title="Lưu đơn đặt hàng"
        aria-label="Lưu đơn đặt hàng"
        isLoading={saving}
        disabled={saving || submitting || submittingApproval}
        onClick={handleSave}
        style={{ width: 32, height: 32, padding: 0 }}
      >
        {!saving && <Floppy size={15} />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        title="Lưu & Xuất PDF"
        aria-label="Lưu & Xuất PDF"
        isLoading={submitting}
        disabled={submitting || saving || submittingApproval}
        onClick={handleExportPDF}
        style={{ width: 32, height: 32, padding: 0 }}
      >
        {!submitting && <FileEarmarkPdf size={15} />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        title="In đơn hàng"
        aria-label="In đơn hàng"
        isLoading={submitting}
        disabled={submitting || saving || submittingApproval}
        onClick={handlePrint}
        style={{ width: 32, height: 32, padding: 0 }}
      >
        {!submitting && <Printer size={15} />}
      </Button>
      <Button
        variant="primary"
        size="sm"
        leftIcon={<SendCheck size={14} />}
        isLoading={submittingApproval}
        disabled={submittingApproval || submitting || saving}
        onClick={handleSubmitApproval}
      >
        {submittingApproval ? "Đang trình..." : "Trình duyệt"}
      </Button>
    </>
  );

  return (
    <PrintPreviewModal
      title="Xem trước Đơn đặt hàng"
      subtitle={<>NCC: <strong style={{ color: "var(--foreground)" }}>{supName}</strong>{!isEdit && (reqCode ?? reqId) && <>&nbsp;·&nbsp;Từ phiếu YC: <strong style={{ color: "#003087" }}>{reqCode ?? reqId}</strong></>}</>}
      actions={actions}
      sidebar={sidebar}
      document={doc}
      onClose={onClose}
      documentId="po-document"
      printOrientation="portrait"
      printMargins="15mm 10mm"
    />
  );
}
