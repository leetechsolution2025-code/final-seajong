import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';

export interface TickerItem {
  badge?: string;
  badgeColor?: string;
  text: string;
  link?: string;
  type?: string;
}

export interface DynamicTickerProps {
  items?: TickerItem[];
  customNews?: TickerItem[];
  context?: string;
  pageTitle?: string;
}

// ── 1. NHẬN DIỆN THƯƠNG HIỆU (BRAND IDENTITY) ──────────────────────────────
export const BRAND_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'LOGO QUY CHUẨN',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Chỉ sử dụng 2 phiên bản logo Seajong chuẩn: Navy (#003087) trên nền sáng và Trắng đảo ngược trên nền tối/Navy',
  },
  {
    badge: 'BẢNG MÀU CHÍNH THỨC',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    text: 'Hệ thống 6 mã màu nhận diện thương hiệu: Navy Primary (#003087), Gold Accent (#D4AF37), Deep Dark (#0F172A), Light Cream, Seajong Red, Chrome Silver',
  },
  {
    badge: 'HỆ THỐNG TYPOGRAPHY',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Tiêu đề & Tên thương hiệu sử dụng phông chữ Montserrat (Bold / ExtraBold) • Nội dung sử dụng Inter / Open Sans',
  },
  {
    badge: 'VÙNG AN TOÀN LOGO',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Khoảng cách an toàn tối thiểu xung quanh logo Seajong bằng 1/4 chiều cao logo để đảm bảo tính toàn vẹn thương hiệu',
  },
  {
    badge: 'TONE GIỌNG THƯƠNG HIỆU',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: '4 trụ cột giao tiếp thương hiệu: Chuyên nghiệp, Tin cậy, Cao cấp và Gần gũi với mọi gia đình Việt Nam',
  },
  {
    badge: 'QUY TẮC CẤM KỴ',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Tuyệt đối không kéo giãn méo tỷ lệ logo, không đặt trên nền hoa văn rối mắt, không tự ý đổi màu sắc logo ngoài quy chuẩn',
  },
  {
    badge: 'TÀI NGUYÊN ĐỒ HỌA',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    text: 'Sẵn sàng file tải Logo PNG 300 DPI nền trong suốt, Logo trắng và bộ mã màu CSS Tokens cho ấn phẩm truyền thông',
  },
];

// ── 2. HỆ THỐNG SẢN PHẨM & CATALOGUE (PRODUCTS) ──────────────────────────────
export const PRODUCTS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'ĐỒNG BỘ CSDL',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Cơ sở dữ liệu lưu trữ 226 sản phẩm (bao gồm 196 model đang phát hành trực tiếp trên website seajong.com)',
  },
  {
    badge: 'HỆ THỐNG DANH MỤC',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Phân loại 32 danh mục: Sen cây nhiệt độ, Vòi lavabo mạ PVD, Bồn cầu thông minh Nano, Tủ chậu PVC Foam & Phụ kiện phòng tắm',
  },
  {
    badge: 'BẢO HÀNH CHÍNH HÃNG',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Bảo hành chính hãng sen vòi Seajong lên đến 5 năm • Đổi mới 1 - 1 trong 30 ngày nếu phát sinh lỗi kỹ thuật sản xuất',
  },
  {
    badge: 'TIÊU CHUẨN VẬT LIỆU',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: '100% sen vòi đúc từ đồng thau 59-1 tiêu chuẩn Châu Âu, công nghệ mạ PVD chống ăn mòn và men tuyết Nano kháng khuẩn',
  },
  {
    badge: 'BỘ SƯU TẬP 2026',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Ra mắt dòng Sen cây phím đàn hiển thị nhiệt độ SJ-SH và Vòi chậu cảm ứng nhiệt độ thông minh thế hệ mới',
  },
  {
    badge: 'HỒ SƠ DỰ ÁN',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    text: 'Sẵn sàng thư viện bản vẽ kỹ thuật CAD 2D/3D, catalogue và chứng chỉ xuất xưởng (CO/CQ) cho các dự án công trình',
  },
  {
    badge: 'BẢNG GIÁ NIÊM YẾT',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Cập nhật giá niêm yết bán lẻ chính thức trên toàn quốc cho các phiên bản màu: Titan Gray, Chrome, Matte Black và Gold PVD',
  },
];

// ── 3. LẬP KẾ HOẠCH MARKETING (MARKETING PLAN) ──────────────────────────────
export const MARKETING_PLAN_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'MỤC TIÊU TIẾP THỊ 2026',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Tổng doanh thu tiếp thị và phát triển thị trường mục tiêu 5.000.000.000 đ cho năm tài chính 2026',
  },
  {
    badge: 'ĐỊNH MỨC NGÂN SÁCH',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Định mức ngân sách marketing kiểm soát chặt chẽ ở mức 0.5% trên tổng doanh thu (tối đa 130.000.000 đ)',
  },
  {
    badge: 'CƠ CẤU DOANH THU',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Phân bổ mục tiêu: Phát triển đại lý mới 50% (2.5 tỷ) • Đại lý hiện hữu 35% (1.75 tỷ) • Kênh truyền thống 15% (750 triệu)',
  },
  {
    badge: 'QUY TRÌNH 4 BƯỚC',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Quy trình chuẩn hóa: 1. Mục tiêu năm → 2. Kế hoạch năm & Kênh chạy → 3. Kế hoạch tháng → 4. Phân bổ ngân sách',
  },
  {
    badge: 'HẠNG MỤC ƯU TIÊN',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Trọng tâm ngân sách: Marketing điểm bán (POSM), Quảng cáo bảng hiệu đại lý, Facebook Ads và Ra mắt BST Sen vòi 2026',
  },
  {
    badge: 'PHÊ DUYỆT & KÝ SỐ',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    text: 'Kế hoạch marketing được số hóa 100%, hỗ trợ ký số điện tử trực tiếp và xuất file báo cáo đề cương chi tiết A4',
  },
];

// ── 4. LẬP KẾ HOẠCH KINH DOANH (SALES PLAN) ─────────────────────────────────
export const SALES_PLAN_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'KẾ HOẠCH DOANH SỐ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Chỉ tiêu kinh doanh thiết bị vệ sinh cao cấp Seajong năm 2026: Tăng trưởng thị phần +45% trên 63 tỉnh thành',
  },
  {
    badge: 'MỤC TIÊU PHÁT TRIỂN',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Mục tiêu mở rộng thêm 35 đại lý cấp 1 và 500 điểm bán mới trong các quý cao điểm xây dựng hoàn thiện nhà',
  },
  {
    badge: 'CƠ CHẾ CHIẾT KHẤU',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Ban hành bảng chiết khấu bán hàng bậc thang hấp dẫn và chương trình thưởng tích lũy doanh số quý',
  },
  {
    badge: 'DỰ BÁO NHU CẦU',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Đẩy mạnh tồn kho gối đầu các dòng Sen cây phím đàn Titan Gray và Bồn cầu tuyết Nano chống bám bẩn',
  },
];

