-- Baseline: live as-built schema from Hibernate ddl-auto=update (snapshot 2026-05-21).
-- 9 tables; no FK constraints (Hibernate did not emit them on update mode).
-- After this migration runs, application-prod.yml switches to ddl-auto=validate.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NULL,
  phone           VARCHAR(50)  NULL,
  role            VARCHAR(20)  NOT NULL,
  status          VARCHAR(20)  NOT NULL,
  created_at      DATETIME(6)  NOT NULL,
  updated_at      DATETIME(6)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  title           VARCHAR(255) NOT NULL,
  description     TEXT         NULL,
  location        VARCHAR(255) NULL,
  category        VARCHAR(32)  NULL,
  organizer       VARCHAR(255) NULL,
  image_url       VARCHAR(500) NULL,
  start_time      DATETIME(6)  NOT NULL,
  end_time        DATETIME(6)  NOT NULL,
  status          VARCHAR(20)  NOT NULL,
  created_at      DATETIME(6)  NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_seats (
  id              BIGINT          NOT NULL AUTO_INCREMENT,
  event_id        BIGINT          NOT NULL,
  row_label       VARCHAR(8)      NOT NULL,
  seat_number     VARCHAR(8)      NOT NULL,
  section         VARCHAR(20)     NOT NULL,
  price           DECIMAL(12,0)   NOT NULL,
  status          VARCHAR(16)     NOT NULL,
  locked_by       BIGINT          NULL,
  locked_until    DATETIME(6)     NULL,
  version         INT             NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_event_seat (event_id, section, row_label, seat_number),
  KEY idx_event_seats_event  (event_id),
  KEY idx_event_seats_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  user_id         BIGINT         NOT NULL,
  event_id        BIGINT         NOT NULL,
  total_amount    DECIMAL(14,0)  NOT NULL,
  status          VARCHAR(20)    NOT NULL,
  payment_method  VARCHAR(20)    NULL,
  created_at      DATETIME(6)    NOT NULL,
  paid_at         DATETIME(6)    NULL,
  PRIMARY KEY (id),
  KEY idx_orders_user   (user_id),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  order_id        BIGINT         NOT NULL,
  event_seat_id   BIGINT         NOT NULL,
  price           DECIMAL(12,0)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order_items_seat (event_seat_id),
  KEY idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  order_id        BIGINT         NOT NULL,
  provider        VARCHAR(20)    NOT NULL,
  transaction_id  VARCHAR(64)    NULL,
  amount          DECIMAL(14,0)  NOT NULL,
  status          VARCHAR(20)    NOT NULL,
  created_at      DATETIME(6)    NOT NULL,
  PRIMARY KEY (id),
  KEY idx_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  order_item_id   BIGINT         NOT NULL,
  user_id         BIGINT         NOT NULL,
  event_id        BIGINT         NOT NULL,
  event_seat_id   BIGINT         NOT NULL,
  qr_code         VARCHAR(64)    NOT NULL,
  status          VARCHAR(20)    NOT NULL,
  issued_at       DATETIME(6)    NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tickets_qr (qr_code),
  KEY idx_tickets_order_item (order_item_id),
  KEY idx_tickets_user       (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  user_id         BIGINT         NOT NULL,
  type            VARCHAR(40)    NOT NULL,
  title           VARCHAR(255)   NOT NULL,
  content         TEXT           NULL,
  channel         VARCHAR(20)    NULL,
  status          VARCHAR(20)    NOT NULL,
  link_url        VARCHAR(500)   NULL,
  sent_at         DATETIME(6)    NULL,
  read_at         DATETIME(6)    NULL,
  created_at      DATETIME(6)    NOT NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user      (user_id),
  KEY idx_notifications_user_read (user_id, read_at),
  KEY idx_notifications_type      (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feedbacks (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  user_id         BIGINT         NOT NULL,
  event_id        BIGINT         NULL,
  category        VARCHAR(32)    NOT NULL,
  subject         VARCHAR(255)   NOT NULL,
  body            TEXT           NOT NULL,
  rating          INT            NULL,
  status          VARCHAR(20)    NOT NULL,
  created_at      DATETIME(6)    NOT NULL,
  resolved_at     DATETIME(6)    NULL,
  admin_note      VARCHAR(1000)  NULL,
  PRIMARY KEY (id),
  KEY idx_feedbacks_user    (user_id),
  KEY idx_feedbacks_status  (status),
  KEY idx_feedbacks_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
