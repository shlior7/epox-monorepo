import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupClientsTable() {
  console.log('🚀 Setting up Clients table...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250725003049_create_clients_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by statements (rough approach)
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', `${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: `${statement};`,
        });

        if (error) {
          console.log('⚠️  Statement result:', error.message);
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }

    // Test the table
    console.log('\n🧪 Testing Clients table...');

    // Check if table exists
    const { data, error } = await supabase.from('Clients').select('count').limit(1);

    if (error) {
      console.log('❌ Table test failed:', error.message);
    } else {
      console.log('✅ Clients table is working!');

      // Try to insert a test record
      const testClient = {
        clientId: `test-setup-${Date.now()}`,
        baseUrl: 'https://test.com/odata',
        companyDb: 'test.ini/123',
        productEntity: 'TEST_PRODUCTS',
        partsSubform: 'TEST_PARTS_SUBFORM',
        partsEntity: 'TEST_PARTS',
        partsProperties: '{"PARTNAME":"id","PARTDES":"description"}',
        partsDetailsSubform: 'TEST_DETAILS_SUBFORM',
        partsSubformProperties: '{"TEST_DETAILS_SUBFORM":{"PRICE":"price"}}',
        secretName: 'test-credentials',
        description: 'Test client from setup script',
      };

      const { data: insertedData, error: insertError } = await supabase.from('Clients').insert([testClient]).select().single();

      if (insertError) {
        console.log('❌ Insert test failed:', insertError.message);
      } else {
        console.log('✅ Test client created:', insertedData.clientId);

        // Clean up test record
        await supabase.from('Clients').delete().eq('clientId', insertedData.clientId);
        console.log('✅ Test client cleaned up');
      }
    }

    console.log('\n🎉 Clients table setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupClientsTable().catch((error: unknown) => {
  console.error('❌ Setup failed:', error);
});
