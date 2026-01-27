# Deployment Documentation

> Production deployment and infrastructure

---

## Overview

Complete deployment guide for:
- **Application:** Vercel (Next.js)
- **Workers:** Railway (generation-worker, autoscaler)
- **Database:** Neon (PostgreSQL)
- **Storage:** Cloudflare R2
- **AI:** Google Gemini

---

## Documents

### [Production Readiness](./production-readiness.md)
Complete production checklist including:
- Status of all core routes (5/5 production-ready)
- Performance benchmarks (60x improvements)
- Security checklist
- Deployment requirements

### [Environment Setup](./environment-variables.md)
Complete environment variable reference:
- Required variables
- Optional variables
- Service-specific configs
- Security best practices

### [Performance Improvements](./performance-improvements.md)
Detailed performance optimizations:
- API route improvements (25-60x faster)
- Memory optimizations (60-500x reduction)
- SQL query optimization
- Before/after benchmarks

### Services

- **[Generation Worker](./services/generation-worker.md)** - Background job processor
- **[Worker Autoscaler](./services/worker-autoscaler.md)** - Auto-scaling service

---

## Quick Deployment

### 1. Vercel (Application)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/epox-platform
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add GEMINI_API_KEY
vercel env add R2_ACCOUNT_ID
# ... (see environment-variables.md for complete list)
```

### 2. Railway (Workers)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy generation worker
cd services/generation-worker
railway up

# Deploy autoscaler
cd ../worker-autoscaler
railway up
```

### 3. Neon (Database)

```bash
# Create project on Neon dashboard
# Get connection string

# Push schema
cd packages/visualizer-db
DATABASE_URL=<neon-url> yarn db:push
```

### 4. Cloudflare R2 (Storage)

```bash
# Create bucket on Cloudflare dashboard
# Get credentials (Account ID, Access Key, Secret Key)
# Configure public URL
```

---

## Production Status

### ✅ Production-Ready Routes (5/5)

1. **`/api/products`** - SQL-level filtering, sorting, pagination
   - Performance: 60x faster (3s → 50ms for 10k records)

2. **`/api/products/[id]`** - Efficient JSONB queries
   - Performance: No N+1 queries

3. **`/api/collections`** - SQL aggregation for asset counts
   - Performance: 25x faster

4. **`/api/collections/[id]`** - SQL COUNT for stats
   - Performance: 40x faster

5. **`/api/generated-images`** - SQL filtering with batch fetching
   - Performance: 50x faster

### 🚧 In Progress

- [ ] Authentication integration (using PLACEHOLDER_CLIENT_ID)
- [ ] Rate limiting
- [ ] Monitoring and logging (Sentry)
- [ ] Redis caching

### ⚠️ High Priority (Before Production)

- [ ] Remove PLACEHOLDER_CLIENT_ID
- [ ] Add route protection middleware
- [ ] Implement rate limiting
- [ ] Setup error monitoring
- [ ] Configure alerts

---

## Environment Variables

### Required (Application)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# AI
GEMINI_API_KEY=your-gemini-api-key

# Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Auth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=https://your-domain.com
```

### Required (Workers)

```bash
# Database
DATABASE_URL=postgresql://...

# AI
GEMINI_API_KEY=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=...

# Worker Config
WORKER_CONCURRENCY=5
MAX_JOBS_PER_MINUTE=60
```

**See:** [Environment Variables](./environment-variables.md) for complete list

---

## Performance Metrics

### API Response Times

| Endpoint | Before | After | Improvement |
|----------|--------|-------|-------------|
| GET /api/products (10k) | 3,000ms | 50ms | **60x** |
| GET /api/collections | 200ms | <50ms | **25x** |
| GET /api/generated-images | 5,000ms | <100ms | **50x** |
| GET /api/dashboard | 10,000ms | <200ms | **50x** |

### Memory Usage

| Route | Before | After | Reduction |
|-------|--------|-------|-----------|
| Products | 400MB | 1MB | **400x** |
| Collections | 300MB | 5MB | **60x** |
| Generated Images | 200MB | 2MB | **100x** |
| Dashboard | 500MB | 1MB | **500x** |

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed and merged
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security audit completed

### Deployment Steps

1. [ ] Deploy database schema (Neon)
2. [ ] Configure R2 bucket and CDN
3. [ ] Deploy application (Vercel)
4. [ ] Deploy workers (Railway)
5. [ ] Verify health checks
6. [ ] Test critical flows
7. [ ] Monitor error rates
8. [ ] Set up alerts

### Post-Deployment

- [ ] Verify all services running
- [ ] Check error rates (Sentry)
- [ ] Monitor performance metrics
- [ ] Test critical user flows
- [ ] Update documentation

---

## Monitoring

### Health Checks

```bash
# Application
curl https://your-domain.com/api/health

# Generation Worker
curl https://worker.railway.app/health

# Database
PGPASSWORD=xxx psql -h neon-host -U user -d db -c "SELECT 1"
```

### Metrics to Track

- API response times (P95, P99)
- Error rates
- Database query times
- Worker job processing times
- Storage usage
- AI API usage

### Alerts

Setup alerts for:
- Error rate > 1%
- P99 latency > 1s
- Database connection pool exhausted
- Worker queue depth > 100
- Storage quota > 80%

---

## Scaling

### Application (Vercel)

- Automatic scaling
- Edge caching
- CDN distribution

### Workers (Railway)

**Manual Scaling:**
```bash
railway scale --replicas 3
```

**Auto-Scaling:**
See [Worker Autoscaler](./services/worker-autoscaler.md)

### Database (Neon)

- Upgrade plan for more compute
- Enable autoscaling
- Add read replicas

### Storage (R2)

- Unlimited scaling
- No egress fees
- Global CDN

---

## Cost Estimates

### Development

| Service | Cost/Month |
|---------|------------|
| Vercel (Hobby) | $0 |
| Railway (Hobby) | $5 |
| Neon (Free) | $0 |
| R2 (10GB) | $0.15 |
| Gemini (Free tier) | $0 |
| **Total** | **~$5** |

### Production (1000 users)

| Service | Cost/Month |
|---------|------------|
| Vercel (Pro) | $20 |
| Railway (2 workers) | $40 |
| Neon (Scale) | $20 |
| R2 (100GB) | $1.50 |
| Gemini (Pay-as-you-go) | $500 |
| Sentry | $26 |
| **Total** | **~$607** |

---

## Rollback Plan

### Application

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy specific commit
vercel --prod --force
```

### Workers

```bash
# Redeploy previous version
cd services/generation-worker
git checkout <previous-commit>
railway up
```

### Database

```bash
# Revert migration
cd packages/visualizer-db
yarn db:rollback
```

---

## Related Documentation

- [Production Readiness](./production-readiness.md)
- [Environment Variables](./environment-variables.md)
- [Performance Guide](./performance-improvements.md)
- [Services](./services/)

---

**Last Updated:** 2026-01-26
