# 🎨 Event Ticketing System - Frontend

## 📌 Giới thiệu

Đây là frontend của hệ thống **Quản lý sự kiện & bán vé trực tuyến** (Dề Dê), được xây dựng với:

- ▲ Next.js 14 (App Router)
- ⚛️ React 18
- 🟦 TypeScript
- 🎨 TailwindCSS
- 🐳 Docker (Dev & Production)

Frontend cung cấp giao diện cho người dùng:

- Xem & tìm kiếm danh sách sự kiện
- Chọn ghế & đặt vé
- Thanh toán (mock gateway)
- Quản lý vé cá nhân (QR code), thông báo, feedback
- Trang quản trị (admin): sự kiện, venue, loại vé, feedback, analytics

---

## 🏗️ Kiến trúc Frontend

Dự án dùng **Next.js App Router** với kiến trúc **Component-Based + Service Layer**:

```text
UI (app/ + components/) → Services (services/) → Backend (Spring Boot /v1)
```

- Mọi lời gọi API đi qua `services/apiClient.ts` (axios instance: tự gắn bearer token từ `localStorage`, resolve base URL, và unwrap error envelope của backend).
- `services/api.ts` chứa các hàm gọi API có kiểu — UI/page gọi qua đây, **không gọi axios trực tiếp**.
- Auth state nằm ở `store/AuthContext.tsx`; route được bảo vệ bằng `components/RequireAuth.tsx` và `RequireRole.tsx`.

---

## 📂 Cấu trúc thư mục

```text
frontend/
 ├── app/                  # Next.js App Router (pages = page.tsx)
 │    ├── layout.tsx       # Root layout
 │    ├── page.tsx         # Trang chủ
 │    ├── events/          # Danh sách & chi tiết sự kiện ([id])
 │    ├── checkout/[id]/   # Thanh toán
 │    ├── tickets/         # Vé cá nhân & chi tiết vé ([id])
 │    ├── feedback/        # Feedback
 │    ├── notifications/   # Thông báo
 │    ├── profile/         # Hồ sơ
 │    ├── login/ register/ # Auth
 │    └── admin/           # Khu quản trị (events, feedback, analytics)
 ├── components/           # UI tái sử dụng (AppLayout, EventCard, Pagination, RequireAuth, RequireRole)
 ├── services/             # apiClient.ts (axios) + api.ts (typed calls)
 ├── store/                # AuthContext.tsx
 ├── utils/                # Helper (format.ts) + tests
 ├── types/                # TypeScript types & global.d.ts
 ├── public/               # Tài nguyên tĩnh + config.js (runtime config)
 ├── next.config.mjs       # Cấu hình Next (standalone output + /v1 rewrite)
 ├── tailwind.config.ts
 └── postcss.config.js
```

---

## ⚙️ Yêu cầu hệ thống

- Node.js 18+
- npm 9+
- Docker & Docker Compose (tùy chọn)

---

## 🚀 Cách chạy dự án

### 💻 Chạy local (không Docker)

```bash
npm run setup     # copy .env.example -> .env.local và npm install
npm run dev       # Next dev server trên :5173
```

👉 Truy cập: http://localhost:5173

### 🧪 Development qua Docker (Hot Reload)

```bash
# từ repo root
docker compose -f docker-compose.dev.yml up --build
```

👉 Truy cập: http://localhost:5173

### 🚀 Production qua Docker

```bash
# từ repo root
docker compose -f docker-compose.prod.yml up --build
```

👉 Truy cập: http://localhost:3000

Image production dùng `output: 'standalone'` (chạy `node server.js`, thay cho nginx static serve trước đây).

---

## 🧪 Testing & Lint

```bash
npm test                                # vitest run (toàn bộ)
npm run test:watch                      # vitest watch mode
npx vitest run utils/format.test.ts     # chạy 1 file test
npm run lint                            # next lint (ESLint)
```

---

## 🔗 Kết nối Backend

Frontend dùng các biến môi trường (file `.env.local`, xem `.env.example`):

```env
# URL backend mà trình duyệt gọi (dev gọi trực tiếp backend)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Origin mà Next server proxy các lời gọi same-origin /v1 (tên service trong Docker)
BACKEND_URL=http://backend:8080

FRONTEND_PORT_DEV=5173
FRONTEND_PORT_PROD=3000
```

### 📌 Lưu ý

- **Dev:** trình duyệt gọi thẳng backend qua `NEXT_PUBLIC_API_BASE_URL`.
- **Prod:** để `NEXT_PUBLIC_API_BASE_URL` trống và dựa vào rewrite same-origin `/v1/*` → `BACKEND_URL` (xem `next.config.mjs`), hoặc override runtime qua `public/config.js` (`window.__APP_CONFIG__.apiBaseUrl`).
- **Không hardcode** URL backend trong code — luôn đi qua biến môi trường / runtime config.

---

## 🛠️ Công nghệ sử dụng

- Next.js 14 (App Router)
- React 18 + TypeScript
- TailwindCSS
- Axios
- Vitest + Testing Library
- Docker

---

## 🎯 Tính năng chính

- 🎟️ Hiển thị, tìm kiếm & lọc sự kiện
- 🪑 Chọn ghế & đặt vé
- 💳 Thanh toán (mock gateway)
- 📱 Quản lý vé (QR), thông báo, feedback
- 🛠️ Trang quản trị + analytics
- 📱 Responsive UI

---

## 🧠 Best Practices

- Tách logic API vào `services/` — không gọi axios trực tiếp trong UI.
- Tái sử dụng component trong `components/`.
- Dùng `store/AuthContext.tsx` cho auth state, gate route bằng `RequireAuth` / `RequireRole`.
- Xử lý loading & error state; tránh gọi API thừa.

---

## 📌 Ghi chú

- Không commit `.env.local`; dùng `.env.example` để hướng dẫn team.
- Luôn dùng biến môi trường cho API URL.

---

## 📞 Liên hệ

Nếu có vấn đề, vui lòng tạo issue hoặc liên hệ team phát triển.
