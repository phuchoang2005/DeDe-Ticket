CREATE TABLE event_categories (
  id    BIGINT       NOT NULL AUTO_INCREMENT,
  name  VARCHAR(64)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE event_category_map (
  event_id    BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  PRIMARY KEY (event_id, category_id),
  CONSTRAINT fk_ecm_event    FOREIGN KEY (event_id)    REFERENCES events(id),
  CONSTRAINT fk_ecm_category FOREIGN KEY (category_id) REFERENCES event_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO event_categories (name)
SELECT DISTINCT category FROM events WHERE category IS NOT NULL AND category <> '';

INSERT INTO event_category_map (event_id, category_id)
SELECT e.id, c.id FROM events e
JOIN event_categories c ON c.name = e.category
WHERE e.category IS NOT NULL AND e.category <> '';

-- Bundled with slice B per §12: events.created_by FK
ALTER TABLE events
  ADD COLUMN created_by BIGINT NULL AFTER status,
  ADD CONSTRAINT fk_events_creator FOREIGN KEY (created_by) REFERENCES users(id);

-- Best-effort backfill: assign to the first ADMIN user if one exists; otherwise leave NULL.
UPDATE events e
JOIN (
  SELECT u.id FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r       ON r.id = ur.role_id AND r.name = 'ADMIN'
  ORDER BY u.id ASC LIMIT 1
) admin_pick ON 1=1
SET e.created_by = admin_pick.id
WHERE e.created_by IS NULL;