// ── 5. THEO DÕI ĐỐI THỦ (COMPETITORS) ───────────────────────────────────────
export const COMPETITORS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'THEO DÕI ĐỐI THỦ',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Giám sát động thái giá niêm yết, chiến dịch khuyến mãi và mẫu mã mới của 8 thương hiệu sen vòi cùng phân khúc',
  },
  {
    badge: 'LỢI THẾ CẠNH TRANH',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Ưu thế độc quyền Seajong: Đồng thau 59-1 nguyên chất, van Ceramic 500.000 lần đóng mở và lớp mạ PVD chống oxy hóa',
  },
  {
    badge: 'THỊ PHẦN KHU VỰC',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Seajong gia tăng thị phần thiết bị phòng tắm cao cấp tại Miền Bắc +18% và mở rộng mạnh mẽ tại Miền Trung',
  },
];

// ── 6. PHÂN TÍCH THỊ TRƯỜNG (MARKET ANALYSIS) ───────────────────────────────
export const MARKET_ANALYSIS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'XU HƯỚNG TIÊU DÙNG',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Xu hướng 2026: Người tiêu dùng chuộng sen tắm nhiệt độ an toàn, màn hình LED hiển thị và tông màu xám Titan sang trọng',
  },
  {
    badge: 'QUY MÔ THỊ TRƯỜNG',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Ngành vật liệu hoàn thiện và thiết bị vệ sinh duy trì tốc độ phục hồi tăng trưởng 12-15% theo đà thị trường bất động sản',
  },
  {
    badge: 'PHÂN KHÚC MỤC TIÊU',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Tập trung chủ lực phân khúc nhà ở cao cấp, biệt thự, resort nghỉ dưỡng và các dự án cải tạo căn hộ hiện đại',
  },
];

// ── 7. SỰ KIỆN & HỘI THẢO (EVENTS) ──────────────────────────────────────────
export const EVENTS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'CHUỖI SỰ KIỆN 2026',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Chuẩn bị Hội nghị Khách hàng Seajong toàn quốc và Triển lãm quốc tế Vietbuild tại Trung tâm Hội chợ Triển lãm',
  },
  {
    badge: 'RA MẮT BỘ SƯU TẬP',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Sự kiện trải nghiệm trực tiếp dòng Sen cây nhiệt độ cao cấp với sự tham dự của hơn 200 nhà thầu và đại lý',
  },
  {
    badge: 'TIẾN ĐỘ TỔ CHỨC',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Hoàn tất thiết kế không gian trưng bày thực tế, quà tặng lưu niệm VIP và kịch bản truyền thông đa kênh',
  },
];

// ── 8. PHÁT TRIỂN ĐẠI LÝ & ĐỐI TÁC (DEALERS / PARTNERS) ──────────────────────
export const DEALERS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: '🏆 DẪN ĐẦU NĂM 2026',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    text: 'Vinh danh <strong>Showroom Thiên Thuận Lạng Sơn (KH0014)</strong> xuất sắc dẫn đầu doanh số toàn quốc năm 2026 👑',
  },
  {
    badge: '🌟 DẪN ĐẦU THÁNG 10',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    text: 'Chúc mừng <strong>Showroom Thiên Thuận Lạng Sơn (KH0014)</strong> xuất sắc dẫn đầu doanh số tháng 10/2026 trên toàn hệ thống Seajong 🌟',
  },
  {
    badge: 'MẠNG LƯỚI ĐẠI LÝ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Hơn 150 đại lý cấp 1 và showroom chính hãng Seajong phủ sóng tại 63 tỉnh thành trên toàn quốc',
  },
  {
    badge: 'HỖ TRỢ ĐIỂM BÁN',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Tài trợ 100% biển hiệu nhận diện chuẩn, kệ trưng bày cao cấp và bộ mẫu sản phẩm trải nghiệm cho đại lý mới',
  },
  {
    badge: 'ĐỒNG HÀNH KỸ THUẬT',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Đội ngũ chuyên viên kỹ thuật Seajong hỗ trợ lắp đặt, sơ đồ đường nước và bảo hành tận chân công trình',
  },
];

// ── 9. QUẢN LÝ HỒ SƠ NHÂN SỰ (EMPLOYEES / HR) ──────────────────────────────
export const EMPLOYEES_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'QUY MÔ NHÂN SỰ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Cơ sở dữ liệu trích ngang quản lý 128 cán bộ công nhân viên toàn công ty Seajong tại trụ sở và các phân xưởng',
  },
  {
    badge: 'CHẤM CÔNG & CA LÀM',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Ca hành chính: 07:30 – 17:00 • Phân xưởng sản xuất: Ca 1 & Ca 2 duy trì ổn định 100% công suất',
  },
  {
    badge: 'HỢP ĐỒNG LAO ĐỘNG',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: '100% người lao động được ký kết Hợp đồng lao động, rà soát phụ lục định kỳ và lưu trữ hồ sơ số hóa',
  },
  {
    badge: 'CHÍNH SÁCH ĐÃI NGỘ',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Bảo hiểm y tế, BHXH và các chế độ phúc lợi áp dụng đầy đủ theo Bộ luật Lao động và quy chế Seajong',
  },
  {
    badge: 'AN TOÀN PHÂN XƯỞNG',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Trang bị 100% bảo hộ lao động đạt tiêu chuẩn kỹ thuật cho công nhân các tổ đúc đồng, gia công cơ khí và mạ PVD',
  },
];

// ── 10. TUYỂN DỤNG & PHỎNG VẤN (RECRUITMENT) ─────────────────────────────────
export const RECRUITMENT_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'KẾ HOẠCH TUYỂN DỤNG',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Kế hoạch bổ sung 18 nhân sự quý 4/2026: 12 nhân viên kinh doanh thị trường, 4 kỹ sư cơ khí mạ PVD, 2 chuyên viên QA/QC',
  },
  {
    badge: 'HỒ SƠ ỨNG VIÊN',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Đã tiếp nhận 48 hồ sơ ứng viên qua các kênh tuyển dụng trực tuyến, tỷ lệ sàng lọc đạt yêu cầu chuyên môn 72%',
  },
  {
    badge: 'LỊCH PHỎNG VẤN',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Lịch phỏng vấn chuyên môn định kỳ thứ Ba và thứ Năm hàng tuần cùng Trưởng bộ phận & Ban Giám đốc',
  },
  {
    badge: 'KHUNG NĂNG LỰC ASK',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Đánh giá ứng viên theo tiêu chuẩn Thái độ (Attitude) - Kỹ năng (Skill) - Kiến thức (Knowledge) ngành thiết bị vệ sinh',
  },
];

