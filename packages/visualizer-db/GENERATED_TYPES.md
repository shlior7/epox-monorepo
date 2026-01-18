# Generated Database Types

This package automatically generates TypeScript types from the live PostgreSQL database schema.

## Overview

The `db-types.generated.ts` file contains type-safe interfaces for all database tables, ensuring consistency between your database schema and TypeScript code.

## Usage

### Importing Generated Types

```typescript
// Import specific table types
import type { Product, CollectionSession, GeneratedAsset } from 'visualizer-db/schema';

// Or import from the types export
import type { Product, CollectionSession, GeneratedAsset } from 'visualizer-db/types';
```

### Available Types

All database tables have corresponding TypeScript interfaces:

- `Product` - Products table
- `ProductImage` - Product images table
- `CollectionSession` - Collection sessions table
- `GeneratedAsset` - Generated assets (images, videos, etc.)
- `ChatSession` - Chat sessions table
- `Client` - Clients table
- `User` - Users table
- `Account` - Authentication accounts
- And many more...

### Type Generation

Types are automatically generated from the live database schema during the build process.

**Manual generation:**
```bash
cd packages/visualizer-db
yarn db:generate:types
```

**Automatic generation:**
```bash
# From the monorepo root
yarn build
```

The `build` script in visualizer-db runs the type generator, and turbo ensures it runs before building dependent packages.

## Benefits

1. **Type Safety**: All database operations are type-checked against the actual schema
2. **Auto-completion**: IDEs provide autocomplete for all table columns
3. **Schema Validation**: TypeScript errors if code doesn't match database schema
4. **Refactoring Safety**: Renaming columns updates all usages via TypeScript errors
5. **Single Source of Truth**: Database schema drives TypeScript types

## Examples

### Using Generated Types in Repository Methods

```typescript
import type { Product, ProductImage } from 'visualizer-db/schema';

export class ProductRepository {
  async getById(id: string): Promise<Product | null> {
    // Return type is automatically validated
    const result = await drizzle
      .select()
      .from(product)
      .where(eq(product.id, id));

    return result[0] || null;
  }

  async getWithImages(id: string): Promise<(Product & { images: ProductImage[] }) | null> {
    // Combine generated types for complex queries
    const result = await drizzle.query.product.findFirst({
      where: eq(product.id, id),
      with: { images: true },
    });

    return result || null;
  }
}
```

### Using Generated Types in API Routes

```typescript
import type { GeneratedAsset, Product } from 'visualizer-db/schema';

export async function GET(request: NextRequest) {
  // Type-safe database query
  const assets: GeneratedAsset[] = await drizzle
    .select()
    .from(generatedAsset)
    .where(eq(generatedAsset.clientId, clientId));

  // Type-safe mapping
  const mappedAssets = assets.map((asset: GeneratedAsset) => ({
    id: asset.id,
    url: asset.assetUrl,
    status: asset.status, // TypeScript ensures this field exists
    createdAt: asset.createdAt.toISOString(),
  }));

  return NextResponse.json(mappedAssets);
}
```

### Type-Safe Repository Responses

```typescript
import type { CollectionSession, GeneratedAsset } from 'visualizer-db/schema';

export interface CollectionWithStats extends CollectionSession {
  generatedCount: number;
  totalImages: number;
}

export async function getCollectionWithStats(id: string): Promise<CollectionWithStats | null> {
  const collection = await db.collectionSessions.getById(id);
  if (!collection) return null;

  // collection is typed as CollectionSession automatically
  const [totalCount, completedCount] = await Promise.all([
    // ... count queries
  ]);

  return {
    ...collection, // Spread typed collection
    generatedCount: completedCount,
    totalImages: totalCount,
  };
}
```

## Type Generation Process

1. Script connects to the live PostgreSQL database
2. Queries `information_schema.columns` for all table structures
3. Maps PostgreSQL types to TypeScript types
4. Generates interfaces with proper nullable handling
5. Outputs to `src/schema/generated/db-types.generated.ts`

## Important Notes

- **Do not edit** `db-types.generated.ts` manually - it's auto-generated
- Run type generation after schema migrations: `yarn db:push && yarn db:generate:types`
- The build script automatically runs type generation
- Generated types use `unknown` for `jsonb` columns (cast as needed)
- All Date columns are typed as `Date` (not strings)

## Schema Changes Workflow

1. Update Drizzle schema files (e.g., `src/schema/products.ts`)
2. Push schema to database: `yarn db:push`
3. Generate types: `yarn db:generate:types` (or `yarn build`)
4. TypeScript will show errors for any code that doesn't match the new schema
5. Fix TypeScript errors to align with new schema
6. Commit both schema changes and generated types

## Troubleshooting

**Q: Types are out of sync with database**
```bash
cd packages/visualizer-db
yarn db:push
yarn db:generate:types
```

**Q: TypeScript errors after schema change**
- This is expected! The errors guide you to update code that needs to change.
- Fix each error to align with the new schema.

**Q: Build fails with "DATABASE_URL not set"**
- Type generation requires a live database connection.
- Ensure `DATABASE_URL` is set in your environment.
- For CI/CD, you may need to skip type generation or use a test database.

## Integration with Other Packages

Generated types can be imported in any package:

```typescript
// In visualizer-services
import type { Product, GeneratedAsset } from 'visualizer-db/schema';

// In epox-platform app
import type { CollectionSession } from 'visualizer-db/types';
```

This ensures type consistency across the entire monorepo.
