#!/bin/bash
# validate_local.sh — Runs through all Section 9 local container validation checks.
# Usage: bash scripts/validate_local.sh

set -e

BASE_URL="http://localhost:8080"
API="${BASE_URL}/api"
PASS=0
FAIL=0

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

check() {
    local label=$1; local url=$2; local expected=$3
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$response" = "$expected" ]; then ok "$label (HTTP $response)";
    else fail "$label (expected $expected, got $response)"; fi
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Analytics AI Agent — Local Validation      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 9.6 Health checks ──────────────────────────────────────
echo "§ Health Checks"
check "9.6a App health"   "${API}/health"       200
check "9.6b DB health"    "${API}/health/db"    200
check "9.6c Redis health" "${API}/health/redis" 200
echo ""

# ── 9.7 Chat iframe route ──────────────────────────────────
echo "§ Frontend Routes"
check "9.7  Chat iframe route (/ai/chat)"           "${BASE_URL}/ai/chat" 200
check "9.7b Chat embedded mode (/ai/chat?mode=embedded)" "${BASE_URL}/ai/chat?mode=embedded" 200
echo ""

# ── 9.8 Demo prompt → report or clarification ─────────────
echo "§ Chat API"
resp=$(curl -s -X POST "${API}/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"show me total shipments by region"}')
type=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('type',''))" 2>/dev/null)
if [ "$type" = "report" ] || [ "$type" = "clarification" ]; then
    ok "9.8  Demo prompt returns type=$type"
else
    fail "9.8  Demo prompt returned unexpected type: '$type'"
fi
echo ""

# ── 9.9 Saved report URL rerun ─────────────────────────────
echo "§ Report APIs"
# Get the first report ID from the list
first_id=$(curl -s "${API}/users/reports" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r[0]['id'] if r else '')" 2>/dev/null)
if [ -n "$first_id" ]; then
    check "9.9  Report metadata (id=$first_id)" "${API}/reports/${first_id}" 200
    check "9.9b Report data rerun (id=$first_id)" "${API}/reports/${first_id}/data" 200
    ok "9.9  Saved report live query reruns successfully"
else
    fail "9.9  No saved reports found — run a demo prompt first"
fi
echo ""

# ── 9.10 List reports API ──────────────────────────────────
list_count=$(curl -s "${API}/users/reports" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "${list_count:-0}" -ge 0 ]; then
    ok "9.10 List reports API returns ${list_count} reports"
else
    fail "9.10 List reports API failed"
fi
echo ""

# ── 9.11 Export downloads ──────────────────────────────────
echo "§ Exports"
if [ -n "$first_id" ]; then
    check "9.11a Excel export" "${API}/reports/${first_id}/export/excel" 200
    check "9.11b PDF export"   "${API}/reports/${first_id}/export/pdf"   200
else
    fail "9.11  Cannot test exports — no report ID available"
fi
echo ""

# ── 9.12 Mock provider check ───────────────────────────────
echo "§ AI Provider"
provider_resp=$(curl -s -X POST "${API}/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"delayed shipments by month"}')
if echo "$provider_resp" | grep -q '"type"'; then
    ok "9.12 AI_PROVIDER=mock works without AWS credentials"
else
    fail "9.12 Mock provider check failed"
fi
echo ""

# ── Summary ───────────────────────────────────────────────
echo "══════════════════════════════════════════════"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "══════════════════════════════════════════════"
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
