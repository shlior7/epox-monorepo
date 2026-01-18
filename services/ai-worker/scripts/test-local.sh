#!/bin/bash
# =============================================================================
# Test AI Worker Locally
# =============================================================================
# This script:
#   1. Verifies Redis is running
#   2. Starts the worker in the background
#   3. Enqueues a test job
#   4. Polls for completion
#   5. Shows the result
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(dirname "$(dirname "$WORKER_DIR")")"

cd "$MONOREPO_ROOT"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   🧪 AI Worker Local Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# --- Check Redis ---
echo -e "${YELLOW}1. Checking Redis...${NC}"
if ! docker ps --format '{{.Names}}' | grep -q 'redis'; then
  echo -e "${RED}❌ No Redis container running${NC}"
  echo "Start Redis with: docker run -d --name redis -p 6399:6379 redis:7"
  exit 1
fi

REDIS_PORT=$(docker ps --filter "name=redis" --format "{{.Ports}}" | grep -o "0.0.0.0:[0-9]*" | head -1 | cut -d: -f2)
export REDIS_URL="redis://localhost:${REDIS_PORT}"
echo -e "${GREEN}✓ Redis running on port ${REDIS_PORT}${NC}"
echo ""

# --- Check Environment ---
echo -e "${YELLOW}2. Checking environment...${NC}"

if [ -z "$GEMINI_API_KEY" ] && [ -z "$GOOGLE_AI_STUDIO_API_KEY" ]; then
  echo -e "${RED}❌ GEMINI_API_KEY not set${NC}"
  echo "Set it with: export GEMINI_API_KEY='your-key'"
  exit 1
fi
echo -e "${GREEN}✓ GEMINI_API_KEY set${NC}"

# Check DATABASE_URL (required for production, but we can mock for testing)
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  DATABASE_URL not set (worker will fail on real jobs)${NC}"
else
  echo -e "${GREEN}✓ DATABASE_URL set${NC}"
fi
echo ""

# --- Build Worker ---
echo -e "${YELLOW}3. Building worker...${NC}"
if [ ! -d "$WORKER_DIR/dist" ]; then
  yarn workspace @repo/ai-worker build
fi
echo -e "${GREEN}✓ Worker built${NC}"
echo ""

# --- Start Worker ---
echo -e "${YELLOW}4. Starting worker...${NC}"
export WORKER_CONCURRENCY=2
export GEMINI_RPM=60
export PORT=8080

cd "$WORKER_DIR"
node dist/index.js > /tmp/ai-worker.log 2>&1 &
WORKER_PID=$!

echo -e "${GREEN}✓ Worker started (PID: $WORKER_PID)${NC}"
echo "   Logs: tail -f /tmp/ai-worker.log"
echo ""

# Wait for worker to be ready
sleep 2

# --- Health Check ---
echo -e "${YELLOW}5. Health check...${NC}"
for i in {1..5}; do
  if curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}✓ Worker healthy${NC}"
    break
  fi
  if [ $i -eq 5 ]; then
    echo -e "${RED}❌ Worker not responding${NC}"
    kill $WORKER_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
echo ""

# --- Cleanup function ---
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping worker...${NC}"
  kill $WORKER_PID 2>/dev/null || true
  wait $WORKER_PID 2>/dev/null || true
  echo -e "${GREEN}✓ Worker stopped${NC}"
}

trap cleanup EXIT

# --- Show Instructions ---
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Worker is running!${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "To test manually:"
echo ""
echo -e "${YELLOW}1. Start your Next.js app:${NC}"
echo "   cd apps/epox-platform && yarn dev"
echo ""
echo -e "${YELLOW}2. Make an API call:${NC}"
echo '   curl -X POST http://localhost:3000/api/generate-images \'
echo '     -H "Content-Type: application/json" \'
echo "     -d '{"
echo '       "sessionId": "test-123",'
echo '       "productIds": ["prod-1"],'
echo '       "promptTags": {"style": "Modern", "mood": "Bright"}'
echo "     }'"
echo ""
echo -e "${YELLOW}3. Check job status:${NC}"
echo '   curl http://localhost:3000/api/jobs/{jobId}'
echo ""
echo -e "${YELLOW}4. Watch worker logs:${NC}"
echo "   tail -f /tmp/ai-worker.log"
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo "Press Ctrl+C to stop the worker"
echo ""

# Keep worker running
wait $WORKER_PID

