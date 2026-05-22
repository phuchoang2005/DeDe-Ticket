-- Phase 2 of slice A: drop the legacy denormalized column.
-- Runs after phase 1 (V20260523_100000) has deployed and baked in staging.
-- Per ADR-0005 there is no rollback; the companion forward-undo migration
-- (V20260530_100001__undo_drop_users_role.sql) is kept in tree but only
-- applied on incident.

ALTER TABLE users DROP COLUMN role;
