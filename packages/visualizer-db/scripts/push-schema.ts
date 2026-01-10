import { execSync } from 'node:child_process';

execSync('drizzle-kit push', { stdio: 'inherit' });
