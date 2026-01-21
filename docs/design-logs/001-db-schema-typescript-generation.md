# Design Log #009: DB Schema TypeScript Generation

## Background

The `visualizer-db` package uses Drizzle schemas under `packages/visualizer-db/src/schema`. We need a simple way to introspect the live Postgres database and generate a TypeScript interface file that mirrors all tables and columns for quick reference and downstream tooling.

## Problem

There is no script that reads the actual database schema and outputs TypeScript interfaces for every table. We need a repeatable script that uses `DATABASE_URL` and emits a generated `.ts` file with interfaces and type mappings for columns (including nullability and enums).

## Questions and Answers

1. Q: Should we use a public library (e.g., `kysely-codegen`, `schemats`) or a small custom script using `pg`?
   A: Use `pg` for a lightweight custom script; `kysely-codegen` and `schemats` are viable public alternatives.
2. Q: Which schemas should be included (default `public` only, or all non-system schemas)?
   A: `public`
3. Q: Where should the generated file live?
   A: `packages/visualizer-db/src/schema/db-types.generated.ts`
4. Q: Should field names be `snake_case` (matching DB) or converted to `camelCase`?
   A: `camelCase`
5. Q: How should Postgres `numeric` and `bigint` map (string vs number)?
   A: number
6. Q: Should enums be generated as union types from `pg_enum`?
   A: yes

## Design

- Script location: `packages/visualizer-db/scripts/generate-db-interfaces.ts`
- Uses existing `loadEnv` to load `DATABASE_URL`.
- Connects via `pg` and queries:
  - `information_schema.tables` for table list.
  - `information_schema.columns` for column metadata (name, data type, nullable, udt_name).
  - `pg_type` + `pg_enum` for enums (if enabled).
- Output: a single generated file with:
  - `export interface <TableName>` per table.
  - Shared scalar type aliases (e.g., `type DbDate = Date`).
  - Enum union types (optional).
- Naming:
  - Table interface name = PascalCase of table name (e.g., `generated_asset` -> `GeneratedAsset`).
  - Field name format is a decision (see Q4).
- Type mapping (initial proposal):
  - `uuid`, `text`, `varchar` -> `string`
  - `boolean` -> `boolean`
  - `int2`, `int4`, `int8`, `integer`, `bigint` -> `number` (or `string` for `int8`)
  - `numeric`, `decimal` -> `string`
  - `timestamp`, `timestamptz`, `date` -> `Date`
  - `json`, `jsonb` -> `unknown`
  - arrays -> `T[]` based on element type
  - nullable columns -> `T | null`

```mermaid
flowchart LR
  A[Load env + connect] --> B[Read tables]
  B --> C[Read columns + enums]
  C --> D[Map types + nullability]
  D --> E[Write TS interfaces file]
```

## Implementation Plan

1. Add `generate-db-interfaces.ts` script to `packages/visualizer-db/scripts`.
2. Add a package script (e.g., `db:generate:interfaces`) to run via `tsx`.
3. Generate `db-types.generated.ts` in the agreed location.
4. Add a small unit test for type mapping (optional if scope allows).

## Examples

✅ Good

```ts
export interface GeneratedAsset {
  id: string;
  client_id: string;
  created_at: Date;
  error: string | null;
}
```

❌ Bad

```ts
export interface generated_asset {
  id?: any;
  client_id?: any;
}
```

## Trade-offs

- Library (`kysely-codegen`/`schemats`) gives a proven introspection path but adds a dependency and less control over output shape.
- Custom script keeps dependencies minimal (already using `pg`) but requires maintaining type mapping rules.
- Mapping `numeric`/`bigint` to `string` is safer for precision, but less convenient for arithmetic.

## Implementation Results

- Implemented `packages/visualizer-db/scripts/generate-db-interfaces.ts` to introspect `public` tables, enums, and emit camelCase interface properties.
- Added `db:generate:interfaces` script in `packages/visualizer-db/package.json`.
- Added mapping unit tests in `packages/visualizer-db/src/__tests__/generate-db-interfaces.test.ts`.
- Generated output file is produced on demand by the script.
- Tests: not run (not requested).

### Deviations

- Generated interfaces use direct scalar types (no shared scalar type aliases).
