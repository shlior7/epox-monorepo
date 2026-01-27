# Epox Platform Monorepo

> AI-powered product visualization platform

---

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Start database
cd packages/visualizer-db && yarn db:start

# Start development server
cd apps/epox-platform && yarn dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

**Complete documentation is in [`/docs`](./docs/README.md)**

### Quick Links

- **[Getting Started](./docs/getting-started.md)** - Setup and first steps
- **[Architecture](./docs/architecture/README.md)** - System design
- **[Features](./docs/features/README.md)** - Implemented features
- **[Testing](./docs/testing/README.md)** - Testing guides
- **[Deployment](./docs/deployment/README.md)** - Production deployment
- **[Development](./docs/development/README.md)** - Developer guides
- **[Roadmap](./docs/roadmap/whats-next.md)** - Future plans

---

## 🏗️ Project Structure

```
epox-monorepo/
├── apps/
│   ├── epox-platform/          # Main application (Next.js)
│   └── epox-admin/             # Admin console (legacy)
│
├── packages/
│   ├── visualizer-db/          # Database layer (Drizzle ORM)
│   ├── visualizer-ai/          # AI services (Gemini)
│   ├── visualizer-storage/     # File storage (R2/S3)
│   ├── visualizer-auth/        # Authentication (Better Auth)
│   └── visualizer-types/       # Shared TypeScript types
│
├── services/
│   ├── generation-worker/      # Background job processor
│   ├── worker-autoscaler/      # Auto-scaling service
│   └── erp-service/            # E-commerce integration
│
└── docs/                       # Complete documentation
    ├── architecture/           # System design
    ├── features/               # Feature guides
    ├── testing/                # Testing documentation
    ├── deployment/             # Deployment guides
    ├── development/            # Developer guides
    ├── design/                 # Design docs and plans
    └── roadmap/                # Future plans
```

---

## 🎯 Key Features

### ✅ Production Ready

- **Bubble System** - Extensible inspiration system (7 types)
- **Optimistic Updates** - Instant UI feedback
- **Store Integration** - WooCommerce, Shopify
- **Backend Integration** - Database, Storage, AI
- **Performance** - 60x API improvements

### 🚧 In Progress

- E2E test fixes
- Authentication integration
- Rate limiting
- Monitoring setup

**See:** [Roadmap](./docs/roadmap/whats-next.md) for details

---

## 🧪 Testing

```bash
# Unit tests
yarn test
yarn test:watch

# E2E tests
yarn test:e2e
yarn test:e2e:ui
```

**See:** [Testing Guide](./docs/testing/README.md)

---

## 🚀 Deployment

### Applications
- **Vercel** - Next.js application
- **Railway** - Background workers

### Infrastructure
- **Neon** - PostgreSQL database
- **Cloudflare R2** - File storage
- **Google Gemini** - AI services

**See:** [Deployment Guide](./docs/deployment/README.md)

---

## 📊 Performance

### API Improvements
- Products API: **60x faster** (3s → 50ms)
- Collections API: **25-40x faster**
- Generated Images API: **50x faster**
- Memory: **60-500x reduction**

**See:** [Performance Guide](./docs/deployment/performance-improvements.md)

---

## 🛠️ Development

### Common Commands

```bash
# Development
yarn dev                    # Start dev server
yarn test                   # Run tests
yarn lint                   # Lint code

# Database
cd packages/visualizer-db
yarn db:push                # Push schema
yarn db:studio              # Open Drizzle Studio

# Build
yarn build                  # Build all packages
```

**See:** [Development Guide](./docs/development/README.md)

---

## 📖 Learn More

### For Developers
1. [Getting Started](./docs/getting-started.md)
2. [Architecture Overview](./docs/architecture/system-overview.md)
3. [API Development](./docs/development/api-development.md)

### For QA/Testers
1. [E2E Testing](./docs/testing/e2e/README.md)
2. [Testcontainers Guide](./docs/testing/e2e/testcontainers-guide.md)
3. [Test Status](./docs/testing/e2e/test-status.md)

### For Product Managers
1. [Features Overview](./docs/features/README.md)
2. [Design Plans](./docs/plans/README.md)
3. [Roadmap](./docs/roadmap/whats-next.md)

### For DevOps
1. [Production Setup](./docs/deployment/production-setup.md)
2. [Environment Variables](./docs/deployment/environment-variables.md)
3. [Services](./docs/deployment/services/)

---

## 🤝 Contributing

1. Read the [Development Guide](./docs/development/README.md)
2. Follow [code standards](./.claude/rules/guidelines.md)
3. Write tests for new features
4. Update documentation
5. Create pull request

---

## 🔗 Links

- **Documentation:** [`/docs`](./docs/README.md)
- **Design Logs:** [`/docs/plans`](./docs/plans/README.md)
- **Project Rules:** [`.claude/rules`](./.claude/rules/)

---

**Last Updated:** 2026-01-26
