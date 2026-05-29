#!/usr/bin/env bash
# tests/smoke/main.sh — happy-path smoke for the live `demo` deployment.
#
# Assertions land here (not in scratch) per docs/engineering/database/migration-to-normalized.md §11.
# Each slice updates this script in the same PR that ships the breaking change.
#
# Usage:
#   BASE_URL=http://localhost:8080 ./tests/smoke/main.sh
#
# Exit code: 0 = all assertions pass, 1 = any assertion fails.

set -u
BASE_URL="${BASE_URL:-http://localhost:8080}"
DEMO_EMAIL="${DEMO_EMAIL:-demo@dede.test}"
DEMO_PASS="${DEMO_PASS:-demo1234}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dede.test}"
ADMIN_PASS="${ADMIN_PASS:-admin1234}"
SCANNER_EMAIL="${SCANNER_EMAIL:-scanner@dede.test}"
SCANNER_PASS="${SCANNER_PASS:-scan1234}"

PASS=0
FAIL=0
trap '[[ $FAIL -gt 0 ]] && echo "FAIL: $FAIL" && exit 1 || echo "PASS: $PASS"; exit 0' EXIT

red()    { printf "\033[31m%s\033[0m\n" "$*" ; }
green()  { printf "\033[32m%s\033[0m\n" "$*" ; }

assert() {
  local label="$1"; shift
  if "$@"; then
    PASS=$((PASS+1)); green "  ok   $label"
  else
    FAIL=$((FAIL+1)); red   "  FAIL $label"
  fi
}

# tiny helpers (require curl + jq)
jq_get() { jq -r "$1" <<<"$2"; }

login() {
  local email="$1" pass="$2"
  curl -fsS "${BASE_URL}/v1/auth/login" \
       -H 'Content-Type: application/json' \
       -d "{\"email\":\"${email}\",\"password\":\"${pass}\"}"
}

echo "== auth =="
DEMO_RESP=$(login "$DEMO_EMAIL" "$DEMO_PASS" || true)
ADMIN_RESP=$(login "$ADMIN_EMAIL" "$ADMIN_PASS" || true)
SCANNER_RESP=$(login "$SCANNER_EMAIL" "$SCANNER_PASS" || true)
DEMO_TOKEN=$(jq_get '.token' "$DEMO_RESP")
ADMIN_TOKEN=$(jq_get '.token' "$ADMIN_RESP")
SCANNER_TOKEN=$(jq_get '.token' "$SCANNER_RESP")

# Slice A assertion: login payload now has roles[] instead of role
assert "login returns roles array (slice A)" \
       test "$(jq_get '.user.roles | type' "$DEMO_RESP")" = "array"

USER_HAS_ROLE=$(jq -r '.user.roles | index("USER") // "absent"' <<<"$DEMO_RESP")
assert "login roles contains USER (slice A)" \
       test "$USER_HAS_ROLE" != "absent"

# Scanner demo account is seeded with the SCANNER role (scan feature)
SCANNER_HAS_ROLE=$(jq -r '.user.roles | index("SCANNER") // "absent"' <<<"$SCANNER_RESP")
assert "scanner demo account has SCANNER role (scan feature)" \
       test "$SCANNER_HAS_ROLE" != "absent"

echo "== events browse =="
LIST=$(curl -fsS "${BASE_URL}/v1/events?limit=5")
FIRST_ID=$(jq_get '.data[0].id' "$LIST")

# Slice B assertion: each event has categories[] (was: single category string)
assert "events list returns categories[] (slice B)" \
       test "$(jq_get '.data[0].categories | type' "$LIST")" = "array"

# Slice C assertion: event detail seat-map shape is stable (row/seat/section still present)
SEATS=$(curl -fsS "${BASE_URL}/v1/events/${FIRST_ID}/seats")
assert "seat map keeps rowLabel/seatNumber/section (slice C)" \
       test -n "$(jq_get '.seats[0].rowLabel' "$SEATS")"

echo "== check-in (slice F) =="
# pick an AVAILABLE seat for the smoke order
AVAIL_SEAT=$(jq -r '[.seats[] | select(.status=="AVAILABLE")][0].id // empty' <<<"$SEATS")
if [[ -z "$AVAIL_SEAT" ]]; then
  red "  no AVAILABLE seats for event ${FIRST_ID}; skipping order+scan path"
fi
ORDER_BODY="{\"eventId\":${FIRST_ID},\"seatIds\":[${AVAIL_SEAT:-0}]}"
ORDER=$(curl -fsS -X POST "${BASE_URL}/v1/orders" \
             -H "Authorization: Bearer ${DEMO_TOKEN}" \
             -H 'Content-Type: application/json' \
             -H "Idempotency-Key: smoke-$(date +%s)-$$" \
             -d "${ORDER_BODY}" 2>/dev/null || true)
