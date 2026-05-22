**Note** Install `bierner.markdown-mermaid` required

- Tách rõ **User / Role / Permission**
- Event + Ticket + Seat mapping
- Order + Payment + Retry
- QR + Check-in + Anti-fraud
- Logging + Reporting foundation
- Có khả năng mở rộng (AI, CRM sau này)

---

## 🧩 Database Schema (Mermaid ERD)

```mermaid
erDiagram

    USERS {
        bigint id PK
        string email
        string password_hash
        string full_name
        string phone
        string status
        timestamp created_at
        timestamp updated_at
    }

    ROLES {
        bigint id PK
        string name
    }

    USER_ROLES {
        bigint user_id FK
        bigint role_id FK
    }

    EVENT_CATEGORIES {
        bigint id PK
        string name
    }

    EVENTS {
        bigint id PK
        string title
        string description
        string location
        datetime start_time
        datetime end_time
        string status
        bigint created_by FK
        timestamp created_at
    }

    EVENT_CATEGORY_MAP {
        bigint event_id FK
        bigint category_id FK
    }

    VENUES {
        bigint id PK
        string name
        string address
    }

    SECTIONS {
        bigint id PK
        bigint venue_id FK
        string name
    }

    SEATS {
        bigint id PK
        bigint section_id FK
        string row_label
        string seat_number
    }

    EVENT_SEATS {
        bigint id PK
        bigint event_id FK
        bigint seat_id FK
        string status
        bigint locked_by FK
        datetime locked_until
        int version
    }

    TICKET_TYPES {
        bigint id PK
        bigint event_id FK
        string name
        decimal price
        int quantity
        int sold_quantity
    }

    ORDERS {
        bigint id PK
        bigint user_id FK
        decimal total_amount
        string status
        timestamp created_at
    }

    ORDER_ITEMS {
        bigint id PK
        bigint order_id FK
        bigint ticket_type_id FK
        bigint event_seat_id FK
        decimal price
    }

    PAYMENTS {
        bigint id PK
        bigint order_id FK
        string provider
        string transaction_id
        decimal amount
        string status
        int retry_count
        timestamp created_at
    }

    PAYMENT_RETRIES {
        bigint id PK
        bigint payment_id FK
        string status
        timestamp attempted_at
    }

    TICKETS {
        bigint id PK
        bigint order_item_id FK
        string qr_code
        string status
    }

    CHECK_INS {
        bigint id PK
        bigint ticket_id FK
        bigint checked_in_by FK
        timestamp checked_in_at
        string status
    }

    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        string type
        string content
        string status
        timestamp sent_at
    }

    AUDIT_LOGS {
        bigint id PK
        bigint user_id FK
        string action
        string entity
        string metadata
        timestamp created_at
    }

    FEEDBACKS {
        bigint id PK
        bigint user_id FK
        bigint event_id FK
        string category
        string subject
        string body
        int rating
        string status
        timestamp created_at
        timestamp resolved_at
        string admin_note
    }

    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned

    USERS ||--o{ EVENTS : creates

    EVENTS ||--o{ EVENT_CATEGORY_MAP : categorized
    EVENT_CATEGORIES ||--o{ EVENT_CATEGORY_MAP : includes

    VENUES ||--o{ SECTIONS : contains
    SECTIONS ||--o{ SEATS : contains

    EVENTS ||--o{ EVENT_SEATS : uses
    SEATS ||--o{ EVENT_SEATS : mapped
    USERS ||--o{ EVENT_SEATS : locks

    EVENTS ||--o{ TICKET_TYPES : has

    USERS ||--o{ ORDERS : places
    ORDERS ||--o{ ORDER_ITEMS : contains

    TICKET_TYPES ||--o{ ORDER_ITEMS : referenced
    EVENT_SEATS ||--o{ ORDER_ITEMS : assigned

    ORDERS ||--o{ PAYMENTS : has
    PAYMENTS ||--o{ PAYMENT_RETRIES : retries

    ORDER_ITEMS ||--o{ TICKETS : generates

    TICKETS ||--o{ CHECK_INS : checked
    USERS ||--o{ CHECK_INS : performs

    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : triggers

    USERS  ||--o{ FEEDBACKS : submits
    EVENTS ||--o{ FEEDBACKS : about
```

### 📝 Feedback (live, ITPJ2602)

- `FEEDBACKS` collects user-submitted issues, ratings, and general feedback.
- `category` is free-form short string (e.g. `BUG`, `EVENT`, `OTHER`); `status` tracks triage (`NEW` → `IN_PROGRESS` → `RESOLVED`).
- `event_id` is optional — feedback may be about the app in general.
- Admin replies are stored inline as `admin_note` for the demo (no thread model).


---

## 🧠 Giải thích thiết kế (ngắn gọn nhưng quan trọng)

### 🔐 Authentication & Authorization

- `USERS`, `ROLES`, `USER_ROLES` → hỗ trợ RBAC
- Có thể mở rộng thành permission-level sau

---

### 🎟 Event & Ticket

- `EVENTS` tách riêng với `VENUES`
- `TICKET_TYPES` → vé thường / VIP / Early Bird
- `EVENT_SEATS` → giúp mỗi event có trạng thái seat riêng

---

### 💺 Seat Mapping (đúng chuẩn scalable)

- Venue → Section → Seat
- Mapping lại với event → tránh conflict nhiều event cùng venue

---

### 🛒 Order & Payment (production mindset)

- `ORDERS` + `ORDER_ITEMS`
- `PAYMENTS` + `PAYMENT_RETRIES` → xử lý retry payment
- Cho phép tích hợp:
  - MoMo
  - VNPay

---

### 📱 QR Code & Anti-fraud

- `TICKETS.qr_code UNIQUE`
- `CHECK_INS` → tracking scan
- Có thể detect:
  - Scan nhiều lần
  - Fake QR

---

### 📊 Reporting & Tracking

- `AUDIT_LOGS` → tracking hành vi
- `CHECK_INS` → tỷ lệ attendance
- `ORDERS + PAYMENTS` → revenue

---

### 📬 Notification

- `NOTIFICATIONS` → email / SMS (async sau này)
