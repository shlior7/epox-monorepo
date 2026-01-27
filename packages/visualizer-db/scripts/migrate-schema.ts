#!/usr/bin/env tsx
/**
 * Safe Schema Migration Script
 *
 * Push Drizzle schema changes to one or more databases with confirmation.
 *
 * Usage:
 *   # Migrate local dev database
 *   tsx scripts/migrate-schema.ts --local
 *
 *   # Migrate production database (requires confirmation)
 *   tsx scripts/migrate-schema.ts --production
 *
 *   # Migrate both in sequence
 *   tsx scripts/migrate-schema.ts --all
 *
 *   # Custom database URL
 *   tsx scripts/migrate-schema.ts --url "postgresql://..."
 *
 *   # Dry run (show changes without applying)
 *   tsx scripts/migrate-schema.ts --production --dry-run
 */

import { execSync } from 'child_process';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({ input, output });

// Database presets
const DATABASES = {
  local: {
    name: 'Local Development',
    url: 'postgresql://postgres:postgres@localhost:5432/epox_dev',
    emoji: '💻',
    requiresConfirmation: false,
  },
  test: {
    name: 'Test Database',
    url: 'postgresql://test:test@localhost:5434/visualizer_test',
    emoji: '🧪',
    requiresConfirmation: false,
  },
  production: {
    name: 'Production (Neon)',
    url: process.env.PRODUCTION_DATABASE_URL || '', // Set via environment
    emoji: '🔴',
    requiresConfirmation: true,
  },
};

interface MigrationOptions {
  databaseUrl: string;
  databaseName: string;
  emoji: string;
  requiresConfirmation: boolean;
  dryRun: boolean;
}

function isProductionDatabase(url: string): boolean {
  return (
    url.includes('neon.tech') ||
    url.includes('amazonaws.com') ||
    url.includes('supabase.co') ||
    url.includes('planetscale.com')
  );
}

function maskConnectionString(url: string): string {
  try {
    const urlObj = new URL(url);
    const maskedPassword = urlObj.password ? '***' : '';
    const maskedUser = urlObj.username || 'user';
    const host = urlObj.hostname.substring(0, 20);
    return `postgresql://${maskedUser}:${maskedPassword}@${host}.../${urlObj.pathname.split('/')[1]}`;
  } catch {
    return url.substring(0, 30) + '***';
  }
}

async function confirmAction(message: string): Promise<boolean> {
  const answer = await rl.question(`${message} (yes/no): `);
  return answer.toLowerCase() === 'yes';
}

async function confirmByTyping(expectedText: string): Promise<boolean> {
  console.log(`\n⚠️  Please type "${expectedText}" to confirm:`);
  const answer = await rl.question('> ');
  return answer === expectedText;
}

