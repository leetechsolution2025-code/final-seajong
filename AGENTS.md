# AGENTS.MD - Hướng dẫn và Quy tắc Dự án Seajong

## Quy tắc thiết kế Component PageTitle (PageHeader)

> [!CRITICAL]
> **KHÔNG ĐƯỢC THÊM CÁC NỘI DUNG KHÁC VÀO COMPONENT `PageTitle` (`PageHeader`)!**

1. **Phạm vi duy nhất của `PageTitle` (`PageHeader`)**:
   - Icon phòng ban / tính năng.
   - Tiêu đề trang (`title`).
   - Badge nhận diện (nếu có).
   - Mô tả ngắn của trang (`description`).
   - Đồng hồ điện tử thời gian thực (Giờ:Phút:Giây & Ngày tháng năm).

2. **Cấm tuyệt đối**:
   - **TUYỆT ĐỐI KHÔNG CÓ NÚT BẤM** trong `PageTitle`: Không nút Quay về, không nút "Về Tổng quan", không nút Thêm mới/Xuất Excel hay bất kỳ nút con `{children}` nào.
   - Không được thêm bảng dữ liệu, ô tìm kiếm, thanh ticker, nút hành động bảng, hay các nội dung nghiệp vụ khác vào bên trong `PageTitle`.
   - Các công cụ thao tác bảng (Tìm kiếm, Bộ lọc, Nút Thêm mới, Xuất Excel, Menu 3 chấm) phải đặt trong component **`TableToolbar`** bên trong thẻ card chính của **`StandardPage`** hoặc **`StepPage`**.

3. **Cấu trúc Component Bảng Chuẩn**:
   - Dùng **`StandardPage`** (khoảng đệm ngoài cố định 8px, card bo góc `rounded-xl`).
   - Dùng **`TableToolbar`** (từ `client-skydoor`, padding 8px).
   - Dùng **`FullWidthTable`** (sticky header, chống giật nháy loading).
   - Dùng **`Pagination`** (phân trang chuẩn enterprise).
