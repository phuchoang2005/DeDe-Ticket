-- Slice C, Phase 1: introduce the VENUES → SECTIONS → SEATS catalog and
-- backfill event_seats.seat_id from the live denormalized rows.
--
-- Per ADR-0005 forward-only. Phase 2 (drop legacy columns) is a separate
-- migration filed only after this slice has baked.

CREATE TABLE venues (
  id      BIGINT       NOT NULL AUTO_INCREMENT,
  name    VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_venue_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sections (
  id        BIGINT      NOT NULL AUTO_INCREMENT,
  venue_id  BIGINT      NOT NULL,
  name      VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_section_venue_name (venue_id, name),
  CONSTRAINT fk_section_venue FOREIGN KEY (venue_id) REFERENCES venues(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seats (
  id           BIGINT     NOT NULL AUTO_INCREMENT,
  section_id   BIGINT     NOT NULL,
  row_label    VARCHAR(8) NOT NULL,
  seat_number  VARCHAR(8) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_seat_section_row_num (section_id, row_label, seat_number),
  CONSTRAINT fk_seat_section FOREIGN KEY (section_id) REFERENCES sections(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE event_seats
  ADD COLUMN seat_id BIGINT NULL AFTER event_id,
  ADD CONSTRAINT fk_event_seats_seat FOREIGN KEY (seat_id) REFERENCES seats(id);

-- Placeholder venue for events missing a `location` value. Keeps the backfill
-- total — every event_seat lands somewhere so the final NOT NULL alter succeeds.
INSERT IGNORE INTO venues (name) VALUES ('__UNKNOWN__');

-- 1. venues — one per distinct event.location (non-null)
INSERT IGNORE INTO venues (name)
SELECT DISTINCT location FROM events WHERE location IS NOT NULL AND location <> '';

-- 2. sections — one per (effective venue, section) used by any event_seat
INSERT IGNORE INTO sections (venue_id, name)
SELECT DISTINCT v.id, COALESCE(NULLIF(es.section, ''), '__DEFAULT__')
FROM event_seats es
JOIN events e ON e.id = es.event_id
JOIN venues v ON v.name = COALESCE(NULLIF(e.location, ''), '__UNKNOWN__');

-- 3. seats — one per (section, row, seat)
INSERT IGNORE INTO seats (section_id, row_label, seat_number)
SELECT DISTINCT s.id, COALESCE(NULLIF(es.row_label, ''), '_'), COALESCE(NULLIF(es.seat_number, ''), '_')
FROM event_seats es
JOIN events e   ON e.id = es.event_id
JOIN venues v   ON v.name = COALESCE(NULLIF(e.location, ''), '__UNKNOWN__')
JOIN sections s ON s.venue_id = v.id
              AND s.name      = COALESCE(NULLIF(es.section, ''), '__DEFAULT__');

-- 4. backfill event_seats.seat_id
UPDATE event_seats es
JOIN events e   ON e.id = es.event_id
JOIN venues v   ON v.name = COALESCE(NULLIF(e.location, ''), '__UNKNOWN__')
JOIN sections s ON s.venue_id = v.id
              AND s.name      = COALESCE(NULLIF(es.section, ''), '__DEFAULT__')
JOIN seats st   ON st.section_id = s.id
              AND st.row_label   = COALESCE(NULLIF(es.row_label, ''), '_')
              AND st.seat_number = COALESCE(NULLIF(es.seat_number, ''), '_')
SET es.seat_id = st.id
WHERE es.seat_id IS NULL;

-- 5. make NOT NULL after verification
ALTER TABLE event_seats MODIFY seat_id BIGINT NOT NULL;