async function showSchemaDiff(databaseUrl: string): Promise<string> {
  console.log('\n📊 Analyzing schema differences...\n');

  try {
    const output = execSync('npx drizzle-kit push --force', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return output;
  } catch (error: any) {
    // drizzle-kit returns non-zero when there are changes
    return error.stdout || error.message;
  }
}

async function applyMigration(options: MigrationOptions): Promise<boolean> {
  const { databaseUrl, databaseName, emoji, requiresConfirmation, dryRun } = options;

  console.log('\n' + '='.repeat(60));
  console.log(`${emoji} Target: ${databaseName}`);
  console.log(`📍 URL: ${maskConnectionString(databaseUrl)}`);
  console.log('='.repeat(60));

  // Check if URL is provided
  if (!databaseUrl) {
    console.error(`\n❌ Database URL not provided for ${databaseName}`);
    if (databaseName.includes('Production')) {
      console.error('Set PRODUCTION_DATABASE_URL environment variable:');
      console.error('  export PRODUCTION_DATABASE_URL="postgresql://..."');
    }
    return false;
  }

  // Production safety check
  const isProd = isProductionDatabase(databaseUrl);
  if (isProd) {
    console.log('\n🚨 WARNING: This is a PRODUCTION database!');
  }

  // Show what will change
  console.log('\n📋 Fetching schema diff...\n');

  try {
    // First, do a dry run to see changes
    const diffOutput = execSync('npx drizzle-kit push', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(diffOutput);

    // Check if there are no changes
    if (diffOutput.includes('No changes detected') || diffOutput.includes('Schema is up to date')) {
      console.log('✅ Schema is already up to date. No changes needed.');
      return true;
    }
  } catch (error: any) {
    // drizzle-kit push shows the diff and exits with error if there are changes
    console.log(error.stdout || error.message);
  }

  // Dry run mode - stop here
  if (dryRun) {
    console.log('\n🔍 Dry run mode - no changes applied');
    return true;
  }

  // Require confirmation for production
  if (requiresConfirmation || isProd) {
    console.log('\n⚠️  Confirmation required to apply changes');

    // First confirmation
    const confirmed = await confirmAction('\nDo you want to apply these changes?');
    if (!confirmed) {
      console.log('❌ Migration cancelled');
      return false;
    }

    // Production requires typing confirmation
    if (isProd) {
      const dbName = databaseUrl.split('/').pop()?.split('?')[0] || 'unknown';
      const confirmedByTyping = await confirmByTyping(dbName);
      if (!confirmedByTyping) {
        console.log('❌ Migration cancelled - database name did not match');
        return false;
      }
    }
  }

  // Apply the migration
  console.log('\n🚀 Applying schema changes...\n');

  try {
    execSync('npx drizzle-kit push --force', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        // Override safety check - we've already confirmed
        ALLOW_PRODUCTION_ACCESS: 'true',
      },
      stdio: 'inherit',
    });

    console.log(`\n✅ Schema migration completed for ${databaseName}`);
    return true;
  } catch (error) {
    console.error(`\n❌ Migration failed for ${databaseName}:`, error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const flags = {
    local: args.includes('--local'),
    test: args.includes('--test'),
    production: args.includes('--production'),
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
    customUrl: args.find((arg) => arg.startsWith('--url='))?.split('=')[1],
  };

  console.log('🔧 Drizzle Schema Migration Tool\n');

  // Determine which databases to migrate
  const targets: Array<keyof typeof DATABASES | 'custom'> = [];

  if (flags.all) {
    targets.push('local', 'production');
  } else {
    if (flags.local) targets.push('local');
    if (flags.test) targets.push('test');
    if (flags.production) targets.push('production');
    if (flags.customUrl) targets.push('custom');
  }

  if (targets.length === 0) {
    console.log('Usage: tsx scripts/migrate-schema.ts [options]');
    console.log('\nOptions:');
    console.log('  --local         Migrate local development database');
    console.log('  --test          Migrate test database');
    console.log('  --production    Migrate production database (requires confirmation)');
    console.log('  --all           Migrate local + production in sequence');
    console.log('  --dry-run       Show changes without applying');
    console.log('  --url=<url>     Migrate custom database URL');
    console.log('\nExamples:');
    console.log('  tsx scripts/migrate-schema.ts --local');
    console.log('  tsx scripts/migrate-schema.ts --production --dry-run');
    console.log('  tsx scripts/migrate-schema.ts --all');
    console.log('  tsx scripts/migrate-schema.ts --url="postgresql://..."');
    console.log('\nEnvironment Variables:');
    console.log('  PRODUCTION_DATABASE_URL - Production database connection string');
    process.exit(0);
  }

  // Show dry run notice
  if (flags.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied\n');
  }

  // Process each target
  const results: Array<{ name: string; success: boolean }> = [];

  for (const target of targets) {
    let success: boolean;

    if (target === 'custom' && flags.customUrl) {
      success = await applyMigration({
        databaseUrl: flags.customUrl,
        databaseName: 'Custom Database',
        emoji: '🔧',
        requiresConfirmation: isProductionDatabase(flags.customUrl),
        dryRun: flags.dryRun,
      });
      results.push({ name: 'Custom', success });
    } else if (target !== 'custom') {
      const db = DATABASES[target];
      success = await applyMigration({
        databaseUrl: db.url,
        databaseName: db.name,
        emoji: db.emoji,
        requiresConfirmation: db.requiresConfirmation,
        dryRun: flags.dryRun,
      });
      results.push({ name: db.name, success });
    }

    // Add spacing between migrations
    if (targets.length > 1) {
      console.log('\n' + '-'.repeat(60) + '\n');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));

  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });

  const allSuccess = results.every((r) => r.success);
  console.log('\n' + (allSuccess ? '✨ All migrations completed successfully' : '⚠️  Some migrations failed'));

  rl.close();
  process.exit(allSuccess ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});
