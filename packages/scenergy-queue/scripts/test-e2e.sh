#!/bin/bash
# =============================================================================
# E2E Test Runner (PostgreSQL + Redis)
# =============================================================================
# Usage:
#   ./scripts/test-e2e.sh          # Run tests (containers stay up)
#   ./scripts/test-e2e.sh --clean  # Run tests and clean up containers
#   ./scripts/test-e2e.sh --setup  # Just setup, don't run tests
#   ./scripts/test-e2e.sh --stop   # Stop containers
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUEUE_DIR="$(dirname "$SCRIPT_DIR")"
DB_DIR="$QUEUE_DIR/../visualizer-db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}▶  $1${NC}"; }

# Parse arguments
CLEANUP=false
SETUP_ONLY=false
STOP_ONLY=false
for arg in "$@"; do
  case $arg in
    --clean)
      CLEANUP=true
      ;;
    --setup)
      SETUP_ONLY=true
      ;;
    --stop)
      STOP_ONLY=true
      ;;
  esac
done

# =============================================================================
# Setup Functions
# =============================================================================

start_redis() {
  log_step "Starting Redis container..."
  cd "$QUEUE_DIR"
  docker-compose -f docker-compose.test.yml up -d 2>/dev/null

  # Wait for Redis to be ready
  log_info "Waiting for Redis to be ready..."
  for i in {1..30}; do
    if docker exec scenergy-queue-redis-test redis-cli ping 2>/dev/null | grep -q PONG; then
      log_success "Redis is ready!"
      return 0
    fi
    sleep 1
  done
  log_error "Redis failed to start"
  return 1
}

start_postgres() {
  log_step "Starting PostgreSQL container..."
  cd "$DB_DIR"
  docker-compose -f docker-compose.test.yml up -d 2>/dev/null

  # Wait for PostgreSQL to be ready
  log_info "Waiting for PostgreSQL to be ready..."
  for i in {1..30}; do
    if docker exec visualizer-db-test pg_isready -U test -d visualizer_test 2>/dev/null; then
      log_success "PostgreSQL is ready!"
      return 0
    fi
    sleep 1
  done
  log_error "PostgreSQL failed to start"
  return 1
}

setup_schema() {
  log_step "Setting up database schema..."

  # Drop and recreate database for clean state
  log_info "Recreating database (clean slate)..."
  docker exec visualizer-db-test psql -U test -d postgres -c "DROP DATABASE IF EXISTS visualizer_test;" 2>/dev/null || true
  docker exec visualizer-db-test psql -U test -d postgres -c "CREATE DATABASE visualizer_test;" 2>/dev/null

  # Check if schema.sql exists
  if [ ! -f "$DB_DIR/sql-tests/schema.sql" ]; then
    log_warn "schema.sql not found. Generating from drizzle..."
    cd "$DB_DIR"
    DATABASE_URL="postgresql://test:test@localhost:5434/visualizer_test" npx drizzle-kit generate 2>/dev/null

    # Copy and clean the generated file
    if [ -d "$DB_DIR/drizzle" ]; then
      LATEST_SQL=$(ls -t "$DB_DIR/drizzle"/*.sql 2>/dev/null | head -1)
      if [ -n "$LATEST_SQL" ]; then
        mkdir -p "$DB_DIR/sql-tests"
        sed 's/--> statement-breakpoint//g' "$LATEST_SQL" > "$DB_DIR/sql-tests/schema.sql"
        log_success "Generated schema.sql from drizzle"
      fi
    fi
  fi

  # Apply schema using psql (direct, no interactive prompts)
  log_info "Applying schema via psql..."
  docker exec visualizer-db-test psql -U test -d visualizer_test -f /sql-tests/schema.sql 2>&1 | tail -5

  # Verify tables exist
  sleep 1
  log_info "Verifying schema..."
  TABLE_COUNT=$(docker exec visualizer-db-test psql -U test -d visualizer_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

  if [ "$TABLE_COUNT" -gt 10 ]; then
    log_success "Schema applied successfully! ($TABLE_COUNT tables created)"
    return 0
  else
    log_error "Schema incomplete ($TABLE_COUNT tables). Check sql-tests/schema.sql"
    return 1
  fi
}

cleanup() {
  log_step "Stopping containers..."
  cd "$QUEUE_DIR"
  docker-compose -f docker-compose.test.yml down 2>/dev/null || true
  cd "$DB_DIR"
  docker-compose -f docker-compose.test.yml down 2>/dev/null || true
  log_success "Containers stopped!"
}

run_tests() {
  log_step "Running E2E tests..."
  cd "$QUEUE_DIR"
  npx vitest run tests/e2e --reporter=verbose
}

show_status() {
  echo ""
  echo "Container Status:"
  docker ps --filter 'name=redis-test' --filter 'name=db-test' --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  No containers running"
  echo ""
}

# =============================================================================
# Main
# =============================================================================

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    E2E Test Runner                           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Handle --stop
if [ "$STOP_ONLY" = true ]; then
  cleanup
  exit 0
fi

# Start containers
start_redis || exit 1
start_postgres || exit 1

# Setup schema
setup_schema || exit 1

if [ "$SETUP_ONLY" = true ]; then
  echo ""
  log_success "Setup complete! Containers are running."
  show_status
  echo "To run tests manually:"
  echo "  cd $QUEUE_DIR"
  echo "  npx vitest run tests/e2e"
  echo ""
  echo "To stop containers:"
  echo "  ./scripts/test-e2e.sh --stop"
  exit 0
fi

# Run tests
echo ""
run_tests
TEST_EXIT_CODE=$?

# Cleanup if requested
if [ "$CLEANUP" = true ]; then
  echo ""
  cleanup
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  log_success "All tests passed!"
else
  log_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

exit $TEST_EXIT_CODE
