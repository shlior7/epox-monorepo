import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');

const envFiles = [
  path.join(repoRoot, '.env'),
  path.join(repoRoot, '.env.local'),
  path.join(packageRoot, '.env'),
  path.join(packageRoot, '.env.local'),
];

export function loadEnv(): void {
  const loadedKeys = new Set<string>();

  for (const envPath of envFiles) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [key, value] of Object.entries(parsed)) {
      const hasProcessValue = Object.hasOwn(process.env, key);
      if (!hasProcessValue || loadedKeys.has(key)) {
        process.env[key] = value;
        loadedKeys.add(key);
      }
    }
  }
}
