#!/bin/sh
# Starts the PRODUCTION build exactly like Render does and checks it. Run after `pnpm run build:prod`.
# Needs no database, Clerk account or API keys.
set -eu

# Start with the MINIMUM environment on purpose: no database, no Clerk keys, no OpenAI key.
# /api/healthz must still return 200, and both websites must load.
unset DATABASE_URL CLERK_SECRET_KEY CLERK_PUBLISHABLE_KEY OPENAI_API_KEY AI_INTEGRATIONS_OPENAI_API_KEY AI_INTEGRATIONS_OPENAI_BASE_URL TUZAKAI_ADMIN_USER_IDS
export PORT="${PORT:-10000}"          # deliberately not 3000, to prove the server honors PORT
export NODE_ENV=production
export SERVE_STATIC=1
export SESSION_SECRET="${SESSION_SECRET:-verify-session-secret}"   # the only variable the server refuses to start without

node --enable-source-maps artifacts/api-server/dist/index.mjs &
PID=$!
stop_server() {
  set +e
  kill "$PID" 2>/dev/null
  wait "$PID" 2>/dev/null
  echo "Server stopped."
}
trap stop_server EXIT

echo "Waiting for server on port $PORT ..."
code=000
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/healthz" || true)
  [ "$code" = "200" ] && break
  kill -0 $PID 2>/dev/null || { echo "FAIL: server process exited"; exit 1; }
  sleep 1
done
echo "GET /api/healthz -> HTTP $code"
[ "$code" = "200" ] || { echo "FAIL: health check"; exit 1; }

echo "Listening sockets for port $PORT:"
(ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep ":$PORT " || true
if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -E "(0\.0\.0\.0|\*|\[::\]):$PORT " >/dev/null; then
  echo "PASS: listening on all interfaces (0.0.0.0) using PORT=$PORT"
else
  echo "FAIL: not listening on 0.0.0.0"; exit 1
fi

for path in / /tuzakai/; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$path")
  echo "GET $path -> HTTP $c"
  [ "$c" = "200" ] || { echo "FAIL: $path"; exit 1; }
done
echo "ALL CHECKS PASSED"
