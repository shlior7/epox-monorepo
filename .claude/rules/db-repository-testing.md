# Database Repository Testing Requirements

## Mandatory Testing for New Methods

When adding or modifying any method in `packages/visualizer-db/src/repositories/`:

1. **Every new method MUST have corresponding tests**
2. **Tests must cover all parameters and options**
3. **Tests must be in `packages/visualizer-db/src/__tests__/repositories/<repository-name>.test.ts`**

## Test Requirements

### For each method, test:

1. **Happy path** - Normal successful operation
2. **Edge cases** - Empty arrays, null values, boundary conditions
3. **All options/parameters** - Every filter, sort, pagination option
4. **Error cases** - Invalid inputs, not found scenarios
5. **Return types** - Verify structure and types of returned data

### Example test structure:

```typescript
describe('RepositoryName', () => {
  describe('methodName', () => {
    it('should return expected result for valid input', async () => {});
    it('should handle empty input', async () => {});
    it('should filter by option X', async () => {});
    it('should filter by option Y', async () => {});
    it('should sort by option Z', async () => {});
    it('should paginate with limit and offset', async () => {});
    it('should throw/return null for not found', async () => {});
  });
});
```

## Running Tests

```bash
# Run all db tests
cd packages/visualizer-db && yarn test

# Run specific repository tests
cd packages/visualizer-db && yarn test repositories/generated-assets
```

## Test Helpers

Use helpers from `packages/visualizer-db/src/__tests__/helpers.ts`:

- `createTestId(prefix)` - Generate unique test IDs
- `createTestClient(db)` - Create test client
- `createTestProduct(db, clientId)` - Create test product
- `createTestCollectionSession(db, clientId)` - Create test collection session

## Before Merging

- [ ] All new methods have tests
- [ ] All tests pass
- [ ] Test coverage includes all parameters/options
- [ ] Edge cases are covered
