#!/usr/bin/env tsx
/**
 * Helper script to delete a test client and all related data
 * Usage: yarn tsx __tests__/setup/delete-test-client.ts
 */

const TEST_EMAIL = 'hello@epox.ai';
const API_URL = 'http://localhost:3000/api/onboarding/delete-test-client';

async function deleteTestClient() {
  console.log('🗑️  Deleting test client:', TEST_EMAIL);
  console.log('━'.repeat(50));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to delete:', error.error);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Success:', result.message);
    console.log('   Deleted clients:', result.deletedClientIds.join(', '));
    console.log('\n✨ Test client deleted successfully!');
    console.log('\nYou can now create a new test account by:');
    console.log('1. Going to http://localhost:3000/signup');
    console.log('2. Email: hello@epox.ai');
    console.log('3. Password: testtest');
    console.log('4. Name: test-client');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await fetch('http://localhost:3000', { method: 'HEAD' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const isRunning = await checkServer();
  if (!isRunning) {
    console.error('❌ Server is not running!');
    console.error('   Please start the server first: yarn dev');
    process.exit(1);
  }

  await deleteTestClient();
}

main();
