#!/bin/bash

# Setup Client Configuration Service
# This script sets up the complete client configuration service

set -e

echo "🚀 Setting up Client Configuration Service..."
echo "============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the supabase-service directory"
    exit 1
fi

# Create the new migration
echo "📝 Creating clients table migration..."
yarn supabase migration new create_clients_table

# Apply migrations
echo "🔄 Applying migrations..."
if [ -f ".env.local" ]; then
    echo "📡 Deploying to remote database..."
    yarn db:push
else
    echo "🏠 No .env.local found. Would you like to:"
    echo "1. Deploy to remote Supabase project"
    echo "2. Start local development environment"
    read -p "Choose option (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        echo "Please create .env.local first with your Supabase credentials"
        echo "Copy from .env.example and fill in your values"
        exit 1
    elif [ "$choice" = "2" ]; then
        echo "🏠 Starting local development..."
        yarn db:start
        yarn db:reset
    else
        echo "❌ Invalid choice"
        exit 1
    fi
fi

# Test the service
echo "🧪 Testing the service..."
cat > test_client_config.js << 'EOF'
const { DatabaseService } = require('./src/database-service');

async function testClientConfig() {
  try {
    const db = new DatabaseService();
    
    // Test health check
    const health = await db.healthCheck();
    console.log('✅ Health check:', health.status);
    
    // Test client config service
    const testClient = {
      clientId: 'test-client-' + Date.now(),
      baseUrl: 'https://test-company.com/odata',
      companyDb: 'test.ini/test123',
      productEntity: 'TEST_PRODUCTS',
      partsSubform: 'TEST_PARTS_SUBFORM',
      partsEntity: 'TEST_PARTS',
      partsProperties: '{"PARTNAME":"id","PARTDES":"description"}',
      partsDetailsSubform: 'TEST_DETAILS_SUBFORM',
      partsSubformProperties: '{"TEST_DETAILS_SUBFORM":{"PRICE":"price"}}',
      secretName: 'test-client-credentials',
      description: 'Test client configuration'
    };
    
    // Create test client
    const created = await db.clientConfigs.createClientConfig(testClient);
    console.log('✅ Created test client:', created.clientId);
    
    // Get all clients
    const allClients = await db.clientConfigs.getAllClientConfigs();
    console.log('✅ Found', allClients.length, 'client configurations');
    
    // Clean up test client
    await db.clientConfigs.deleteClientConfig(created.clientId);
    console.log('✅ Cleaned up test client');
    
    console.log('\n🎉 Client Configuration Service is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testClientConfig();
EOF

node test_client_config.js
rm test_client_config.js

echo ""
echo "🎉 Client Configuration Service setup completed!"
echo ""
echo "📋 Available operations:"
echo "  • Create client configurations"
echo "  • Read client configurations (with or without secrets)"
echo "  • Update client configurations"
echo "  • Delete client configurations"
echo "  • List all client configurations"
echo ""
echo "📚 Usage examples:"
echo "  • Check src/examples/client-config-examples.ts"
echo "  • API endpoints in src/api/client-config-api.ts"
echo "  • Deployment templates in deployments/"
echo ""
echo "🚀 Next steps:"
echo "1. Review the client configuration examples"
echo "2. Deploy the API as a serverless function (optional)"
echo "3. Integrate with your scenergy-next application"