// ── 11. ĐÀO TẠO & THỬ VIỆC (TRAINING / PROBATION) ───────────────────────────
export const TRAINING_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'THEO DÕI THỬ VIỆC',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: '8 nhân sự mới đang trong giai đoạn thử việc 60 ngày tại khối Kinh doanh, Marketing và Phân xưởng sản xuất',
  },
  {
    badge: 'ĐÁNH GIÁ 60 NGÀY',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Khảo sát đánh giá mức độ hòa nhập và hoàn thành mục tiêu công việc sau 30 ngày đạt điểm số trung bình 8.8/10',
  },
  {
    badge: 'ĐÀO TẠO KỸ THUẬT',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Khóa đào tạo chuyên sâu về tiêu chuẩn đồng thau 59-1, công nghệ mạ PVD 5 lớp và kết cấu van gốm Ceramic',
  },
  {
    badge: 'VĂN HÓA DOANH NGHIỆP',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Chương trình hội nhập văn hóa Seajong: Tinh thần trách nhiệm, kỷ luật xưởng và chất lượng sản phẩm dẫn đầu',
  },
];

// ── 12. CHẤM CÔNG & TÍNH LƯƠNG (ATTENDANCE & PAYROLL) ────────────────────────
export const ATTENDANCE_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'ĐỒNG BỘ ĐIỂM DANH',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Tự động ghi nhận giờ vào ca từ máy quét vân tay & AI nhận diện khuôn mặt tại 3 cổng ra vào nhà máy Seajong',
  },
  {
    badge: 'KỲ TÍNH CÔNG',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Kỳ tính công từ ngày 01 đến ngày cuối tháng • Chốt dữ liệu công nhật, công tăng ca trước ngày 05 hàng tháng',
  },
  {
    badge: 'CHI TRẢ LƯƠNG',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Chi trả lương đầy đủ đúng hẹn vào ngày 10 hàng tháng qua tài khoản ngân hàng liên kết',
  },
  {
    badge: 'PHỤ CẤP CHUYÊN CẦN',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Áp dụng thưởng chuyên cần và phụ cấp ăn ca cho 100% cán bộ công nhân viên đi làm đầy đủ trong tháng',
  },
];

// ── 13. BẢO HIỂM & PHÚC LỢI (INSURANCE) ──────────────────────────────────────
export const INSURANCE_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'QUỸ BẢO HIỂM',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Trích nộp 100% BHXH, BHYT, BHTN đúng kỳ hạn cho toàn thể nhân sự chính thức của Seajong',
  },
  {
    badge: 'CHẾ ĐỘ THAI SẢN',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    text: 'Tiếp nhận và giải quyết hồ sơ trợ cấp thai sản, ốm đau cho người lao động trong vòng 3 ngày làm việc',
  },
  {
    badge: 'BẢO HIỂM SỨC KHỎE',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Cấp gói bảo hiểm tai nạn lao động 24/7 và bảo hiểm sức khỏe bổ sung cho cán bộ quản lý và kỹ sư phân xưởng',
  },
  {
    badge: 'TRA CỨU VssID',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Hướng dẫn 100% nhân viên cài đặt ứng dụng VssID để theo dõi lịch sử đóng và quyền lợi bảo hiểm minh bạch',
  },
];

// ── 14. HÀNG HOÁ TRONG KHO & KHO VẬN (INVENTORY / WAREHOUSE) ──────────────────
export const INVENTORY_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TỒN KHO THÀNH PHẨM',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Duy trì tồn kho an toàn cho các dòng sản phẩm bán chạy: Sen cây phím đàn SJ-8800, Vòi chậu lavabo Titan Gray',
  },
  {
    badge: 'CẢNH BÁO TỒN THẤP',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Hệ thống tự động cảnh báo khi tồn kho linh kiện lõi sen ceramic và gioăng chịu nhiệt EPDM dưới mức 500 cái',
  },
  {
    badge: 'LỆNH XUẤT TRONG NGÀY',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Điều phối 12 chuyến xe giao hàng cho các tổng đại lý và công trình dự án khu vực Miền Bắc & Miền Trung',
  },
  {
    badge: 'KIỂM KÊ KHO BÃI',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Áp dụng sơ đồ kệ hàng QR code, rút ngắn 40% thời gian tìm kiếm và bốc xếp hàng hóa tại kho tổng Seajong',
  },
  {
    badge: 'QUAY VÒNG HÀNG TỒN',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Quản lý chặt chẽ định mức tồn trữ tối ưu, đảm bảo tỷ lệ quay vòng vốn hàng hóa duy trì ở mức an toàn cao',
  },
];

// ── 15. VẬN HÀNH KHO & KIỂM KHO (LOGISTICS OPERATIONS) ────────────────────────
export const LOGISTICS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'NHẬP XUẤT TRONG NGÀY',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Xử lý trung bình 15 lệnh xuất nhập kho cho các đại lý tỉnh và công trình dự án trong ngày',
  },
  {
    badge: 'CẤP PHÁT VẬT TƯ',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Cấp phát linh kiện lõi sen, gioăng cao su chịu nhiệt EPDM và phụ kiện lắp đặt theo đúng định mức BOM',
  },
  {
    badge: 'GOM HÀNG & DÁN NHÃN',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Áp dụng mã vạch QR code và tem nhãn phụ chính hãng Seajong trên 100% kiện hàng xuất xưởng',
  },
];

// ── 16. KIỂM SOÁT CHẤT LƯỢNG & HÀNG LỖI (QA / DEFECTS / STANDARDS) ───────────
export const QA_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'CHỈ SỐ CHẤT LƯỢNG',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Tỷ lệ lỗi bề mặt đúc và lỗi mạ tại phân xưởng tháng này duy trì dưới 0.8%, đạt chuẩn chất lượng loại A',
  },
  {
    badge: 'THỬ ÁP LỰC 16 BAR',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: '100% thân sen vòi được thử nghiệm áp lực nước tĩnh 16 bar và kiểm tra rò rỉ khí nén trước khi xuất xưởng',
  },
  {
    badge: 'ĐỘ BỀN LÕI VAN',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Lõi chia nước van gốm Ceramic đạt chứng nhận kiểm định độ bền đóng mở trên 500.000 lần không rò rỉ',
  },
  {
    badge: 'THỬ NGHIỆM PHUN MUỐI',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Bề mặt mạ PVD công nghệ cao chịu thử nghiệm phun muối axit (CASS test) vượt mốc 200 giờ kháng ăn mòn',
  },
  {
    badge: 'QUY TRÌNH 5 WHY',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Họp giao ban kỹ thuật phân tích nguyên nhân gốc rễ và ban hành quy trình khắc phục phòng ngừa lỗi sản xuất',
  },
];

