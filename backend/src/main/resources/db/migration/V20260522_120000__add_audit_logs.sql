CREATE TABLE audit_logs (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NULL,
  action      VARCHAR(64)  NOT NULL,
  entity      VARCHAR(64)  NOT NULL,
  entity_id   BIGINT       NULL,
  metadata    JSON         NULL,
  trace_id    VARCHAR(64)  NULL,
  created_at  DATETIME(6)  NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_audit_user    (user_id),
  KEY idx_audit_entity  (entity, entity_id),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
