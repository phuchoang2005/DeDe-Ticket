CREATE TABLE ticket_types (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  event_id        BIGINT         NOT NULL,
  name            VARCHAR(64)    NOT NULL,
  price           DECIMAL(12,0)  NOT NULL,
  quantity        INT            NOT NULL,
  sold_quantity   INT            NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tickettype_event_name (event_id, name),
  CONSTRAINT fk_tt_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE event_seats
  ADD COLUMN ticket_type_id BIGINT NULL,
  ADD CONSTRAINT fk_es_tt FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id);

ALTER TABLE order_items
  ADD COLUMN ticket_type_id BIGINT NULL,
  ADD CONSTRAINT fk_oi_tt FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id);

-- Backfill: per event, group event_seats by (section, price). Each group → one ticket_type row.
INSERT INTO ticket_types (event_id, name, price, quantity, sold_quantity)
SELECT es.event_id, es.section AS name, es.price, COUNT(*) AS quantity,
       SUM(CASE WHEN es.status = 'SOLD' THEN 1 ELSE 0 END) AS sold_quantity
FROM event_seats es
GROUP BY es.event_id, es.section, es.price;

UPDATE event_seats es
JOIN ticket_types tt
  ON tt.event_id = es.event_id
 AND tt.name     = es.section
 AND tt.price    = es.price
SET es.ticket_type_id = tt.id;

UPDATE order_items oi
JOIN event_seats es ON es.id = oi.event_seat_id
SET oi.ticket_type_id = es.ticket_type_id;
