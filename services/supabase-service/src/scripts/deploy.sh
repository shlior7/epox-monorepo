#!/bin/bash

# Deploy to Live Supabase Database using Access Token
# This script deploys migrations and updates to your live Supabase project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load environment variables
if [ -f ".env.local" ]; then
    source .env.local
    print_success "Loaded environment variables from .env.local"
else
    print_error "No .env.local file found. Please create one from .env.example"
    exit 1
fi

echo "🚀 Deploying to Live Supabase Database..."

# Check required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    print_error "SUPABASE_ACCESS_TOKEN is required in .env.local"
    echo "Get your access token from: https://app.supabase.com/account/tokens"
    exit 1
fi

if [ -z "$SUPABASE_PROJECT_REF" ]; then
    print_error "SUPABASE_PROJECT_REF is required in .env.local"
    echo "Get your project ref from your Supabase dashboard URL"
    exit 1
fi

# Export the access token for Supabase CLI
export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN"

print_status "Using project: $SUPABASE_PROJECT_REF"

# Check if project is already linked
if [ -f ".git/config" ] && grep -q "project-ref.*$SUPABASE_PROJECT_REF" .git/config 2>/dev/null; then
    print_success "Project already linked"
else
    print_status "Linking to Supabase project..."
    yarn supabase link --project-ref "$SUPABASE_PROJECT_REF"
fi

# Show available migrations
print_status "Available migrations to deploy:"
ls -la supabase/migrations/ || echo "No migrations found"

# Ask for confirmation before deploying
echo ""
print_warning "⚠️  This will update your LIVE database!"
print_warning "Make sure you have:"
print_warning "1. Tested your migrations locally"
print_warning "2. Backed up your production data"
print_warning "3. Reviewed all migration files"
echo ""
read -p "Are you sure you want to deploy to production? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_error "Deployment cancelled"
    exit 1
fi

# Deploy migrations
print_status "Deploying database migrations..."
yarn supabase db push --linked

# Show final status
print_status "Deployment completed successfully!"

print_success "🎉 Deployment completed!"
echo ""
print_status "Your database service is now live at:"
echo "  URL: $SUPABASE_URL"
print_status "Remember to update your application's environment variables if needed."
echo "📊 To check your database:"
echo "   https://app.supabase.com/project/$SUPABASE_PROJECT_REF"