ORDER_ID=$(jq_get '.id' "$ORDER")
if [[ -n "$ORDER_ID" && "$ORDER_ID" != "null" ]]; then
  curl -fsS -X POST "${BASE_URL}/v1/orders/${ORDER_ID}/pay" \
       -H "Authorization: Bearer ${DEMO_TOKEN}" \
       -H 'Content-Type: application/json' \
       -H "Idempotency-Key: smoke-pay-$(date +%s)" \
       -d '{"method":"MOMO"}' > /dev/null || true

  TICKETS=$(curl -fsS "${BASE_URL}/v1/tickets" -H "Authorization: Bearer ${DEMO_TOKEN}")
  QR=$(jq -r '.[0].qrCode' <<<"$TICKETS")
  SMOKE_DEVICE="smoke-device-$$"

  # 1st scan with admin → 200; deviceId is recorded on check_ins for forensics
  SCAN1=$(curl -fsS -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/v1/tickets/scan" \
               -H "Authorization: Bearer ${ADMIN_TOKEN}" \
               -H 'Content-Type: application/json' \
               -d "{\"qrCode\":\"${QR}\",\"deviceId\":\"${SMOKE_DEVICE}\"}" || true)
  assert "POST /v1/tickets/scan → 200 first time (slice F)" \
         test "$SCAN1" = "200"

  # 2nd scan → 409 ALREADY_USED
  SCAN2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/v1/tickets/scan" \
               -H "Authorization: Bearer ${ADMIN_TOKEN}" \
               -H 'Content-Type: application/json' \
               -d "{\"qrCode\":\"${QR}\"}" || true)
  assert "POST /v1/tickets/scan → 409 duplicate (slice F)" \
         test "$SCAN2" = "409"

  # SCANNER role is authorized on the scan endpoint: reusing the now-USED QR
  # yields 409 (authorized but already used), never 403 (would mean denied).
  SCAN_SCANNER=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/v1/tickets/scan" \
               -H "Authorization: Bearer ${SCANNER_TOKEN}" \
               -H 'Content-Type: application/json' \
               -d "{\"qrCode\":\"${QR}\"}" || true)
  assert "POST /v1/tickets/scan authorizes SCANNER role (not 403) (scan feature)" \
         test "$SCAN_SCANNER" = "409"

  # Admin has full-history access: sees the admin scan with its scanner + device id
  SCANS=$(curl -fsS "${BASE_URL}/v1/tickets/scans?limit=50" \
               -H "Authorization: Bearer ${ADMIN_TOKEN}" || true)
  assert "GET /v1/tickets/scans returns array (scan feature)" \
         test "$(jq -r 'type' <<<"$SCANS")" = "array"
  assert "GET /v1/tickets/scans (admin) records the smoke deviceId (scan feature)" \
         test "$(jq -r --arg d "$SMOKE_DEVICE" 'map(select(.deviceId==$d)) | length' <<<"$SCANS")" -ge 1
  assert "GET /v1/tickets/scans rows expose scannedByEmail (scan feature)" \
         test -n "$(jq -r '.[0].scannedByEmail // empty' <<<"$SCANS")"

  # Scope: a SCANNER only sees their own check-ins (never the admin's scan above).
  SCANS_SCANNER=$(curl -fsS "${BASE_URL}/v1/tickets/scans?limit=50" \
               -H "Authorization: Bearer ${SCANNER_TOKEN}" || true)
  assert "GET /v1/tickets/scans scopes SCANNER to own rows (scan feature)" \
         test "$(jq -r --arg e "$SCANNER_EMAIL" 'map(select(.scannedByEmail!=$e)) | length' <<<"$SCANS_SCANNER")" = "0"

  # A normal USER must not read the history surface → 403
  SCANS_FORBIDDEN=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/v1/tickets/scans" \
               -H "Authorization: Bearer ${DEMO_TOKEN}" || true)
  assert "GET /v1/tickets/scans denies USER role → 403 (scan feature)" \
         test "$SCANS_FORBIDDEN" = "403"
fi

echo "== audit (slice G) =="
AUDIT=$(curl -fsS "${BASE_URL}/v1/admin/audit?entity=orders&size=5" \
             -H "Authorization: Bearer ${ADMIN_TOKEN}" || true)
assert "GET /v1/admin/audit returns at least one ORDER_* row (slice G)" \
       test "$(jq -r 'length // 0' <<<"$AUDIT")" -ge 1

echo "== categories (slice B) =="
CATS=$(curl -fsS "${BASE_URL}/v1/admin/categories" \
            -H "Authorization: Bearer ${ADMIN_TOKEN}" || true)
assert "GET /v1/admin/categories returns array (slice B)" \
       test "$(jq -r 'type' <<<"$CATS")" = "array"

echo "== venues (slice C) =="
VENUES=$(curl -fsS "${BASE_URL}/v1/admin/venues" \
              -H "Authorization: Bearer ${ADMIN_TOKEN}" || true)
assert "GET /v1/admin/venues returns array (slice C)" \
       test "$(jq -r 'type' <<<"$VENUES")" = "array"

echo "== ticket-types (slice D) =="
TT=$(curl -fsS "${BASE_URL}/v1/admin/events/${FIRST_ID}/ticket-types" \
          -H "Authorization: Bearer ${ADMIN_TOKEN}" || true)
assert "GET /v1/admin/events/{id}/ticket-types returns array (slice D)" \
       test "$(jq -r 'type' <<<"$TT")" = "array"
