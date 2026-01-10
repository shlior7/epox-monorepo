#!/bin/bash

# Supabase Database Service Setup Script
# This script sets up the complete database service environment

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

echo "🚀 Setting up Supabase Database Service..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "supabase" ]; then
    print_error "Please run this script from the supabase-service directory"
    exit 1
fi

print_success "Found Supabase project structure"

# Check for environment file
if [ ! -f ".env.local" ]; then
    print_warning "No .env.local found. Creating from template..."
    cp .env.example .env.local
    print_warning "Please edit .env.local with your Supabase credentials"
    echo "You can get these from your Supabase dashboard at https://app.supabase.com"
    echo ""
    read -p "Do you want to use local development environment? (y/N): " USE_LOCAL
    
    if [[ $USE_LOCAL =~ ^[Yy]$ ]]; then
        print_status "Setting up for local development..."
        LOCAL_MODE=true
    else
        print_status "Setting up for remote Supabase project..."
        LOCAL_MODE=false
    fi
else
    print_success "Found .env.local file"
    LOCAL_MODE=false
fi

# Function to start local development
setup_local() {
    print_status "Starting local Supabase..."
    yarn supabase start
    
    print_status "Applying migrations..."
    yarn supabase db reset
    
    print_status "Local Supabase is running!"
    yarn supabase status
}

# Function to setup remote project
setup_remote() {
    print_status "Setting up remote Supabase project..."
    
    # Check if already linked
    if yarn supabase status &> /dev/null; then
        print_success "Already linked to a Supabase project"
    else
        print_status "Available projects:"
        yarn supabase projects list
        echo ""
        read -p "Enter your project reference ID: " PROJECT_REF
        
        if [ -z "$PROJECT_REF" ]; then
            print_error "Project reference ID is required"
            exit 1
        fi
        
        print_status "Linking to project: $PROJECT_REF"
        yarn supabase link --project-ref "$PROJECT_REF"
    fi
    
    print_status "Pushing migrations to remote database..."
    yarn supabase db push
    
    print_success "Remote setup completed!"
}

# Login to Supabase if needed
if ! yarn supabase projects list &> /dev/null; then
    print_status "Please log in to Supabase..."
    yarn supabase login
fi

if [ "$LOCAL_MODE" = true ]; then
    setup_local
else
    echo ""
    read -p "Setup local development environment? (y/N): " SETUP_LOCAL
    if [[ $SETUP_LOCAL =~ ^[Yy]$ ]]; then
        setup_local
    else
        setup_remote
    fi
fi

# Verify setup
print_status "Verifying database functions..."
if yarn supabase db query --file verify_setup.sql; then
    print_success "✅ All database functions are working correctly!"
else
    print_warning "Some functions may not be working properly. Check the output above."
fi

# Add some sample data if requested
echo ""
read -p "Add sample test data? (y/N): " ADD_SAMPLE_DATA
if [[ $ADD_SAMPLE_DATA =~ ^[Yy]$ ]]; then
    print_status "Adding sample test data..."
    yarn supabase db seed
    print_success "Sample data added!"
fi

echo ""
print_success "🎉 Supabase Database Service setup completed!"
echo ""
print_status "Available commands:"
echo "  yarn db:start     - Start local Supabase"
echo "  yarn db:stop      - Stop local Supabase" 
echo "  yarn db:reset     - Reset local database"
echo "  yarn db:status    - Check status"
echo "  yarn db:push      - Push migrations to remote"
echo "  yarn db:pull      - Pull schema from remote"
echo ""
print_status "Next steps:"
echo "1. Update .env.local with your credentials (if using remote)"
echo "2. Test the database service in your application"
echo "3. Check the examples.ts file for usage patterns"
