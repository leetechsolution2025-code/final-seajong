# Final Seajong ERP — Vite & Express Architecture

Hệ thống quản trị doanh nghiệp Seajong thế hệ mới được xây dựng trên kiến trúc **Vite + React 19** kết hợp **Express 5 + Prisma ORM (SQLite)**.

## 🚀 Tính năng nổi bật của Giai đoạn 1 (Phase 1)
- **Tốc độ vượt trội:** Frontend Vite khởi động trong **< 100ms** và HMR tức thì.
- **Tiện lợi 1 lệnh chạy (All-in-one):** Tích hợp `autoBackendPlugin` trong `vite.config.ts`. Chỉ cần gõ lệnh `npm run dev`, Vite sẽ tự động bật backend Express server (`server.js`), proxy API và tự khởi động lại khi có thay đổi.
- **Cơ sở dữ liệu độc lập:** Sử dụng SQLite (`prisma/dev.db`) riêng biệt, không chạm vào dự án cũ.
- **Đầy đủ Authentication:** Đăng nhập JWT, xác thực phiên làm việc, phân quyền Admin & thông tin nhân sự.
- **Khung giao diện chuẩn Doanh nghiệp:** Tailwind CSS v4, Layout tương thích iPad và Desktop, Sidebar, Topbar, Dashboard tổng quan.

---

## 🛠️ Hướng dẫn khởi chạy

Mở Terminal và chuyển vào thư mục:
```bash
cd /Users/leanhvan/final-seajong
```

### 1. Khởi chạy môi trường phát triển (Dev)
```bash
npm run dev
```
* **Frontend:** `http://localhost:5175`
* **Backend API:** `http://localhost:3005` (Tự động kích hoạt song song và proxy qua `localhost:5175/api`)

### 2. Tài khoản Đăng nhập mẫu
* **Email:** `admin@seajong.com`
* **Mật khẩu:** `Admin@123`

### 3. Kiểm tra Build
```bash
npm run build
```
