-- Phase 2 of slice B: drop the legacy denormalized column.
-- Runs after V20260524_100000 has deployed and baked.

ALTER TABLE events DROP COLUMN category;
