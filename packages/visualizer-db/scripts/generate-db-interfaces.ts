#!/usr/bin/env node
/**
 * Generate TypeScript interfaces from the live Postgres schema.
 * Usage: tsx scripts/generate-db-interfaces.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { loadEnv } from './load-env';

type ColumnRow = {
  table_name: string;
  column_name: string;
  is_nullable: 'YES' | 'NO';
  data_type: string;
  udt_name: string;
};

type EnumRow = {
  name: string;
  value: string;
};

export type ColumnTypeInfo = {
  dataType: string;
  udtName: string;
  isNullable: boolean;
};

const PRIMITIVE_TYPE_MAP: Record<string, string> = {
  bool: 'boolean',
  boolean: 'boolean',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  decimal: 'number',
  real: 'number',
  money: 'number',
  uuid: 'string',
  text: 'string',
  varchar: 'string',
  bpchar: 'string',
  name: 'string',
  date: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',
  time: 'string',
  timetz: 'string',
  json: 'unknown',
  jsonb: 'unknown',
  bytea: 'Uint8Array',
  inet: 'string',
  cidr: 'string',
  macaddr: 'string',
  macaddr8: 'string',
  interval: 'string',
};

const SCHEMA_NAME = 'public';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const outputPath = path.join(packageRoot, 'src/schema/generated/db-types.generated.ts');

export function toCamelCase(value: string): string {
  const normalized = value.replace(/[_\s-]+([a-zA-Z0-9])/g, (_, char: string) => {
    return char.toUpperCase();
  });
  if (normalized.length === 0) {
    return normalized;
  }
  return normalized[0].toLowerCase() + normalized.slice(1);
}

export function toPascalCase(value: string): string {
  const camel = toCamelCase(value);
  if (camel.length === 0) {
    return camel;
  }
  return camel[0].toUpperCase() + camel.slice(1);
}

function normalizeTypeName(value: string): string {
  const pascal = toPascalCase(value);
  if (/^[0-9]/.test(pascal)) {
    return `T${pascal}`;
  }
  return pascal;
}

export function buildEnumTypeNames(enumMap: Map<string, string[]>): Map<string, string> {
  const result = new Map<string, string>();
  for (const name of enumMap.keys()) {
    result.set(name, normalizeTypeName(name));
  }
  return result;
}

export function resolveColumnType(column: ColumnTypeInfo, enumTypeNames: Map<string, string>): string {
  const isArray = column.dataType.toUpperCase() === 'ARRAY';
  const udtName = isArray ? column.udtName.replace(/^_/, '') : column.udtName;
  const enumType = enumTypeNames.get(udtName);
  const baseType = enumType ?? PRIMITIVE_TYPE_MAP[udtName] ?? 'unknown';
  const resolvedType = isArray ? `${baseType}[]` : baseType;
  return column.isNullable ? `${resolvedType} | null` : resolvedType;
}

function buildEnumMap(rows: EnumRow[]): Map<string, string[]> {
  const enumMap = new Map<string, string[]>();
  for (const row of rows) {
    const values = enumMap.get(row.name);
    if (values) {
      values.push(row.value);
    } else {
      enumMap.set(row.name, [row.value]);
    }
  }
  return enumMap;
}

function formatPropertyName(name: string): string {
  const camel = toCamelCase(name);
  const isValidIdentifier = /^[$A-Z_][0-9A-Z_$]*$/i.test(camel);
  return isValidIdentifier ? camel : JSON.stringify(camel);
}

function renderEnumTypes(enumMap: Map<string, string[]>, enumTypeNames: Map<string, string>): string[] {
  const lines: string[] = [];
  if (enumMap.size === 0) {
    return lines;
  }

  lines.push('// Enums');
  for (const [name, values] of enumMap) {
    const typeName = enumTypeNames.get(name);
    if (!typeName) {
      continue;
    }
    const union = values.map((value) => JSON.stringify(value)).join(' | ');
    lines.push(`export type ${typeName} = ${union};`);
  }
  lines.push('');
  return lines;
}

function renderInterfaces(tables: Map<string, ColumnRow[]>, enumTypeNames: Map<string, string>): string[] {
  const lines: string[] = [];
  lines.push('// Tables');
  for (const [tableName, columns] of tables) {
    const interfaceName = normalizeTypeName(tableName);
    lines.push(`export interface ${interfaceName} {`);
    for (const column of columns) {
      const propertyName = formatPropertyName(column.column_name);
      const columnType = resolveColumnType(
        {
          dataType: column.data_type,
          udtName: column.udt_name,
          isNullable: column.is_nullable === 'YES',
        },
        enumTypeNames
      );
      lines.push(`  ${propertyName}: ${columnType};`);
    }
    lines.push('}');
    lines.push('');
  }
  return lines;
}

async function generateInterfaces(): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const enumResult = await client.query<EnumRow>(
      `
        select t.typname as name, e.enumlabel as value
        from pg_type t
        join pg_enum e on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = $1
        order by t.typname, e.enumsortorder
      `,
      [SCHEMA_NAME]
    );
    const enumMap = buildEnumMap(enumResult.rows);
    const enumTypeNames = buildEnumTypeNames(enumMap);

    const tableResult = await client.query<{ table_name: string }>(
      `
        select table_name
        from information_schema.tables
        where table_schema = $1
          and table_type = 'BASE TABLE'
        order by table_name
      `,
      [SCHEMA_NAME]
    );

    const columnResult = await client.query<ColumnRow>(
      `
        select table_name, column_name, is_nullable, data_type, udt_name
        from information_schema.columns
        where table_schema = $1
        order by table_name, ordinal_position
      `,
      [SCHEMA_NAME]
    );

    const tables = new Map<string, ColumnRow[]>();
    for (const row of tableResult.rows) {
      tables.set(row.table_name, []);
    }

    for (const row of columnResult.rows) {
      const columns = tables.get(row.table_name) ?? [];
      columns.push(row);
      tables.set(row.table_name, columns);
    }

    const lines: string[] = [];
    lines.push('/* eslint-disable */');
    lines.push('// This file is auto-generated by scripts/generate-db-interfaces.ts. Do not edit.');
    lines.push('');
    lines.push(...renderEnumTypes(enumMap, enumTypeNames));
    lines.push(...renderInterfaces(tables, enumTypeNames));

    return lines.join('\n');
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  loadEnv();

  // If DATABASE_URL is not set, skip generation and use existing types
  // This allows CI/CD builds to succeed without database access
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL not set - skipping type generation, using existing types');
    console.log(`   Existing types file: ${outputPath}`);
    return;
  }

  const output = await generateInterfaces();
  await fs.writeFile(outputPath, output, 'utf8');
  console.log(`Generated ${outputPath}`);
}

function isMain(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  return path.resolve(process.argv[1]) === __filename;
}

if (isMain()) {
  main().catch((error) => {
    console.error('Failed to generate DB interfaces:', error);
    process.exit(1);
  });
}
