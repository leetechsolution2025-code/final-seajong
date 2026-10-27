# UI Guidelines & Rules - Seajong

## Quy tắc thiết kế Component PageTitle (PageHeader)

> [!CRITICAL]
> **TUYỆT ĐỐI KHÔNG ĐƯỢC THÊM CÁC NỘI DUNG KHÁC VÀO COMPONENT `PageTitle` (`PageHeader`)!**

1. **Phạm vi hiển thị duy nhất của `PageTitle` / `PageHeader`**:
   - Icon phòng ban / tính năng (với hộp màu sắc quy định theo phòng ban).
   - Tiêu đề trang (`title`).
   - Nút quay về (`showBackButton`, `Quay về`).
   - Mô tả ngắn gọn của trang (`description`).
   - Nút điều hướng cơ bản bên phải (ví dụ: `Về Tổng quan`).
   - Đồng hồ điện tử hiển thị thời gian thực và ngày tháng tiếng Việt.

2. **Các thành phần NGHIÊM CẤM đưa vào `PageTitle`**:
   - KHÔNG đặt thanh tin tức ticker (`DynamicTicker`).
   - KHÔNG đặt ô tìm kiếm (`SearchInput`).
   - KHÔNG đặt bộ lọc (`Select`, `filters`).
   - KHÔNG đặt bảng dữ liệu, danh sách thực thi, card nghiệp vụ.
   - KHÔNG đặt các nút thao tác nghiệp vụ phức tạp (như "Xuất Excel", "Thêm mới" của bảng). Toàn bộ các công cụ này phải nằm trong `TableToolbar` bên trong thẻ card chính (`StandardPage`).

3. **Cấu trúc trang chuẩn (`StandardPage`)**:
   - Cố định khoảng đệm viền ngoài (`padding: 8px` / `p-2`).
   - Thẻ card chính bo góc thanh lịch `rounded-xl` (12px), nền trắng `bg-white`, viền mảnh `border-slate-200/80`.
   - `TableToolbar` nằm ở đầu thẻ card chính với khoảng đệm `padding: 8px` và `marginBottom: 8px`.
   - Nội dung bảng sử dụng `FullWidthTable` và phân trang `Pagination`.