// ── 17. TIÊU CHUẨN CHẤT LƯỢNG (STANDARDS) ───────────────────────────────────
export const STANDARDS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TIÊU CHUẨN ISO',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Hệ thống quản lý chất lượng đạt chứng nhận tiêu chuẩn quốc tế ISO 9001:2015 trên toàn bộ dây chuyền',
  },
  {
    badge: 'TIÊU CHUẨN ĐỒNG THAU',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Hợp kim đồng thau 59-1 tiêu chuẩn Châu Âu: Hàm lượng đồng ≥ 59%, hàm lượng chì < 1.6% an toàn tuyệt đối cho nguồn nước',
  },
  {
    badge: 'CÔNG NGHỆ MẠ PVD',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Lớp mạ chân không PVD 5 lớp cao cấp chống bám cặn canxi, chống trầy xước và giữ độ bóng gương bền bỉ trên 10 năm',
  },
];

// ── 18. KINH DOANH, ĐẠI LÝ & BÁO GIÁ (SALES / PARTNERS / PRICING) ─────────────
export const SALES_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TỔNG DOANH SỐ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
    text: 'Tháng 10/2026: Tổng doanh số đạt <strong>0,15 tỷ đồng</strong> (Seajong: <strong>0,14 tỷ</strong> • OEM: <strong>0,01 tỷ</strong>) — Đạt <strong>9.7%</strong> chỉ tiêu (1,55 tỷ, tăng trưởng <strong>+275%</strong>)',
  },
  {
    badge: 'TỔNG DOANH THU',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    text: 'Tháng 10/2026: Tổng doanh thu đạt <strong>0,07 tỷ đồng</strong> (Seajong: <strong>0,06 tỷ</strong> • OEM: <strong>0,01 tỷ</strong>) — Đạt <strong>5.3%</strong> kế hoạch (1,32 tỷ)',
  },
  {
    badge: 'PHÁT TRIỂN ĐẠI LÝ',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    text: 'Tháng 10/2026: Phát triển <strong>8/11 đại lý</strong> (Đạt <strong>72.7%</strong> mục tiêu) • Đang theo dõi <strong>4 đối tác tiềm năng</strong> (3 chăm sóc, 1 báo giá/HĐ)',
  },
  {
    badge: 'HỖ TRỢ ĐẠI LÝ',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
    text: 'Hỗ trợ đại lý: Tiếp nhận <strong>2 yêu cầu</strong> (1 đang xử lý, 1 chờ tiếp nhận — Tiếp nhận <strong>50%</strong>) • Mới nhất: <strong>Showroom Thiên Thuận Lạng Sơn (YCDL-202610-0001)</strong>',
  },
  {
    badge: 'DIỄN BIẾN 6 THÁNG',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200 font-bold',
    text: 'Lũy kế 6 tháng trên biểu đồ (T05–T10/2026): Tổng doanh số đạt <strong>1,29 tỷ đồng</strong> • Tổng doanh thu thực thu đạt <strong>0,30 tỷ đồng</strong>',
  },
];

// ── 19. MARKETING & CHIẾN DỊCH QUẢNG CÁO (MARKETING / CAMPAIGNS) ───────────
export const MARKETING_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'CHIẾN DỊCH QUẢNG CÁO',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Chiến dịch "Seajong - Đẳng cấp sen vòi Hàn Quốc" tiếp cận hơn 500.000 lượt khách hàng mục tiêu trên toàn quốc',
  },
  {
    badge: 'KHÁCH HÀNG TIỀM NĂNG',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Tiếp nhận trung bình 45 leads đăng ký tư vấn mở đại lý và mua sắm thiết bị vệ sinh cao cấp mỗi tuần',
  },
  {
    badge: 'SỰ KIỆN HỘI THẢO',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Chuẩn bị chuỗi sự kiện ra mắt Bộ sưu tập Sen vòi thông minh 2026 và Hội nghị khách hàng toàn quốc',
  },
  {
    badge: 'TÀI LIỆU TRUYỀN THÔNG',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Phát hành bộ tư liệu bán hàng mới: Catalogue in ấn cao cấp, Video 3D mô phỏng tính năng và Profile công ty',
  },
];

// ── 20. CHĂM SÓC KHÁCH HÀNG & KHIẾU NẠI (CRM / CS) ──────────────────────────
export const CRM_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TỔNG ĐÀI HỖ TRỢ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Hotline 1900.633.862 tiếp nhận và hỗ trợ kỹ thuật 24/7 với tỷ lệ phản hồi cuộc gọi đạt 98.6%',
  },
  {
    badge: 'XỬ LÝ BẢO HÀNH',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Cam kết cử chuyên viên kỹ thuật xử lý sự cố thiết bị tại nhà cho khách hàng trong vòng 24 giờ',
  },
  {
    badge: 'CHỈ SỐ HÀI LÒNG',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Điểm số đo lường mức độ hài lòng khách hàng (CSAT) tháng này đạt 9.4/10 điểm trên toàn hệ thống',
  },
];

// ── 21. NHÀ CUNG CẤP & MUA HÀNG (SUPPLIERS / PURCHASE) ───────────────────────
export const SUPPLIERS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'CHUỖI CUNG ỨNG',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Quản lý danh sách 28 nhà cung ứng phôi đồng, linh kiện gốm sứ và vật tư đóng gói đạt chuẩn kiểm định',
  },
  {
    badge: 'HỢP ĐỒNG NGUYÊN VẬT LIỆU',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Chốt đơn giá cung ứng phôi đồng thau 59-1 ổn định cho kế hoạch sản xuất 6 tháng cuối năm 2026',
  },
  {
    badge: 'ĐỐI TÁC VẬN TẢI',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Ký hợp đồng đối tác với 5 đơn vị vận tải chuyên tuyến Bắc - Nam, cam kết giao hàng an toàn đúng lịch hẹn',
  },
];

// ── 22. TÀI CHÍNH – KẾ TOÁN & CÔNG NỢ (FINANCE / ACCOUNTING) ─────────────────
export const FINANCE_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'QUẢN LÝ CÔNG NỢ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Đối soát công nợ đại lý phân phối định kỳ 15 ngày/lần, tỷ lệ thu hồi công nợ đúng hạn đạt 96.5%',
  },
  {
    badge: 'TÀI SẢN CỐ ĐỊNH',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Quản lý danh mục 11 tài sản cố định: Máy thử nước sen vòi, máy khắc lazer, phương tiện vận tải và showroom',
  },
  {
    badge: 'QUẢN TRỊ DÒNG TIỀN',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Đảm bảo nguồn vốn lưu động kịp thời giải ngân nguyên liệu đồng thau thỏi 59-1 và chi phí sản xuất',
  },
  {
    badge: 'BÁO CÁO TÀI CHÍNH',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Hoàn thành đối chiếu sổ cái kế toán và báo cáo thuế tháng tuân thủ đúng quy định chuẩn mực kế toán Việt Nam',
  },
];

