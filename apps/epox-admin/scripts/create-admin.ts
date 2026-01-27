#!/usr/bin/env tsx

/**
 * Create Admin User Script
 *
 * Creates a new admin user with email, name, and password.
 *
 * Usage:
 *   tsx scripts/create-admin.ts --email admin@epox.com --name "Admin Name" --password SecurePassword123!
 *
 * Or interactive mode:
 *   tsx scripts/create-admin.ts
 */

import { db } from 'visualizer-db';
import bcrypt from 'bcrypt';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const BCRYPT_ROUNDS = 10;

interface AdminUserData {
  email: string;
  name: string;
  password: string;
}

async function promptForData(): Promise<AdminUserData> {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n🔐 Create Admin User\n');

    const email = await rl.question('Email: ');
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const name = await rl.question('Name: ');
    if (!name || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    // Password without echo
    process.stdout.write('Password: ');
    const password = await new Promise<string>((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      let pwd = '';
      process.stdin.on('data', (char) => {
        const c = char.toString('utf8');
        if (c === '\r' || c === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(pwd);
        } else if (c === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (c === '\u007f') {
          // Backspace
          if (pwd.length > 0) {
            pwd = pwd.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          pwd += c;
          process.stdout.write('*');
        }
      });
    });

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    return { email: email.trim(), name: name.trim(), password };
  } finally {
    rl.close();
  }
}

function parseArgs(): Partial<AdminUserData> | null {
  const args = process.argv.slice(2);
  const data: Partial<AdminUserData> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    if (!value) {
      console.error(`Missing value for ${key}`);
      return null;
    }

    switch (key) {
      case '--email':
        data.email = value;
        break;
      case '--name':
        data.name = value;
        break;
      case '--password':
        data.password = value;
        break;
      case '--help':
      case '-h':
        return null;
      default:
        console.error(`Unknown option: ${key}`);
        return null;
    }
  }

  return data;
}

function showUsage() {
  console.log(`
Usage:
  tsx scripts/create-admin.ts --email <email> --name <name> --password <password>

Options:
  --email <email>        Admin email address
  --name <name>          Admin full name
  --password <password>  Admin password (min 8 characters)
  --help, -h             Show this help message

Interactive mode:
  tsx scripts/create-admin.ts

Examples:
  tsx scripts/create-admin.ts --email admin@epox.com --name "Admin User" --password SecurePass123!
  tsx scripts/create-admin.ts
  `);
}

async function createAdmin(data: AdminUserData): Promise<void> {
  console.log('\n⏳ Creating admin user...\n');

  // Check if email already exists
  const existing = await db.adminUsers.getByEmail(data.email);
  if (existing) {
    throw new Error(`Admin user with email "${data.email}" already exists`);
  }

  // Hash password
  console.log('   Hashing password...');
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Create admin user
  console.log('   Creating admin user...');
  const adminUser = await db.adminUsers.create(data.email, data.name, passwordHash);

  console.log('\n✅ Admin user created successfully!\n');
  console.log(`   ID:    ${adminUser.id}`);
  console.log(`   Name:  ${adminUser.name}`);
  console.log(`   Email: ${adminUser.email}\n`);
  console.log('You can now login at /admin/login\n');
}

async function main() {
  try {
    const parsedArgs = parseArgs();

    if (parsedArgs === null) {
      showUsage();
      process.exit(0);
    }

    let data: AdminUserData;

    if (parsedArgs.email && parsedArgs.name && parsedArgs.password) {
      // Use CLI args
      data = parsedArgs as AdminUserData;
    } else {
      // Interactive mode
      data = await promptForData();
    }

    await createAdmin(data);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error), '\n');
    process.exit(1);
  }
}

main();
