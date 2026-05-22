CREATE TABLE payment_retries (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  payment_id      BIGINT       NOT NULL,
  status          VARCHAR(20)  NOT NULL,
  attempt_no      INT          NOT NULL,
  error_code      VARCHAR(64)  NULL,
  attempted_at    DATETIME(6)  NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_retry_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  KEY idx_retry_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
