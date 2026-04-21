# 🎟️ Event Ticketing System - Backend

## 📌 Giới thiệu

Đây là backend cho hệ thống **Quản lý sự kiện & bán vé trực tuyến**, được xây dựng bằng:

* **Spring Boot**
* **Maven**
* **MySQL**
* **Docker**

Hệ thống phục vụ các nhu cầu:

* Quản lý sự kiện
* Bán vé online
* Tạo & xác thực QR code
* Báo cáo doanh thu
* Hỗ trợ scale lên đến **10.000 users đồng thời (mô phỏng)**

---

## 🏗️ Kiến trúc hệ thống

Backend được thiết kế theo mô hình **Monolithic (Layered Architecture)**:

```
controller → service → repository → database
```

### 📂 Cấu trúc thư mục

```
src/
 ├── main/
 │   ├── java/com/dede/ticketing/
 │   │   ├── controller/     # API endpoints (REST)
 │   │   ├── service/        # Business logic
 │   │   ├── repository/     # Data access (JPA)
 │   │   ├── domain/         # Entity (Database models)
 │   │   ├── dto/            # Data Transfer Objects
 │   │   ├── config/         # Configurations (Security, CORS, etc.)
 │   │   ├── security/       # Authentication & Authorization
 │   │   ├── exception/      # Exception handling
 │   │   └── util/           # Utility classes
 │   │
 │   └── resources/
 │       ├── application.yml
 │       └── ...
 │
 └── test/
```

---

## ⚙️ Yêu cầu hệ thống

* Java 17+
* Maven 3.9+
* Docker & Docker Compose
* MySQL 8

---

## 🚀 Cách chạy dự án

---

### 🧪 1. Chạy ở chế độ Development (Hot Reload)

```bash
docker-compose -f docker-compose.dev.yml up
```

✅ Tính năng:

* Hot reload (tự động reload khi sửa code)
* Mount source code vào container
* Không cần build lại image

---

### 🚀 2. Chạy ở chế độ Production

#### Build project

```bash
mvn clean package
```

#### Run bằng Docker

```bash
docker-compose up --build
```

---

## 🌐 API Endpoint

| Method | Endpoint     | Mô tả                 |
| ------ | ------------ | --------------------- |
| GET    | /api/events  | Lấy danh sách sự kiện |
| POST   | /api/events  | Tạo sự kiện           |
| POST   | /api/tickets | Đặt vé                |
| POST   | /api/payment | Thanh toán            |
| GET    | /api/reports | Báo cáo               |

*(Sẽ cập nhật thêm trong quá trình phát triển)*

---

## 🛠️ Công nghệ sử dụng

* Spring Boot (Web, JPA, Security)
* MySQL
* Docker
* Maven
* Lombok

---

## 🔥 Tính năng chính

* 🎫 Quản lý sự kiện & vé
* 💳 Thanh toán online (giả lập)
* 🔐 QR Code chống vé giả
* 📊 Báo cáo doanh thu
* ⚡ Tối ưu hiệu năng (hướng tới 10k concurrent users)
* 🔄 Retry khi thanh toán thất bại

---

## ⚠️ Các vấn đề cần xử lý (Important)

* Chống **double booking**
* Chống **bot mua vé**
* Đảm bảo **không trùng QR code**
* Xử lý **quá tải giờ mở bán**

---

## 🧠 Hướng phát triển tiếp

* Redis (lock ghế)
* Queue (Kafka/RabbitMQ)
* Rate limiting
* Caching
* Microservices (future)

---

## 👨‍💻 Team & Phát triển

* Phương pháp: **Scrum**
* Mô hình: **Iterative / Incremental**
* Timeline: 5 tháng

---

## 📌 Ghi chú

* Không commit file `.env` hoặc config chứa mật khẩu thật
* Sử dụng `application-dev.yml` cho môi trường local
* Sử dụng `application-prod.yml` cho production

---

## 📞 Liên hệ

Nếu có vấn đề, vui lòng tạo issue hoặc liên hệ team phát triển.