// ── 22B. THEO DÕI DÒNG TIỀN DOANH NGHIỆP (CASHFLOW TRACKING) ─────────────────
export const CASHFLOW_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'DUYỆT ĐƠN HÀNG',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Kiểm soát phê duyệt đơn hàng bán lẻ và dự án, tự động cập nhật doanh thu và hạn mức công nợ phải thu kịp thời',
  },
  {
    badge: 'DUYỆT YÊU CẦU CHI',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Thẩm định tờ trình mua vật tư phôi đồng thau 59-1, chi phí tạm ứng công tác và bảo trì kỹ thuật trước khi phê duyệt',
  },
  {
    badge: 'DÒNG TIỀN VÀO (TK 111/112)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Theo dõi thu tiền khách hàng, dòng tiền bán lẻ và đối soát luồng tiền gửi ngân hàng BIDV/VCB thời gian thực',
  },
  {
    badge: 'DÒNG TIỀN RA (GIẢI NGÂN)',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Kiểm soát các lệnh chi thanh toán nhà cung cấp bao bì, chi phí gia công xi mạ PVD và xuất quỹ tiền mặt an toàn',
  },
  {
    badge: 'CÂN ĐỐI NGUỒN VỐN',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Đảm bảo thanh khoản vốn lưu động phục vụ liên tục cho dây chuyền sản xuất thiết bị phòng tắm cao cấp Seajong',
  },
];

// ── 23. CÔNG VIỆC CÁ NHÂN & NHIỆM VỤ (TASKS) ───────────────────────────────
export const TASKS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TIẾN ĐỘ CÔNG VIỆC',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Theo dõi danh sách công việc cá nhân, phối hợp giải quyết nhanh các đầu việc liên phòng ban',
  },
  {
    badge: 'ƯU TIÊN TRONG NGÀY',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Tập trung xử lý dứt điểm các nhiệm vụ quan trọng mức P1 trước 17:00 chiều hôm nay',
  },
  {
    badge: 'GIAO TIẾP & BÀN GIAO',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Cập nhật tiến độ thực hiện và đính kèm báo cáo nghiệm thu trực tiếp trên phần mềm điều hành Seajong',
  },
  {
    badge: 'CHỈ SỐ HIỆU SUẤT',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Tỷ lệ hoàn thành công việc đúng hạn đạt 94.2%, góp phần nâng cao điểm đánh giá KPI hàng tháng',
  },
];

// ── 24. TÀI LIỆU LƯU TRỮ & BIÊN BẢN HỌP (DOCUMENTS / MEETINGS) ──────────────
export const DOCUMENTS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'KHO TÀI LIỆU SỐ',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Lưu trữ hồ sơ kỹ thuật, chứng nhận tiêu chuẩn chất lượng ISO 9001:2015 và các bằng độc quyền kiểu dáng công nghiệp',
  },
  {
    badge: 'BIÊN BẢN GIAO BAN',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Cập nhật kết luận chỉ đạo của Ban Giám đốc trong cuộc họp giao ban đầu tuần tới các Trưởng phòng ban',
  },
  {
    badge: 'QUY TRÌNH NỘI BỘ',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Toàn bộ quy trình vận hành phân xưởng, quy chế kiểm định QA và biểu mẫu hành chính được số hóa 100%',
  },
];

// ── 25. AN NINH, BẢO VỆ & LỊCH TRỰC (SECURITY) ──────────────────────────────
export const SECURITY_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TRỰC AN NINH 24/7',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Đội ngũ bảo vệ túc trực 24/7, tuần tra định kỳ các chốt trạm phân xưởng, kho bãi và cổng chính nhà máy',
  },
  {
    badge: 'KIỂM SOÁT RA VÀO',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Kiểm soát chặt chẽ người và phương tiện xuất nhập cảnh, giám sát hệ thống camera an ninh 32 mắt độ nét cao',
  },
  {
    badge: 'AN TOÀN PCCC',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'Kiểm tra định kỳ hệ thống báo cháy tự động, bình chữa cháy CO2 và diễn tập phương án cứu nạn cứu hộ định kỳ',
  },
];

// ── 26. PHÊ DUYỆT TÀI LIỆU (APPROVALS) ──────────────────────────────────────
export const APPROVALS_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'TRÌNH DUYỆT ONLINE',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Quy trình ký duyệt điện tử 3 cấp: Nhân viên đề xuất → Trưởng phòng ban thẩm định → Ban Giám đốc phê duyệt',
  },
  {
    badge: 'TIẾN ĐỘ XỬ LÝ',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Thời gian phản hồi và phê duyệt hồ sơ tờ trình trung bình dưới 4 giờ làm việc',
  },
  {
    badge: 'LỊCH SỬ KÝ SỐ',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Toàn bộ ý kiến chỉ đạo, thời gian ký duyệt và chữ ký điện tử được mã hóa lưu trữ bảo mật',
  },
];

// ── 27. QUẢN TRỊ DANH MỤC HỆ THỐNG (CATEGORIES) ─────────────────────────────
export const CATEGORIES_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'DANH MỤC HỆ THỐNG',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Quản trị tập trung 32 nhóm ngành hàng thiết bị vệ sinh, bảng mã nhà cung cấp và phân loại đại lý',
  },
  {
    badge: 'CHUẨN HÓA DỮ LIỆU',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Đồng bộ hóa dữ liệu danh mục dùng chung giữa khối Nhà máy sản xuất, Kinh doanh và Tài chính kế toán',
  },
];

// ── 28. BAN GIÁM ĐỐC & ĐIỀU HÀNH CHIẾN LƯỢC (BOARD / STRATEGY) ──────────────
export const BOARD_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'DOANH THU THUẦN T10',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Doanh thu thuần Tháng 10 đạt <strong>1.30 tỷ đồng</strong> (Đạt <strong>83.9%</strong> kế hoạch 1.55 tỷ) • Doanh số ký: <strong>1.41 tỷ đồng</strong> qua 18 đơn hàng',
  },
  {
    badge: 'CƠ CẤU 2 KÊNH',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'Thương hiệu Seajong đóng góp <strong>1.30 tỷ đồng</strong> • Gia công OEM đóng góp <strong>0.82 tỷ đồng</strong> trong tháng 10/2026',
  },
  {
    badge: 'CHI PHÍ HOẠT ĐỘNG',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Chi phí thực tế <strong>0.18 tỷ đồng</strong> / Hạn mức 0.22 tỷ (Định mức 81.8%, Tỷ lệ CP/DT đạt <strong>13.8%</strong> an toàn tối ưu)',
  },
  {
    badge: 'CÔNG NỢ KHÁCH HÀNG',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'Tổng nợ phải thu: <strong>0.42 tỷ đồng</strong> (Trong hạn 0.34 tỷ, Quá hạn 0.08 tỷ, Tỷ lệ an toàn đạt <strong>81.0%</strong>)',
  },
  {
    badge: 'CÔNG NỢ NHÀ CUNG CẤP',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Nợ phải trả: <strong>0.28 tỷ đồng</strong> (Đến hạn 0.15 tỷ, Quá hạn 0 đồng, Đúng hạn <strong>100%</strong>, Tín nhiệm tín dụng: <strong>AAA</strong>)',
  },
  {
    badge: 'SẢN PHẨM CHỦ LỰC',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'Sen cây phím đàn hiển thị số dẫn đầu thị phần (chiếm <strong>38%</strong> doanh thu, lũy kế 4.56 tỷ đồng, tăng trưởng +18.4%)',
  },
  {
    badge: 'VẬN HÀNH & KCS',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    text: 'Tỷ lệ bàn giao đúng hạn OTDR đạt <strong>98.5%</strong> • Chất lượng KCS xuất xưởng đạt <strong>99.4%</strong> • Hệ số thanh toán hiện hành: <strong>208.64 lần</strong>',
  },
];

