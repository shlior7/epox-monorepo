#!/bin/bash
set -e

# =============================================================================
# Production Setup Script for Epox Platform
# =============================================================================
# This script helps you set up the production infrastructure.
# Run with: ./scripts/setup-production.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════════"
echo "   🚀 Epox Platform - Production Setup"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# -----------------------------------------------------------------------------
# Check prerequisites
# -----------------------------------------------------------------------------
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  
  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ gcloud CLI installed${NC}"
  
  # Check docker
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install from: https://docs.docker.com/get-docker/${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Docker installed${NC}"
  
  # Check node
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Node.js installed ($(node --version))${NC}"
  
  echo ""
}

# -----------------------------------------------------------------------------
# GCP Setup
# -----------------------------------------------------------------------------
setup_gcp() {
  echo -e "${YELLOW}Setting up Google Cloud...${NC}"
  
  # Check if logged in
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
    echo "Please log in to Google Cloud:"
    gcloud auth login
  fi
  
  # Get or set project
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
  
  if [ -z "$CURRENT_PROJECT" ]; then
    echo ""
    echo "Available projects:"
    gcloud projects list --format="table(projectId,name)"
    echo ""
    read -p "Enter your GCP Project ID: " GCP_PROJECT
    gcloud config set project "$GCP_PROJECT"
  else
    echo "Current project: $CURRENT_PROJECT"
    read -p "Use this project? (y/n): " USE_CURRENT
    if [ "$USE_CURRENT" != "y" ]; then
      read -p "Enter your GCP Project ID: " GCP_PROJECT
      gcloud config set project "$GCP_PROJECT"
    else
      GCP_PROJECT="$CURRENT_PROJECT"
    fi
  fi
  
  export GCP_PROJECT
  echo -e "${GREEN}✓ Using project: $GCP_PROJECT${NC}"
  
  # Enable APIs
  echo "Enabling required APIs..."
  gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com \
    --quiet
  echo -e "${GREEN}✓ APIs enabled${NC}"
  
  # Grant Cloud Build permissions
  PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT" --format='value(projectNumber)')
  
  echo "Granting Cloud Build permissions..."
  gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin" \
    --quiet 2>/dev/null || true
  
  gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser" \
    --quiet 2>/dev/null || true
  
  echo -e "${GREEN}✓ Cloud Build permissions configured${NC}"
  echo ""
}

# -----------------------------------------------------------------------------
# Secrets Setup
# -----------------------------------------------------------------------------
setup_secrets() {
  echo -e "${YELLOW}Setting up secrets...${NC}"
  
  PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT" --format='value(projectNumber)')
  
  # Redis URL
  echo ""
  echo -e "${BLUE}Redis URL (from Upstash):${NC}"
  echo "Get your Redis URL from https://console.upstash.com/"
  echo "Format: redis://default:PASSWORD@HOST.upstash.io:6379"
  read -p "Enter Redis URL: " REDIS_URL
  
  if [ -n "$REDIS_URL" ]; then
    # Check if secret exists
    if gcloud secrets describe redis-url &>/dev/null; then
      echo "Updating existing redis-url secret..."
      echo -n "$REDIS_URL" | gcloud secrets versions add redis-url --data-file=-
    else
      echo "Creating redis-url secret..."
      echo -n "$REDIS_URL" | gcloud secrets create redis-url --data-file=-
    fi
    
    # Grant access
    gcloud secrets add-iam-policy-binding redis-url \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet 2>/dev/null || true
    
    echo -e "${GREEN}✓ Redis URL stored${NC}"
  fi
  
  # Gemini API Key
  echo ""
  echo -e "${BLUE}Gemini API Key:${NC}"
  echo "Get your API key from https://aistudio.google.com/app/apikey"
  read -p "Enter Gemini API Key: " GEMINI_KEY
  
  if [ -n "$GEMINI_KEY" ]; then
    if gcloud secrets describe gemini-api-key &>/dev/null; then
      echo "Updating existing gemini-api-key secret..."
      echo -n "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
    else
      echo "Creating gemini-api-key secret..."
      echo -n "$GEMINI_KEY" | gcloud secrets create gemini-api-key --data-file=-
    fi
    
    gcloud secrets add-iam-policy-binding gemini-api-key \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet 2>/dev/null || true
    
    echo -e "${GREEN}✓ Gemini API Key stored${NC}"
  fi
  
  echo ""
}

