# 🎟️ Event Ticketing System - Backend

## 📌 Giới thiệu

Đây là backend cho hệ thống **Quản lý sự kiện & bán vé trực tuyến** (Dề Dê), được xây dựng bằng:

- **Spring Boot 3.2** (Java 21)
- **Maven**
- **MySQL 8** (Flyway migrations)
- **Redis 7** (cache / rate-limit / idempotency — chạy ở profile prod)
- **Docker**

Hệ thống phục vụ các nhu cầu:

- Quản lý sự kiện, venue, ghế, loại vé
- Bán vé online + thanh toán (mock gateway có retry)
- Tạo & xác thực QR code, check-in tại cổng
- Feedback, thông báo, audit log, báo cáo & analytics
- Hỗ trợ scale lên đến **10.000 users đồng thời (mô phỏng)** — chống double-booking & trùng QR

---

## 🏗️ Kiến trúc hệ thống

Backend là **monolith phân lớp (Layered Architecture)** dưới package `com.odoomaster.ticketing`:

```
controller → service → repository (Spring Data JPA) → MySQL
```

DTO (`dto/`) đi qua ranh giới controller; entity (`domain/`) không rời khỏi service layer.

### 📂 Cấu trúc thư mục

```
src/
 ├── main/
 │   ├── java/com/odoomaster/ticketing/
 │   │   ├── controller/     # REST endpoints (/v1)
 │   │   ├── service/        # Business logic (OrderService, seat locking, ...)
 │   │   ├── repository/     # Spring Data JPA
 │   │   ├── domain/         # Entity (DB models)
 │   │   ├── dto/            # Data Transfer Objects (records, *Dtos.java)
 │   │   ├── config/         # Cấu hình (SecurityConfig, CacheConfig, ...)
 │   │   ├── security/       # JWT filter & service, authorization
 │   │   ├── exception/      # AppException + domain errors
 │   │   ├── web/            # ApiErrorEnvelope, GlobalExceptionHandler, TraceIdFilter
 │   │   ├── audit/          # @Auditable + AuditAspect (AOP audit_logs)
 │   │   ├── event/          # Domain events
 │   │   ├── notification/   # Notification dispatch
 │   │   └── jobs/           # @Scheduled jobs (SeatLockSweeperJob, ...)
 │   │
 │   └── resources/
 │       ├── application.yml
 │       ├── application-dev-example.yml   # copy -> application-dev.yml
 │       ├── application-prod-example.yml  # copy -> application-prod.yml
 │       └── db/migration/                 # Flyway: V<yyyyMMdd>_<HHmmss>__desc.sql
 │
 └── test/
```

---

## ⚙️ Yêu cầu hệ thống

- Java 21
- Maven 3.9+
- Docker & Docker Compose
- MySQL 8 (và Redis 7 cho prod)

---

## 🚀 Cách chạy dự án

> Trước khi chạy local ngoài Docker, tạo file config theo profile:
>
> ```bash
> cp src/main/resources/application-dev-example.yml  src/main/resources/application-dev.yml
> cp src/main/resources/application-prod-example.yml src/main/resources/application-prod.yml
> ```

### 🧪 1. Development qua Docker (Hot Reload)

```bash
# từ repo root
docker compose -f docker-compose.dev.yml up --build
```

✅ MySQL + backend (hot reload). Backend: http://localhost:8080

### 🚀 2. Build & Production

```bash
mvn clean package                       # build fat jar (target/ticketing.jar); chạy test

# từ repo root
docker compose -f docker-compose.prod.yml up --build   # thêm Redis, profile prod
```

### 🧪 Testing

```bash
mvn test                                              # toàn bộ test
mvn test -Dtest=OrderServiceReliabilityTest           # 1 class
mvn test -Dtest=ReliabilityMatrixTest#methodName      # 1 method
```

---

## 🌐 API

Tất cả route nằm dưới prefix **`/v1`**. Lỗi trả về theo error envelope thống nhất:
`{ "error": { code, message, details, traceId } }`.

| Nhóm | Ví dụ endpoint | Mô tả |
| ------ | ------------ | --------------------- |
| Auth | `POST /v1/auth/login`, `POST /v1/auth/register` | Đăng nhập / đăng ký (JWT) |
| Events | `GET /v1/events`, `GET /v1/events/{id}` | Danh sách & chi tiết sự kiện (public) |
| Orders | `POST /v1/orders` | Đặt vé (giữ ghế, lock 10 phút) |
| Tickets | `GET /v1/tickets`, check-in | Vé cá nhân, QR, check-in |
| Feedback | `/v1/feedback` | Feedback sự kiện |
| Notifications | `/v1/notifications` | Thông báo người dùng |
| Health | `GET /v1/health` | Health check (public) |
| Admin | `/v1/admin/**` | Quản trị (yêu cầu role `ADMIN`/`ORGANIZER`): events, venues, categories, ticket-types, feedback, audit, analytics |

> Hợp đồng API chi tiết: xem `docs/api/openapi.yaml` và `docs/api/conventions.md`.

### 🔐 Auth & Authorization

- JWT stateless: `JwtAuthenticationFilter` xác thực `Authorization: Bearer`, `JwtService` phát/verify token (secret từ `APP_JWT_SECRET`, ≥32 ký tự).
- `SecurityConfig`: public `/v1/auth/**`, `/v1/health`, `GET /v1/events/**`; `/v1/admin/**` cần `ADMIN`/`ORGANIZER`; còn lại cần đăng nhập.
- Role là quan hệ many-to-many (`roles`/`user_roles`), seed thành authority `ROLE_*`. `@PreAuthorize` cũng khả dụng.

---

## 🧩 Cross-cutting concerns

- **Tracing:** `TraceIdFilter` gắn request id (header `X-Request-Id`, MDC `traceId`).
- **Audit:** `@Auditable(action, entity)` + `AuditAspect` (AOP) ghi `audit_logs`.
- **Concurrency:** ghế trong `event_seats` (status + `locked_by`/`locked_until`). `OrderService` giữ ghế bằng DB lock 10 phút trong `@Transactional`; `SeatLockSweeperJob` (30s/lần) giải phóng lock hết hạn & evict cache.
- **Caching (Redis, prod):** `events:list` (30s), `events:detail` (30s), `events:seats` (5s) qua `@Cacheable`/`@CacheEvict`.

---

## 🗄️ Database & Migrations

- **Flyway** sở hữu schema — migration trong `src/main/resources/db/migration/`, đặt tên `V<yyyyMMdd>_<HHmmss>__desc.sql`. Thêm migration mới cho mọi thay đổi schema; **không sửa migration đã apply**.
- Prod: `ddl-auto: validate`; Dev: `ddl-auto: update`.
- `DataSeeder` seed sự kiện demo & admin mặc định: `admin@dede.test` / `admin1234`.

---

## 🛠️ Công nghệ sử dụng

- Spring Boot (Web, Data JPA, Security, AOP, Cache, Scheduling)
- MySQL 8 + Flyway
- Redis 7
- Maven, Lombok
- Docker

---

## 📌 Ghi chú

- Không commit `.env`, `application-dev.yml`, `application-prod.yml` (chứa secret) — chỉ commit các file `*-example`.
- Mọi thay đổi liên quan ordering / seat status / lock TTL là **concurrency-critical** — giữ nguyên đảm bảo transactional + cache-eviction.

---

## 📞 Liên hệ

Nếu có vấn đề, vui lòng tạo issue hoặc liên hệ team phát triển.