// ── HÀM SUY LUẬN CONTEXT THÔNG MINH PHÙ HỢP 100% VỚI NỘI DUNG TRANG ─────────
export function resolveContext(
  explicitContext?: string,
  pageTitle?: string,
  activeMenuKey?: string,
  activeDeptCode?: string
): string {
  // 1. Kiểm tra nếu explicitContext là module cụ thể (không phải phòng ban chung chung)
  if (explicitContext) {
    const ctx = explicitContext.toLowerCase().trim();
    if (ctx.includes('mkt_plan') || ctx.includes('marketing-plan') || ctx.includes('marketing_plan')) return 'marketing-plan';
    if (ctx.includes('sales_plan') || ctx.includes('sales-plan')) return 'sales-plan';
    if (ctx.includes('competitor')) return 'competitors';
    if (ctx.includes('market-analysis') || ctx.includes('market_analysis')) return 'market-analysis';
    if (ctx.includes('event')) return 'events';
    if (ctx.includes('dealer') || ctx.includes('partner')) return 'dealers';
    if (ctx.includes('brand')) return 'brand';
    if (ctx.includes('product') || ctx.includes('catalogue')) return 'products';
    if (ctx.includes('recruit') || ctx.includes('interview')) return 'recruitment';
    if (ctx.includes('train') || ctx.includes('probat')) return 'training';
    if (ctx.includes('attend') || ctx.includes('payroll') || ctx.includes('salary')) return 'attendance';
    if (ctx.includes('insur')) return 'insurance';
    if (ctx.includes('inbound') || ctx.includes('material-picking') || ctx.includes('batch-packing')) return 'logistics';
    if (ctx.includes('invent') || ctx.includes('wareh') || ctx.includes('stock')) return 'inventory';
    if (ctx.includes('standard')) return 'standards';
    if (ctx.includes('defect') || ctx.includes('qa') || ctx.includes('qc') || ctx.includes('bom')) return 'qa';
    if (ctx.includes('crm') || ctx.includes('complaint')) return 'crm';
    if (ctx.includes('supplier') || ctx.includes('purchase')) return 'suppliers';
    if (ctx.includes('approval')) return 'approvals';
    if (ctx.includes('categor')) return 'categories';
    if (ctx.includes('task') || ctx.includes('req')) return 'tasks';
    if (ctx.includes('doc') || ctx.includes('meet')) return 'documents';
    if (ctx.includes('shift') || ctx.includes('secur')) return 'security';
  }

  // 2. Tra cứu theo activeMenuKey chính xác từ Sidebar (Ưu tiên cao nhất cho chức năng cụ thể đang mở)
  if (activeMenuKey) {
    const m = activeMenuKey.toLowerCase().trim();
    if (m === 'mkt_plan' || m === 'marketing-plan' || m === 'planing-1111') return 'marketing-plan';
    if (m === 'sales_plan') return 'sales-plan';
    if (m === 'competitors') return 'competitors';
    if (m === 'market-analysis' || m === 'market_analysis') return 'market-analysis';
    if (m === 'events') return 'events';
    if (m === 'dealers' || m === 'partners') return 'dealers';
    if (m === 'brand' || m === 'brand-identity') return 'brand';
    if (m === 'products' || m === 'product') return 'products';
    if (m === 'employees' || m === 'promotions' || m === 'terminations') return 'employees';
    if (m === 'recruitment' || m === 'interviews') return 'recruitment';
    if (m === 'training' || m === 'probation') return 'training';
    if (m === 'attendance-payroll' || m === 'my_attendance' || m === 'salary-adjustments') return 'attendance';
    if (m === 'insurance') return 'insurance';
    if (m === 'stationery') return 'employees';
    if (m === 'inbound' || m === 'material-picking' || m === 'batch-packing' || m === 'system') return 'logistics';
    if (m === 'inventory' || m === 'inventory_top' || m === 'inventory-reports' || m === 'audit-logs') return 'inventory';
    if (m === 'standards') return 'standards';
    if (m === 'defects' || m === 'defects-summary' || m === 'bom') return 'qa';
    if (m === 'fac_crm' || m === 'complaints') return 'crm';
    if (m === 'suppliers' || m === 'purchase-orders' || m === 'evaluations') return 'suppliers';
    if (m === 'customers' || m === 'pricing' || m === 'business-results' || m === 'internal-reports' || m === 'retail') return 'sales';
    if (m === 'marketing') return 'marketing';
    if (m === 'cashflow' || m === 'dong-tien' || m === 'dong_tien') return 'cashflow';
    if (m === 'assets' || m === 'debts' || m === 'journal-entries' || m === 'advances' || m === 'reports') return 'finance';
    if (m === 'approvals') return 'approvals';
    if (m === 'categories') return 'categories';
    if (m === 'my_tasks' || m === 'tasks' || m === 'my_requests') return 'tasks';
    if (m === 'documents' || m === 'doc_library' || m === 'meetings' || m === 'meeting_minutes') return 'documents';
    if (m === 'shifts' || m === 'patrols' || m === 'incidents') return 'security';
    if (m === 'plan' || m === 'users' || m === 'labor-policy') return 'board';
  }

  // 3. Tra cứu theo tiêu đề trang (pageTitle)
  if (pageTitle) {
    const t = pageTitle.toLowerCase().trim();
    if (t.includes('kế hoạch marketing') || (t.includes('lập kế hoạch') && (t.includes('marketing') || activeDeptCode === 'marketing')) || t.includes('ngân sách tiếp thị')) return 'marketing-plan';
    if (t.includes('kế hoạch sale') || t.includes('kế hoạch kinh doanh') || t.includes('kế hoạch bán hàng')) return 'sales-plan';
    if (t.includes('đối thủ') || t.includes('cạnh tranh')) return 'competitors';
    if (t.includes('phân tích thị trường') || t.includes('thị trường')) return 'market-analysis';
    if (t.includes('sự kiện') || t.includes('hội nghị') || t.includes('triển lãm') || t.includes('vietbuild')) return 'events';
    if (t.includes('thương hiệu') || t.includes('brand') || t.includes('logo') || t.includes('nhận diện')) return 'brand';
    if (t.includes('sản phẩm') || t.includes('catalogue') || t.includes('thiết bị vệ sinh') || t.includes('sen vòi') || t.includes('bồn cầu')) return 'products';
    if (t.includes('hồ sơ nhân') || t.includes('danh sách nhân viên') || t.includes('nhân sự') || t.includes('cán bộ')) return 'employees';
    if (t.includes('tuyển dụng') || t.includes('phỏng vấn') || t.includes('ứng viên')) return 'recruitment';
    if (t.includes('thử việc') || t.includes('đào tạo')) return 'training';
    if (t.includes('chấm công') || t.includes('điểm danh') || t.includes('bảng lương') || t.includes('tính lương') || t.includes('thu nhập')) return 'attendance';
    if (t.includes('bảo hiểm') || t.includes('bhxh') || t.includes('bhyt')) return 'insurance';
    if (t.includes('văn phòng phẩm') || t.includes('dụng cụ')) return 'employees';
    if (t.includes('vận hành kho') || t.includes('cấp phát vật tư') || t.includes('dán nhãn') || t.includes('gom hàng')) return 'logistics';
    if (t.includes('hàng hoá') || t.includes('kho hàng') || t.includes('tồn kho') || t.includes('nhập xuất')) return 'inventory';
    if (t.includes('tiêu chuẩn') || t.includes('iso')) return 'standards';
    if (t.includes('hàng lỗi') || t.includes('chất lượng') || t.includes('kiểm định') || t.includes('qa') || t.includes('qc') || t.includes('bom')) return 'qa';
    if (t.includes('khiếu nại') || t.includes('chăm sóc') || t.includes('crm') || t.includes('hotline')) return 'crm';
    if (t.includes('nhà cung cấp') || t.includes('mua hàng') || t.includes('chuỗi cung ứng')) return 'suppliers';
    if (t.includes('đại lý') || t.includes('khách hàng') || t.includes('bán hàng') || t.includes('báo giá') || t.includes('chiết khấu') || t.includes('kinh doanh')) return 'sales';
    if (t.includes('quảng cáo') || t.includes('marketing') || t.includes('chiến dịch') || t.includes('lead')) return 'marketing';
    if (t.includes('dòng tiền') || t.includes('thu chi') || t.includes('cashflow')) return 'cashflow';
    if (t.includes('tài sản') || t.includes('công nợ') || t.includes('tài chính') || t.includes('kế toán') || t.includes('tạm ứng') || t.includes('sổ cái')) return 'finance';
    if (t.includes('phê duyệt') || t.includes('tờ trình') || t.includes('ký số')) return 'approvals';
    if (t.includes('danh mục')) return 'categories';
    if (t.includes('công việc') || t.includes('nhiệm vụ') || t.includes('đề xuất cá nhân')) return 'tasks';
    if (t.includes('tài liệu') || t.includes('biên bản') || t.includes('cuộc họp')) return 'documents';
    if (t.includes('an ninh') || t.includes('bảo vệ') || t.includes('ca gác') || t.includes('lịch trực')) return 'security';
    if (t.includes('ban giám đốc') || t.includes('điều hành') || t.includes('chiến lược')) return 'board';
  }

  // 4. Nếu explicitContext là phòng ban chung
  if (explicitContext) {
    const ctx = explicitContext.toLowerCase().trim();
    if (ctx.includes('cashflow') || ctx.includes('dong-tien') || ctx.includes('dong_tien')) return 'cashflow';
    if (ctx.includes('employee') || ctx === 'hr') return 'employees';
    if (ctx.includes('custom') || ctx.includes('sale') || ctx.includes('price') || ctx.includes('retail')) return 'sales';
    if (ctx.includes('market') || ctx.includes('camp') || ctx.includes('lead')) return 'marketing';
    if (ctx.includes('asset') || ctx.includes('debt') || ctx.includes('financ') || ctx.includes('acc') || ctx.includes('tax')) return 'finance';
    if (ctx.includes('board') || ctx.includes('exec') || ctx === 'plan') return 'board';
    return ctx;
  }

  // 5. Tra cứu theo phòng ban (activeDeptCode)
  if (activeDeptCode) {
    const d = activeDeptCode.toLowerCase().trim();
    if (d === 'marketing') return 'marketing';
    if (d === 'sales') return 'sales';
    if (d === 'hr') return 'employees';
    if (d === 'accounting' || d === 'finance') return 'finance';
    if (d === 'warehouse' || d === 'logistics' || d === 'production') return 'inventory';
    if (d === 'qa' || d === 'qc') return 'qa';
    if (d === 'purchase') return 'suppliers';
    if (d === 'cs') return 'crm';
    if (d === 'security') return 'security';
    if (d === 'board') return 'board';
  }

  return 'board';
}

