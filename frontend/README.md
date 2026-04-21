# 🎨 Event Ticketing System - Frontend

## 📌 Giới thiệu

Đây là frontend của hệ thống **Quản lý sự kiện & bán vé trực tuyến**, được xây dựng với:

- ⚛️ React (Vite)
- 🎨 TailwindCSS
- 🐳 Docker (Dev & Production)

Frontend cung cấp giao diện cho người dùng:

- Xem danh sách sự kiện
- Đặt vé
- Thanh toán
- Quản lý vé cá nhân

---

## 🏗️ Kiến trúc Frontend

Dự án sử dụng kiến trúc **Component-Based + Service Layer**, giúp dễ mở rộng và maintain.

```text
UI (Components) → Services (API) → Backend (Spring Boot)
```

---

## 📂 Cấu trúc thư mục

```text
src/
 ├── assets/            # Hình ảnh, icon
 ├── components/        # Reusable UI components
 ├── pages/             # Page-level components
 ├── services/          # API calls (fetch/axios)
 ├── hooks/             # Custom React hooks
 ├── layouts/           # Layout (header, footer)
 ├── utils/             # Helper functions
 ├── App.jsx            # Root component
 ├── main.jsx           # Entry point
 └── index.css          # TailwindCSS
```

---

## ⚙️ Yêu cầu hệ thống

- Node.js 18+
- npm / yarn
- Docker & Docker Compose

---

## 🚀 Cách chạy dự án

---

### 🧪 1. Development (Hot Reload)

```bash
docker-compose -f docker-compose.dev.yml up
```

✅ Tính năng:

- Hot reload (tự động reload khi sửa code)
- Không cần build lại container
- Kết nối backend qua API

👉 Truy cập:

- http://localhost:5173

---

### 🚀 2. Production

```bash
docker-compose up --build
```

👉 Truy cập:

- http://localhost:3000

---

## 🔗 Kết nối Backend

Frontend sử dụng biến môi trường:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 📌 Lưu ý

- Trong Docker:

  ```env
  VITE_API_BASE_URL=http://backend:8080
  ```

- Không hardcode URL trong code

---

## 🛠️ Công nghệ sử dụng

- React (Hooks)
- Vite
- TailwindCSS
- Fetch API / Axios
- Docker + Nginx

---

## 🎯 Tính năng chính

- 🎟️ Hiển thị danh sách sự kiện
- 🔍 Tìm kiếm & lọc sự kiện
- 🛒 Đặt vé
- 💳 Thanh toán
- 📱 Responsive UI

---

## ⚠️ Các vấn đề cần xử lý

- Gọi API tối ưu (debounce, caching)
- Xử lý loading & error state
- Bảo mật (XSS, token storage)
- Tránh gọi API thừa

---

## 🧠 Best Practices

- Tách logic API vào `services/`
- Tái sử dụng component
- Sử dụng custom hooks
- Không gọi API trực tiếp trong UI lớn

---

## 🔥 Hướng phát triển tiếp

- State management (Redux / Zustand)
- UI library (MUI / Headless UI)
- Code splitting (lazy loading)
- SEO (SSR / Next.js – future)

---

## 📌 Ghi chú

- Không commit `.env`
- Sử dụng `.env.example` để hướng dẫn team
- Luôn dùng biến môi trường cho API URL

---

## 👨‍💻 Phát triển

- Methodology: Scrum
- Timeline: 5 tháng
- Mô hình: Iterative / Incremental

---

## 📞 Liên hệ

Nếu có vấn đề, vui lòng tạo issue hoặc liên hệ team phát triển.
