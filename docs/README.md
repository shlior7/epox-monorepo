# Epox Platform Documentation

> **Last Updated:** 2026-01-26
>
> Complete documentation for the Epox monorepo - AI-powered product visualization platform.

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[Getting Started Guide](./getting-started.md)** - Setup and first steps
2. **[Architecture Overview](./architecture/system-overview.md)** - System design
3. **[Development Guide](./development/README.md)** - Start building

---

## 📚 Documentation Sections

### 🏗️ [Architecture](./architecture/README.md)
Understand the system design, packages, and data flow.

- [System Overview](./architecture/system-overview.md) - High-level architecture
- [Database Schema](./architecture/database-schema.md) - Data models and relationships
- [Shared Architecture](./architecture/shared-architecture.md) - Package dependencies
- [Packages](./architecture/packages.md) - Monorepo structure

### ✨ [Features](./features/README.md)
Detailed documentation for implemented features.

- **[Bubble System](./features/bubble-system/README.md)** - Extensible inspiration system
  - [Overview](./features/bubble-system/overview.md)
  - [Implementation](./features/bubble-system/implementation.md)
  - [Complete Summary](./features/bubble-system/complete-summary.md)
- [Optimistic Updates](./features/optimistic-updates.md) - Instant UI feedback
- [Backend Integration](./features/backend-integration.md) - Service integration
- [Store Integration](./features/store-integration.md) - E-commerce platforms

### 🧪 [Testing](./testing/README.md)
Complete testing guides and strategies.

- **[E2E Testing](./testing/e2e/README.md)** - End-to-end with Playwright
  - [Testcontainers Guide](./testing/e2e/testcontainers-guide.md)
  - [Feature-Based Testing](./testing/e2e/feature-based-testing.md)
  - [Test Status](./testing/e2e/test-status.md)
- [Unit Testing](./testing/unit-testing.md) - API and component tests
- [Security Testing](./testing/security-audit.md) - Security audits

### 🚀 [Deployment](./deployment/README.md)
Production deployment and infrastructure.

- [Production Readiness](./deployment/production-readiness.md) - Deployment checklist
- [Environment Setup](./deployment/environment-variables.md) - Configuration
- [Performance](./deployment/performance-improvements.md) - Optimization results
- **Services:**
  - [Generation Worker](./deployment/services/generation-worker.md)
  - [Worker Autoscaler](./deployment/services/worker-autoscaler.md)

### 💻 [Development](./development/README.md)
Developer guides and workflows.

- [Getting Started](./development/getting-started.md) - Setup instructions
- [API Development](./development/api-development.md) - Backend patterns
- [Frontend Development](./development/frontend-development.md) - UI patterns
- [Database Migrations](./development/database-migrations.md) - Schema changes
- [Implementation Gaps](./development/implementation-gaps.md) - TODOs

### 🎨 [Design](./design/README.md)
Design documents and UI specifications.

- [Design Principles](./design/README.md)
- [Design Plans](./plans/README.md) - Original design logs
- [UI Visual Guide](./design/ui-visual-slideshow.md)

### 🗺️ [Roadmap](./roadmap/README.md)
Future plans and priorities.