export const DynamicTicker: React.FC<DynamicTickerProps> = ({
  items,
  customNews,
  context,
  pageTitle,
}) => {
  let deptContext;
  try {
    deptContext = useDepartment();
  } catch (_) {
    deptContext = undefined;
  }

  const activeMenu = deptContext?.activeMenuKey || '';
  const activeDept = deptContext?.activeDeptCode || '';

  // Giải quyết context liên quan mật thiết đến nội dung trang
  const resolvedContext = resolveContext(context, pageTitle, activeMenu, activeDept);

  // Dữ liệu thời gian thực từ cơ sở dữ liệu SQLite cho Ban Giám đốc
  const [liveBoardItems, setLiveBoardItems] = useState<TickerItem[] | null>(null);

  useEffect(() => {
    if (resolvedContext === 'board' && (!items || items.length === 0) && (!customNews || customNews.length === 0)) {
      fetch('/api/bom/overview-stats?period=month&year=2026')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || !data.periodData) return;
          const p = data.periodData;
          const rev = p.revenue || { actual: 1.30, target: 1.55, rate: '83.9' };
          const cost = p.cost || { actual: 0.18, target: 0.22, ratio: '13.8%' };
          const rec = p.receivable || { total: 0.42, due: 0.34, safeRate: '81.0%' };
          const pay = p.payable || { total: 0.28, due: 0.15, onTimeRate: '100%' };
          const m10 = (data.monthlyChartData && data.monthlyChartData[9]) || { seajong: 1.30, oem: 0.82 };

          setLiveBoardItems([
            {
              badge: 'DOANH THU THUẦN T10',
              badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              text: `Doanh thu thực hiện: <strong>${Number(rev.actual).toFixed(2)} tỷ đồng</strong> (Đạt <strong>${rev.rate}%</strong> KH) • Doanh số ký: <strong>${(p.actualSales ?? 1.41).toFixed(2)} tỷ đồng</strong> (${p.contracts ?? '18 đơn hàng'})`,
            },
            {
              badge: 'CƠ CẤU 2 KÊNH',
              badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
              text: `Thương hiệu Seajong: <strong>${Number(m10.seajong ?? 1.30).toFixed(2)} tỷ đồng</strong> • Gia công OEM: <strong>${Number(m10.oem ?? 0.82).toFixed(2)} tỷ đồng</strong> trong tháng 10/2026`,
            },
            {
              badge: 'CHI PHÍ HOẠT ĐỘNG',
              badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
              text: `Chi phí thực tế: <strong>${Number(cost.actual).toFixed(2)} tỷ đồng</strong> / Hạn mức ${Number(cost.target).toFixed(2)} tỷ • Tỷ lệ CP/DT: <strong>${cost.ratio || '13.8%'}</strong> (An toàn tối ưu)`,
            },
            {
              badge: 'CÔNG NỢ KHÁCH HÀNG',
              badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
              text: `Tổng nợ phải thu: <strong>${Number(rec.total).toFixed(2)} tỷ đồng</strong> (Trong hạn: ${Number(rec.due).toFixed(2)} tỷ, Quá hạn: ${Number(rec.overdue ?? 0.08).toFixed(2)} tỷ, Tỷ lệ an toàn: <strong>${rec.safeRate || '81.0%'}</strong>)`,
            },
            {
              badge: 'CÔNG NỢ NHÀ CUNG CẤP',
              badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
              text: `Nợ phải trả: <strong>${Number(pay.total).toFixed(2)} tỷ đồng</strong> (Đến hạn: ${Number(pay.due).toFixed(2)} tỷ, Quá hạn: 0 đồng, Đúng hạn: <strong>${pay.onTimeRate || '100%'}</strong>, Tín nhiệm: <strong>AAA</strong>)`,
            },
            {
              badge: 'SẢN PHẨM CHỦ LỰC',
              badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              text: 'Sen cây phím đàn hiển thị số chiếm <strong>38%</strong> doanh thu (Lũy kế 4.56 tỷ đồng, tăng trưởng +18.4%)',
            },
            {
              badge: 'VẬN HÀNH & KCS',
              badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
              text: `Giao hàng đúng hạn OTDR: <strong>${p.otdrRate || '98.5'}%</strong> • KCS chất lượng xuất xưởng: <strong>${p.firstPassYield || '99.4%'}</strong> • Hệ số thanh toán: <strong>208.64 lần</strong>`,
            },
          ]);
        })
        .catch(() => {});
    }
  }, [resolvedContext, items, customNews]);

  // Chọn danh sách items hiển thị
  let displayItems = items || customNews;
  if (!displayItems || displayItems.length === 0) {
    switch (resolvedContext) {
      case 'marketing-plan':
        displayItems = MARKETING_PLAN_TICKER_ITEMS;
        break;
      case 'sales-plan':
        displayItems = SALES_PLAN_TICKER_ITEMS;
        break;
      case 'competitors':
        displayItems = COMPETITORS_TICKER_ITEMS;
        break;
      case 'market-analysis':
        displayItems = MARKET_ANALYSIS_TICKER_ITEMS;
        break;
      case 'events':
        displayItems = EVENTS_TICKER_ITEMS;
        break;
      case 'dealers':
        displayItems = DEALERS_TICKER_ITEMS;
        break;
      case 'brand':
        displayItems = BRAND_TICKER_ITEMS;
        break;
      case 'products':
        displayItems = PRODUCTS_TICKER_ITEMS;
        break;
      case 'employees':
        displayItems = EMPLOYEES_TICKER_ITEMS;
        break;
      case 'recruitment':
        displayItems = RECRUITMENT_TICKER_ITEMS;
        break;
      case 'training':
        displayItems = TRAINING_TICKER_ITEMS;
        break;
      case 'attendance':
        displayItems = ATTENDANCE_TICKER_ITEMS;
        break;
      case 'insurance':
        displayItems = INSURANCE_TICKER_ITEMS;
        break;
      case 'logistics':
        displayItems = LOGISTICS_TICKER_ITEMS;
        break;
      case 'inventory':
        displayItems = INVENTORY_TICKER_ITEMS;
        break;
      case 'standards':
        displayItems = STANDARDS_TICKER_ITEMS;
        break;
      case 'qa':
        displayItems = QA_TICKER_ITEMS;
        break;
      case 'crm':
        displayItems = CRM_TICKER_ITEMS;
        break;
      case 'suppliers':
        displayItems = SUPPLIERS_TICKER_ITEMS;
        break;
      case 'sales':
        displayItems = SALES_TICKER_ITEMS;
        break;
      case 'marketing':
        displayItems = MARKETING_TICKER_ITEMS;
        break;
      case 'finance':
        displayItems = FINANCE_TICKER_ITEMS;
        break;
      case 'cashflow':
        displayItems = CASHFLOW_TICKER_ITEMS;
        break;
      case 'approvals':
        displayItems = APPROVALS_TICKER_ITEMS;
        break;
      case 'categories':
        displayItems = CATEGORIES_TICKER_ITEMS;
        break;
      case 'tasks':
        displayItems = TASKS_TICKER_ITEMS;
        break;
      case 'documents':
        displayItems = DOCUMENTS_TICKER_ITEMS;
        break;
      case 'security':
        displayItems = SECURITY_TICKER_ITEMS;
        break;
      case 'board':
      default:
        displayItems = liveBoardItems || BOARD_TICKER_ITEMS;
        break;
    }
  }

  return (
    <div className="h-8 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 text-slate-700 flex items-center px-3.5 overflow-hidden text-xs select-none shadow-2xs">
      {/* Icon announcement (speaker) */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-200 shrink-0 z-20 bg-white">
        <div
          className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shadow-3xs"
          title="Thông báo hệ thống Seajong"
        >
          <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
        </div>
      </div>

      {/* Marquee track với gradient fade 2 bên cạnh */}
      <div className="flex-1 overflow-hidden relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="ticker-track flex items-center gap-8 pl-4">
          {[...displayItems, ...displayItems].map((item, idx) => {
            const badgeLabel = item.badge || (item.type && item.type !== 'text' ? item.type.toUpperCase() : 'THÔNG BÁO');
            return (
              <div key={idx} className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono tracking-wide ${
                    item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {badgeLabel}
                </span>
                <span
                  className="text-slate-700 text-xs font-medium"
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
                <span className="text-slate-300 ml-4 font-bold select-none">•</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DynamicTicker;
