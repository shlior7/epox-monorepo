# Architecture Documentation

> System design, packages, and technical architecture

---

## Overview

The Epox platform is a monorepo-based application built with:
- **Frontend:** Next.js 14 (App Router)
- **Database:** PostgreSQL with Drizzle ORM
- **Storage:** Cloudflare R2
- **AI:** Google Gemini
- **Auth:** Better Auth
- **Deployment:** Vercel (app) + Railway (workers)

---

## Documents

### [System Overview](./system-overview.md)
High-level architecture including:
- Application structure
- Data flow diagrams
- Technology stack
- Service integrations

### [Database Schema](./database-schema.md)
Database design including:
- Entity relationships
- Table schemas
- Indexes and constraints
- Migration patterns

### [Shared Architecture](./shared-architecture.md)
Package dependencies and sharing:
- Monorepo structure
- Package relationships
- Code reuse patterns

### [Packages](./packages.md)
Individual package documentation:
- visualizer-db
- visualizer-ai
- visualizer-storage
- visualizer-auth
- visualizer-types

---

## Quick Reference

### Core Concepts

**Monorepo Structure:**
```
apps/       - Applications (epox-platform, epox-admin)
packages/   - Shared libraries
services/   - Background workers
```

**Data Flow:**
```
User → Next.js App → API Routes → Services → Database
                                  ↓
                            Storage (R2)
                                  ↓
                            AI (Gemini)
```

**Key Technologies:**
- **Turborepo:** Build system
- **Drizzle ORM:** Type-safe database access
- **TanStack Query:** Server state management
- **Tailwind CSS:** Styling

---

## Design Decisions

### Why Monorepo?
- Code sharing between apps
- Consistent tooling
- Atomic changesets
- Simplified dependencies

### Why Drizzle over Prisma?
- Better TypeScript integration
- More control over queries
- Smaller bundle size
- No schema.prisma lock-in

### Why Cloudflare R2 over S3?
- Lower costs (no egress fees)
- S3-compatible API
- Already in use
- Global CDN

### Why Better Auth?
- Modern authentication
- Built for App Router
- TypeScript-first
- Flexible providers

---

## Related Documentation

- [System Overview](./system-overview.md)
- [Database Schema](./database-schema.md)
- [Design Plans](../plans/README.md)
- [Package READMEs](../../packages/)

---

**Last Updated:** 2026-01-26
