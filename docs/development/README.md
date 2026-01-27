# Development Documentation

> Developer guides and workflows

---

## Overview

Complete development guides for:
- Getting started
- API development
- Frontend development
- Database migrations
- Implementation gaps

---

## Documents

### [Getting Started](./getting-started.md)
Initial setup and configuration:
- Prerequisites
- Installation
- First run
- Development server

### [API Development](./api-development.md)
Backend API patterns:
- Route structure
- Request/response handling
- Error handling
- Validation
- Database queries

### [Frontend Development](./frontend-development.md)
UI development patterns:
- Component structure
- State management
- Styling with Tailwind
- Forms and validation
- Error boundaries

### [Database Migrations](./database-migrations.md)
Schema changes workflow:
- Creating migrations
- Testing migrations
- Rolling back
- Best practices

### [Implementation Gaps](./implementation-gaps.md)
TODOs and missing features:
- Authentication integration
- Rate limiting
- Monitoring
- Known issues

---

## Quick Reference

### Common Commands

```bash
# Development
yarn dev                    # Start dev server
yarn test                   # Run tests
yarn test:watch             # Watch mode
yarn test:e2e               # E2E tests

# Code Quality
yarn lint                   # Lint code
yarn lint:fix               # Fix lint issues
yarn type-check             # Type checking
yarn format                 # Format with Prettier

# Database
cd packages/visualizer-db
yarn db:push                # Push schema
yarn db:studio              # Open Drizzle Studio
yarn db:generate            # Generate migrations

# Build
yarn build                  # Build all packages
yarn build:apps             # Build apps only
```

### File Structure

```
apps/epox-platform/
├── app/
│   ├── (auth)/             # Auth pages
│   ├── (dashboard)/        # Main app pages
│   └── api/                # API routes
│
├── components/
│   ├── studio/             # Studio components
│   ├── ui/                 # Reusable UI
│   └── layout/             # Layout components
│
├── lib/
│   ├── hooks/              # Custom hooks
│   ├── services/           # Service clients
│   └── utils/              # Utility functions
│
└── __tests__/
    ├── api/                # API tests
    ├── e2e/                # E2E tests
    └── components/         # Component tests
```

---

## Development Workflow

### Daily Workflow

1. **Pull latest changes**
   ```bash
   git pull origin master
   yarn install
   ```

2. **Start services**
   ```bash
   # Terminal 1: Database
   cd packages/visualizer-db && yarn db:start
   
   # Terminal 2: Dev server
   cd apps/epox-platform && yarn dev
   
   # Terminal 3: Tests (optional)
   yarn test:watch
   ```

3. **Make changes**
   - Write code
   - Add tests
   - Run linter

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push
   ```

### Feature Development

1. **Create branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Implement feature**
   - Add implementation
   - Add tests
   - Update documentation

3. **Test thoroughly**
   ```bash
   yarn test
   yarn test:e2e
   yarn lint
   yarn type-check
   ```

4. **Create PR**
   - Write clear description
   - Link related issues
   - Request review

---

## Best Practices

### Code Style

- Use TypeScript for type safety
- Follow existing patterns
- Keep functions small and focused
- Use meaningful variable names
- Add comments for complex logic

### Testing

- Write tests for new features
- Test edge cases
- Use meaningful test descriptions
- Mock external services
- Keep tests fast and isolated

### Git Commits

```bash
# Good commit messages
feat: add bubble preset feature
fix: resolve auth token expiration
docs: update API documentation
refactor: extract common utility functions

# Bad commit messages
update code
fix bug
wip
```

### Performance

- Optimize database queries
- Use SQL-level filtering
- Implement pagination
- Cache when appropriate
- Lazy load images
- Use virtual scrolling for large lists

### Security

- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Sanitize user data
- Check authentication
- Log security events

---

## Debugging

### Application Debugging

```typescript
// Add console logs
console.log('Debug:', variable);

// Use debugger
debugger;

// Check network requests
// Open DevTools -> Network tab

// Inspect React state
// Install React DevTools extension
```

### API Debugging

```bash
# Test API endpoints
curl http://localhost:3000/api/products

# Check logs
# See terminal output

# Database queries
# Check Drizzle Studio logs
```

### Database Debugging

```bash
# Open Drizzle Studio
cd packages/visualizer-db
yarn db:studio

# Query database directly
psql -h localhost -p 5432 -U postgres -d visualizer

# Check logs
docker logs visualizer-db
```

---

## Common Issues

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 yarn dev
```

### Database Connection Failed

```bash
# Check if running
docker ps | grep visualizer-db

# Start if needed
cd packages/visualizer-db && yarn db:start

# Check connection
yarn db:studio
```

### Type Errors

```bash
# Regenerate types
cd packages/visualizer-db
yarn db:generate:types

# Restart TypeScript server in VS Code
Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules
rm -rf .next
yarn install
yarn build
```

---

## Code Patterns

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'visualizer-db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    
    // Query database
    const items = await db.query.table.findMany({ limit: 20 });
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Custom Hook Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useMyAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previous = queryClient.getQueryData(['items']);
      queryClient.setQueryData(['items'], (old: any[]) =>
        old.filter(item => item.id !== id)
      );
      return { previous };
    },
    onError: (err, id, context) => {
      // Rollback on error
      queryClient.setQueryData(['items'], context?.previous);
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

---

## Related Documentation

- [Getting Started](./getting-started.md)
- [API Development](./api-development.md)
- [Frontend Development](./frontend-development.md)
- [Architecture](../architecture/README.md)
- [Testing](../testing/README.md)

---

**Last Updated:** 2026-01-26