# -----------------------------------------------------------------------------
# Deploy Worker
# -----------------------------------------------------------------------------
deploy_worker() {
  echo -e "${YELLOW}Deploying AI Worker to Cloud Run...${NC}"
  
  cd "$REPO_ROOT"
  
  echo "Building and deploying (this may take a few minutes)..."
  gcloud builds submit --config services/ai-worker/cloudbuild.yaml
  
  # Get service URL
  SERVICE_URL=$(gcloud run services describe ai-worker --region us-central1 --format='value(status.url)' 2>/dev/null || echo "")
  
  if [ -n "$SERVICE_URL" ]; then
    echo -e "${GREEN}✓ AI Worker deployed!${NC}"
    echo "  Service URL: $SERVICE_URL"
  else
    echo -e "${YELLOW}⚠ Deployment may still be in progress. Check with:${NC}"
    echo "  gcloud run services describe ai-worker --region us-central1"
  fi
  
  echo ""
}

# -----------------------------------------------------------------------------
# Generate .env.local
# -----------------------------------------------------------------------------
generate_env() {
  echo -e "${YELLOW}Generating .env.local for local development...${NC}"
  
  ENV_FILE="$REPO_ROOT/apps/epox-platform/.env.local"
  
  if [ -f "$ENV_FILE" ]; then
    read -p ".env.local already exists. Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
      echo "Skipping .env.local generation"
      return
    fi
  fi
  
  # Get values
  echo ""
  read -p "Database URL (press Enter for local): " DB_URL
  DB_URL=${DB_URL:-"postgresql://test:test@localhost:5434/visualizer_test"}
  
  read -p "Redis URL (from Upstash): " REDIS_URL_INPUT
  read -p "Gemini API Key: " GEMINI_KEY_INPUT
  
  cat > "$ENV_FILE" << EOF
# =============================================================================
# Epox Platform - Local Development Environment
# Generated by setup-production.sh on $(date)
# =============================================================================

# Database
DATABASE_URL="$DB_URL"

# AI Services
GOOGLE_AI_STUDIO_API_KEY="$GEMINI_KEY_INPUT"
GEMINI_RPM="60"

# Redis Queue
REDIS_URL="$REDIS_URL_INPUT"

# Storage (local filesystem for dev)
STORAGE_DRIVER="filesystem"
LOCAL_STORAGE_DIR=".local-storage"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF

  echo -e "${GREEN}✓ Created $ENV_FILE${NC}"
  echo ""
}

# -----------------------------------------------------------------------------
# Main Menu
# -----------------------------------------------------------------------------
main_menu() {
  echo "What would you like to do?"
  echo ""
  echo "  1) Full setup (GCP + Secrets + Deploy)"
  echo "  2) Setup GCP project only"
  echo "  3) Setup secrets only"
  echo "  4) Deploy AI Worker only"
  echo "  5) Generate .env.local for local dev"
  echo "  6) Exit"
  echo ""
  read -p "Enter choice [1-6]: " CHOICE
  
  case $CHOICE in
    1)
      check_prerequisites
      setup_gcp
      setup_secrets
      deploy_worker
      generate_env
      ;;
    2)
      check_prerequisites
      setup_gcp
      ;;
    3)
      check_prerequisites
      setup_gcp
      setup_secrets
      ;;
    4)
      check_prerequisites
      setup_gcp
      deploy_worker
      ;;
    5)
      generate_env
      ;;
    6)
      echo "Goodbye!"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid choice${NC}"
      exit 1
      ;;
  esac
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
print_summary() {
  echo -e "${BLUE}"
  echo "═══════════════════════════════════════════════════════════════"
  echo "   ✅ Setup Complete!"
  echo "═══════════════════════════════════════════════════════════════"
  echo -e "${NC}"
  echo "Next steps:"
  echo ""
  echo "  1. Start local development:"
  echo "     cd apps/epox-platform && yarn dev"
  echo ""
  echo "  2. Start local AI worker (optional):"
  echo "     export REDIS_URL=\"your-upstash-url\""
  echo "     export GOOGLE_AI_STUDIO_API_KEY=\"your-key\""
  echo "     node services/ai-worker/dist/index.js"
  echo ""
  echo "  3. Test image generation:"
  echo "     curl -X POST http://localhost:3000/api/generate-images \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{\"sessionId\":\"test\",\"productIds\":[\"p1\"],\"promptTags\":{}}'"
  echo ""
  echo "For more details, see: PRODUCTION_SETUP.md"
  echo ""
}

# Run
main_menu
print_summary

