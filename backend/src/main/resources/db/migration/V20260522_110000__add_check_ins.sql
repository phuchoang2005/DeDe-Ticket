CREATE TABLE check_ins (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  ticket_id        BIGINT       NOT NULL,
  checked_in_by    BIGINT       NOT NULL,
  checked_in_at    DATETIME(6)  NOT NULL,
  status           VARCHAR(20)  NOT NULL,
  device_id        VARCHAR(64)  NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_check_ins_ticket UNIQUE (ticket_id),
  CONSTRAINT fk_checkin_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  CONSTRAINT fk_checkin_user   FOREIGN KEY (checked_in_by) REFERENCES users(id),
  KEY idx_checkin_at (checked_in_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
