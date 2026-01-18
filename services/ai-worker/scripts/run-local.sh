#!/bin/bash
# =============================================================================
# Run AI Worker Locally
# =============================================================================
# Prerequisites:
#   1. Redis running (docker or Upstash)
#   2. GEMINI_API_KEY set
#   3. DATABASE_URL set
#   4. R2 credentials set (or use local storage)
#
# Usage:
#   ./scripts/run-local.sh
#   GEMINI_RPM=10 ./scripts/run-local.sh  # Use free tier rate limit
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
NC='\033[0m'

echo -e "${GREEN}🚀 Starting AI Worker locally${NC}"
echo ""

# --- Check prerequisites ---
if [ -z "$REDIS_URL" ]; then
  # Try local Redis first
  if docker ps --format '{{.Names}}' | grep -q 'redis'; then
    export REDIS_URL="redis://localhost:6399"
    echo -e "${YELLOW}Using local Docker Redis: $REDIS_URL${NC}"
  else
    echo -e "${RED}❌ REDIS_URL not set and no local Redis found${NC}"
    echo "Either:"
    echo "  1. Set REDIS_URL to your Upstash URL"
    echo "  2. Start local Redis: docker run -d --name redis -p 6399:6379 redis:7"
    exit 1
  fi
fi

if [ -z "$GEMINI_API_KEY" ] && [ -z "$GOOGLE_AI_STUDIO_API_KEY" ]; then
  echo -e "${RED}❌ GEMINI_API_KEY or GOOGLE_AI_STUDIO_API_KEY required${NC}"
  exit 1
fi

# --- Configuration ---
export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-3}"
export GEMINI_RPM="${GEMINI_RPM:-60}"
export PORT="${PORT:-8080}"

echo "📋 Configuration:"
echo "   REDIS_URL: ${REDIS_URL:0:30}..."
echo "   WORKER_CONCURRENCY: $WORKER_CONCURRENCY"
echo "   GEMINI_RPM: $GEMINI_RPM"
echo "   PORT: $PORT"
echo ""

# --- Build if needed ---
if [ ! -d "$WORKER_DIR/dist" ]; then
  echo -e "${YELLOW}Building ai-worker...${NC}"
  yarn workspace @repo/ai-worker build
fi

# --- Run worker ---
echo -e "${GREEN}Starting worker on port $PORT...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

cd "$WORKER_DIR"
node dist/index.js

