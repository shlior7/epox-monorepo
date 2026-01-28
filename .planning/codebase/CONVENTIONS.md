# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- kebab-case for all source files (`url-validator.ts`, `user-service.ts`)
- PascalCase for React components (`ImageEditorModal.tsx`, `ProductAssetCard.tsx`)
- Lowercase for UI primitives (`button.tsx`, `input.tsx`, `card.tsx`)
- `*.test.ts` for unit tests, `*.spec.ts` for E2E tests
- `index.ts` for barrel exports

**Functions:**
- camelCase for all functions
- No special prefix for async functions
- `handle*` for event handlers (`handleTestButtonClick`)
- `create*` for factory functions (`createTestClient`, `createNavigationHelper`)
- `with*` for middleware wrappers (`withSecurity`, `withPublicSecurity`)
- `get*` for getters (`getById`, `getGeminiService`)
- `use*` for React hooks (`useJobStatus`, `useAssetActions`)

**Variables:**
- camelCase for variables
- UPPER_SNAKE_CASE for module-level constants (`VISUALIZATION_TYPES`)
- `is*`/`has*`/`can*` prefixes for booleans (`isFavorite`, `hasIcon`)

**Types:**
- PascalCase for interfaces and types, no `I` prefix (`Product`, `User`, `CollectionSession`)
- PascalCase for classes (`ProductRepository`, `GeminiService`, `BaseRepository`)
- `*Options` for option objects (`ProductListOptions`)
- `*Error` for error classes (`NotFoundError`)

## Code Style

**Formatting:**
- Prettier with `.prettierrc.json`
- 140 character line length
- Single quotes for strings
- Trailing commas (ES5)
- 2 space indentation (`.editorconfig`)

**Linting:**
- ESLint with `.eslintrc.js`
- TypeScript strict mode enabled
- Key rules:
  - `curly: ['error', 'all']` - Braces required for all blocks
  - `eqeqeq: ['error', 'always']` - Strict equality
  - `prefer-const: 'error'` - Use const when not reassigned
  - `prefer-template: 'error'` - Template literals over concatenation
  - `@typescript-eslint/consistent-type-imports: ['error']` - Explicit type imports
  - `@typescript-eslint/switch-exhaustiveness-check: 'error'` - Exhaustive switches
- Run: `yarn lint`

**Pre-commit:**
- Lefthook + lint-staged
- Prettier formatting on staged files
- Syncpack for dependency version sync

## Import Organization

**Order:**
1. External packages (`react`, `drizzle-orm`, `next`)
2. Internal packages (`visualizer-db`, `visualizer-ai`)
3. Relative imports (`./utils`, `../types`)
4. Type imports (`import type { Product }`)

**Grouping:**
- Blank line between groups
- Perfectionist plugin enforces sorting in some workspaces
- Type imports use explicit `import type` syntax (enforced by ESLint)

**Path Aliases:**
- `@/` maps to project root in Next.js apps
- Package names used for cross-package imports (`import { db } from 'visualizer-db'`)

## Error Handling

**Patterns:**
- Repositories throw `NotFoundError` for missing entities (`packages/visualizer-db/src/errors.ts`)
- API routes validate input and return 400 with descriptive JSON messages
- `withSecurity()` catches exceptions and returns appropriate HTTP status
- Workers retry on transient failures

**Error Types:**
- Throw on: missing entities, invalid input, auth failures
- Return null on: optional lookups (`getById` returns `T | null`)
- Throw with `requireById`: mandatory lookups that must exist

## Logging

**Framework:**
- Pino 9.6.0 for structured JSON logging
- Pino Pretty for development output
- Better Stack (Logtail) transport for production

**Patterns:**
- Log at service boundaries and external API calls
- Security events logged via `apps/epox-platform/lib/security/logging.ts`
- Worker logs job lifecycle events

## Comments

**When to Comment:**
- Explain business logic and complex algorithms
- Document repository relationships and constraints
- JSDoc for public API functions

**JSDoc:**
- Used for service classes and repository methods
- `@param`, `@returns`, `@throws` tags

**TODO Comments:**
- Format: `// TODO: description`
- No username prefix (use git blame)

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Extract helpers for complex logic

**Parameters:**
- Options objects for complex parameters (`ProductListOptions`)
- Destructure in parameter list

**Return Values:**
- Explicit return types on public methods
- `T | null` for optional lookups
- Throw for mandatory lookups

## Module Design

**Exports:**
- Named exports preferred
- Barrel exports via `index.ts`
- Facade pattern for complex subsystems (`DatabaseFacade`)

**Repository Pattern:**
- Extend `BaseRepository<T>` for entity repositories
- Register in `DatabaseFacade` for unified access
- One repository per domain entity

**Component Pattern:**
- Feature components in `components/{feature}/`
- UI primitives in `components/ui/`
- Each component gets unique `data-testid` attribute

---

*Convention analysis: 2026-01-28*
*Update when patterns change*
