#!/usr/bin/env bash
# Behavioral tests that need NO external service keys. Run against a local prod
# server (npm run build && npm run start). Uses the .env.local placeholders, so
# ADMIN_PASSWORD / ADMIN_SESSION_SECRET are real enough to exercise admin auth
# end-to-end; Supabase/Stripe/Resend are absent, so those paths are expected to
# fail *gracefully* (5xx), never crash, and never bypass auth.
base="http://localhost:3000"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf "  PASS  %s\n" "$1"; }
no(){ FAIL=$((FAIL+1)); printf "  FAIL  %s\n" "$1"; }
eq(){ if [ "$2" = "$3" ]; then ok "$1 -> $3"; else no "$1 (expected $2, got $3)"; fi; }
ne(){ if [ "$2" != "$3" ]; then ok "$1 -> $3 (not $2)"; else no "$1 (got $2)"; fi; }
C(){ curl -s --max-time 25 -o /dev/null -w "%{http_code}" "$@"; }

curl -s --retry 60 --retry-delay 1 --retry-connrefused -o /dev/null "$base/" || { echo "server never came up"; exit 1; }

echo "Pages:"
eq "GET /" 200 "$(C "$base/")"
eq "GET /admin (login screen)" 200 "$(C "$base/admin")"
eq "GET /success" 200 "$(C "$base/success?session_id=cs_test_123")"

echo "Validation / webhook signature:"
eq "POST /api/checkout invalid photoPath -> 400" 400 "$(C -X POST -H 'content-type: application/json' -d '{"photoPath":"../../etc/passwd"}' "$base/api/checkout")"
eq "POST /api/checkout malformed body -> 400" 400 "$(C -X POST -H 'content-type: application/json' -d 'not json' "$base/api/checkout")"
eq "POST /api/webhook bad signature -> 400" 400 "$(C -X POST -H 'content-type: application/json' -d '{}' "$base/api/webhook")"

echo "Admin auth round-trip (HMAC cookie):"
eq "login wrong password -> 401" 401 "$(C -X POST -H 'content-type: application/json' -d '{"password":"nope"}' "$base/api/admin/login")"
HDRS=$(curl -s --max-time 25 -D - -o /dev/null -X POST -H 'content-type: application/json' -d '{"password":"change-me-to-a-long-random-string"}' "$base/api/admin/login")
LOGIN_CODE=$(printf '%s' "$HDRS" | head -1 | tr -d '\r' | awk '{print $2}')
eq "login correct password -> 200" 200 "$LOGIN_CODE"
COOKIE=$(printf '%s' "$HDRS" | tr -d '\r' | grep -i '^set-cookie:' | sed -E 's/.*(lumora_admin=[^;]*).*/\1/')
SC=$(printf '%s' "$HDRS" | tr -d '\r' | grep -i 'set-cookie')
echo "$SC" | grep -qi 'httponly'     && ok "cookie HttpOnly" || no "cookie HttpOnly"
echo "$SC" | grep -qi 'samesite=lax' && ok "cookie SameSite=Lax" || no "cookie SameSite=Lax"
echo "$SC" | grep -qi 'secure'       && ok "cookie Secure" || no "cookie Secure"

echo "Protected routes:"
eq "fulfill WITHOUT cookie -> 401" 401 "$(C -X POST -H 'content-type: application/json' -d '{"orderId":"x"}' "$base/api/admin/fulfill")"
eq "generate-stl WITHOUT cookie -> 401" 401 "$(C -X POST -H 'content-type: application/json' -d '{"orderId":"x"}' "$base/api/admin/generate-stl")"
eq "fulfill with TAMPERED cookie -> 401" 401 "$(C -X POST -H 'content-type: application/json' -H "Cookie: ${COOKIE}deadbeef" -d '{"orderId":"x"}' "$base/api/admin/fulfill")"
ne "fulfill with VALID cookie (auth passes)" 401 "$(C -X POST -H 'content-type: application/json' -H "Cookie: $COOKIE" -d '{"orderId":"00000000-0000-0000-0000-000000000000"}' "$base/api/admin/fulfill")"
ne "generate-stl with VALID cookie (auth passes)" 401 "$(C -X POST -H 'content-type: application/json' -H "Cookie: $COOKIE" -d '{"orderId":"00000000-0000-0000-0000-000000000000"}' "$base/api/admin/generate-stl")"

echo "Graceful failure (Supabase absent):"
ne "POST /api/upload-url (no crash)" 000 "$(C -X POST "$base/api/upload-url")"

echo "----"
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN" || echo "SOME FAILED"