- [What's Next](./roadmap/whats-next.md) - Complete roadmap
- [TODO](./roadmap/todo.md) - Task list

---

## 📖 Documentation by Role

### For Developers

**Start Here:**
1. [Getting Started](./getting-started.md)
2. [Architecture Overview](./architecture/system-overview.md)
3. [Development Guide](./development/README.md)

**Then:**
- [API Development](./development/api-development.md)
- [Database Schema](./architecture/database-schema.md)
- [Testing Guide](./testing/README.md)

### For QA/Testers

**Start Here:**
1. [E2E Testing Overview](./testing/e2e/README.md)
2. [Testcontainers Guide](./testing/e2e/testcontainers-guide.md)
3. [Feature-Based Testing](./testing/e2e/feature-based-testing.md)

**Then:**
- [Unit Testing](./testing/unit-testing.md)
- [Test Status](./testing/e2e/test-status.md)

### For Product Managers

**Start Here:**
1. [Design Plans](./plans/README.md)
2. [Features Overview](./features/README.md)
3. [Roadmap](./roadmap/whats-next.md)

**Then:**
- [Production Readiness](./deployment/production-readiness.md)
- [Implementation Gaps](./development/implementation-gaps.md)

### For DevOps

**Start Here:**
1. [Production Setup](./deployment/production-setup.md)
2. [Environment Variables](./deployment/environment-variables.md)
3. [Services](./deployment/services/)

**Then:**
- [Performance Guide](./deployment/performance-improvements.md)
- [Security Audit](./testing/security-audit.md)

---

## 🔍 Search by Topic

### Architecture & Design
- System design → [Architecture](./architecture/README.md)
- Database schema → [Database Schema](./architecture/database-schema.md)
- Package structure → [Packages](./architecture/packages.md)
- Design decisions → [Design Plans](./plans/README.md)

### Features
- Bubble system → [Bubble System](./features/bubble-system/README.md)
- Optimistic updates → [Optimistic Updates](./features/optimistic-updates.md)
- Store integration → [Store Integration](./features/store-integration.md)
- Backend services → [Backend Integration](./features/backend-integration.md)

### Testing
- E2E testing → [E2E Guide](./testing/e2e/README.md)
- Unit testing → [Unit Testing](./testing/unit-testing.md)
- Test containers → [Testcontainers](./testing/e2e/testcontainers-guide.md)
- Security → [Security Audit](./testing/security-audit.md)

### Deployment
- Production deploy → [Production Readiness](./deployment/production-readiness.md)
- Environment config → [Environment Variables](./deployment/environment-variables.md)
- Worker services → [Services](./deployment/services/)
- Performance → [Performance Guide](./deployment/performance-improvements.md)

### Development
- Getting started → [Getting Started](./getting-started.md)
- API patterns → [API Development](./development/api-development.md)
- UI patterns → [Frontend Development](./development/frontend-development.md)
- Database changes → [Database Migrations](./development/database-migrations.md)

---

## 📊 Project Status

### ✅ Production Ready
- Core API routes (5/5 optimized)
- Bubble system (7 types, extensible)
- Optimistic updates (all features)
- Store integration (WooCommerce, Shopify)
- Backend integration (database, storage, AI)

### 🚧 In Progress
- E2E tests (22 failed, needs fixes)
- Authentication integration
- Rate limiting
- Monitoring setup

### 📋 Planned
- Credit system (Phase 2)
- Subscriptions (Phase 3)
- Enterprise features (Phase 4)

**See:** [Roadmap](./roadmap/whats-next.md) for details

---

## 🎯 Key Achievements

### Performance Improvements
- Products API: **60x faster** (3s → 50ms)
- Collections API: **25-40x faster**
- Generated Images API: **50x faster**
- Memory usage: **60-500x reduction**

### Architecture
- Monorepo structure with Turborepo
- Type-safe database with Drizzle ORM
- Extensible feature system
- Production-ready services

### Testing
- Comprehensive E2E testing with Testcontainers
- Feature-based test organization
- Pre-configured test clients
- Isolated test environments

---

## 📝 Contributing to Documentation

### Standards
- Use clear, concise language
- Include code examples
- Add diagrams for complex flows (mermaid)
- Document trade-offs and decisions
- Update cross-references
- Include last updated date

### Structure
Each document should have:
1. Clear title and description
2. Table of contents (if long)
3. Main content with examples
4. Related links
5. Last updated date

### Adding New Docs
1. Place in appropriate category folder
2. Update section README
3. Update main index (this file)
4. Add cross-references
5. Update search section

---

## 🔗 External Resources

### Packages
- [visualizer-db](../packages/visualizer-db/README.md) - Database layer
- [visualizer-ai](../packages/visualizer-ai/README.md) - AI services
- [visualizer-storage](../packages/visualizer-storage/README.md) - File storage
- [visualizer-auth](../packages/visualizer-auth/README.md) - Authentication

### Services
- [generation-worker](../services/generation-worker/README.md) - Background jobs
- [worker-autoscaler](../services/worker-autoscaler/README.md) - Auto-scaling
- [erp-service](../services/erp-service/README.md) - E-commerce integration

### Project Rules
- [Claude Rules](../.claude/rules/) - Development guidelines
- [Design Log Methodology](../.claude/rules/design-log.md)
- [Test Client Guide](../.claude/rules/test-clients.md)

---

## 💡 Need Help?

1. **Check this index** for relevant documentation
2. **Search by topic** using the section above
3. **Review examples** in code and tests
4. **Check package READMEs** for specific implementations
5. **Review design plans** for original decisions

**Still stuck?**
- Check the [roadmap](./roadmap/whats-next.md) for known issues
- Review [implementation gaps](./development/implementation-gaps.md)
- Look at test examples in `__tests__/` directories

---

**Maintained By:** Development Team
**Last Updated:** 2026-01-26
**Version:** 2.0.0 - Consolidated Documentation
