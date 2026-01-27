# What's Next - Roadmap and TODOs

> **Last Updated:** 2026-01-26
>
> This document consolidates all TODOs and planned enhancements across the entire monorepo.

---

## 🎯 Immediate Priorities (This Week)

### 1. E2E Test Fixes (Critical)

**Issue:** 22 E2E tests failing due to Better Auth WebSocket issues

**Root Cause:**
- Better Auth trying to connect to WebSocket service (`wss://localhost/v2`)
- Self-signed certificate errors
- Server falling back to dev mode
- Authentication returning 401/500 errors

**Tasks:**
- [ ] Investigate Better Auth WebSocket configuration
- [ ] Check if WebSocket can be disabled for tests
- [ ] Verify DATABASE_URL propagation to dev server
- [ ] Add TEST_MODE bypass if auth can't be fixed quickly

**Documentation:** [E2E_TEST_STATUS.md](../apps/epox-platform/E2E_TEST_STATUS.md)

### 2. Authentication Integration

**Status:** All routes currently use `PLACEHOLDER_CLIENT_ID = 'demo-client'`

**Tasks:**
- [ ] Create auth HOF wrapper files
  - `lib/auth/admin-route.ts`
  - `lib/auth/access.ts`
- [ ] Replace `PLACEHOLDER_CLIENT_ID` with `session.clientId`
- [ ] Add route protection middleware
- [ ] Test all authenticated flows

**Impact:** Required before production deployment

**Documentation:** [BACKEND_INTEGRATION_SUMMARY.md](../apps/epox-platform/BACKEND_INTEGRATION_SUMMARY.md)

---

## 📋 Short-Term (This Month)

### Testing

#### Unit Tests
- [ ] Add tests for new bubble system features
- [ ] Increase coverage for optimistic update hooks
- [ ] Test store integration edge cases
- [ ] Add snapshot tests for critical UI components

#### E2E Tests
- [ ] Fix failing tests (see Immediate Priorities)
- [ ] Add tests for new features (bubbles, store)
- [ ] Implement visual regression testing
- [ ] Add performance benchmarks to E2E suite

**Current Status:**
- Unit tests: ~80% coverage (good)
- E2E tests: 22 failed, 13 passed (needs work)
- Integration tests: Limited (needs expansion)

**Documentation:** [TESTING.md](../apps/epox-platform/TESTING.md)

### Performance Optimization

**Current State:** Core routes optimized (5/5 production-ready)

**Remaining Work:**
- [ ] Add Redis caching for filter options (products, collections)
- [ ] Implement full-text search indexes for products
- [ ] Optimize remaining N+1 queries in generated images
- [ ] Add database query monitoring and alerting
- [ ] Implement lazy loading for image galleries
- [ ] Add virtual scrolling for large lists

**Performance Targets:**
- API response time: P95 < 200ms, P99 < 500ms ✅ (achieved)
- Memory usage: < 100MB per request ✅ (achieved)
- Database queries: < 3 per request (needs work for some routes)
- Concurrent users: Handle 1000+ simultaneous users (untested)

**Documentation:** [PRODUCTION_READINESS_STATUS.md](../apps/epox-platform/PRODUCTION_READINESS_STATUS.md)

### Monitoring & Logging

**Current State:** Minimal logging, no monitoring

**Tasks:**
- [ ] Setup Sentry for error tracking
  - Configure DSN
  - Add user context
  - Track performance metrics
- [ ] Add API analytics
  - Request counts per endpoint
  - Response times
  - Error rates
- [ ] Implement slow query alerts
  - Setup threshold (>1s queries)
  - Slack notifications
- [ ] Add performance monitoring
  - Core Web Vitals
  - API latency tracking
  - Database query times

**Documentation:** [.claude/rules/sentry.md](../.claude/rules/sentry.md)

### Security

**High Priority (Before Production):**
- [x] Input validation on all API routes ✅
- [x] SQL injection prevention (parameterized queries) ✅
- [ ] Rate limiting implementation
  - Per-endpoint limits
  - Per-user quotas
  - DDoS protection
- [ ] Authentication on all routes (see Immediate Priorities)
- [ ] File upload security hardening
  - Virus scanning
  - Size limits enforcement
  - Type validation
- [ ] CORS configuration review
- [ ] Environment variable security audit

---

## 🚀 Medium-Term (Next 3 Months)

### Feature Enhancements

#### Bubble System Extensions

**Current State:** 7 bubble types, fully extensible

**Planned Additions:**
- [ ] **Bubble Presets** - Save/load common bubble combinations
  - User can save "Modern Living Room" preset
  - Preset includes: style, lighting, camera angle, mood
  - Share presets across collections
- [ ] **Bubble Templates** - Industry-specific quick starts
  - "Furniture E-commerce" template
  - "Interior Design Portfolio" template
  - "Real Estate Listing" template
- [ ] **Bubble Sharing** - Share configurations between clients
  - Export/import bubble configurations as JSON
  - Public template marketplace (future)
- [ ] **Bubble Analytics** - Track which bubbles produce best results
  - Success rate per bubble type
  - User favorites
  - Popular combinations
- [ ] **Bubble Validation** - AI-powered recommendations
  - Suggest complementary bubbles
  - Warn about conflicting settings
  - Auto-optimize for best results
- [ ] **Bubble History** - Undo/redo bubble changes
  - Track bubble modifications
  - Restore previous configurations
  - Compare versions

**Documentation:** [BUBBLE_SYSTEM_COMPLETE.md](../apps/epox-platform/BUBBLE_SYSTEM_COMPLETE.md)

#### Store Integration Enhancements

**Current State:** Basic sync with WooCommerce and Shopify

**Planned Additions:**
- [ ] **Bidirectional Sync** - Push generated images back to store
  - Update product images on store
  - Sync product metadata changes
  - Handle conflicts
- [ ] **Selective Sync** - Choose which products to sync
  - Filter by category
  - Filter by tags
  - Manual selection
- [ ] **Scheduled Sync** - Automatic periodic updates
  - Daily/weekly sync schedules
  - Sync on product creation/update webhooks
  - Background job processing
- [ ] **Variant Support** - Handle product variations
  - Sync all variants
  - Generate images per variant
  - Map variant attributes
- [ ] **Additional Platforms**
  - BigCommerce
  - Magento
  - Squarespace
  - Custom API support

**Documentation:** [Store Integration](../docs/features/store-integration.md)

#### Optimistic Updates Extensions

**Current State:** Complete for core features (products, collections, assets, store)

**Planned Additions:**
- [ ] **Generation Flow Updates** - Optimistic flow creation/updates
  - Instant flow card appearance
  - Inline editing
  - Drag-and-drop reordering
- [ ] **Bulk Operations** - Optimistic bulk actions
  - Multi-select delete (instant removal)
  - Bulk favorite (instant toggle)
  - Batch operations UI feedback
- [ ] **Conflict Resolution** - Handle concurrent edits
  - Detect conflicts
  - Show conflict resolution UI
  - Merge strategies

**Documentation:** [OPTIMISTIC_UPDATES.md](../apps/epox-platform/OPTIMISTIC_UPDATES.md)

### Database Improvements

#### Schema Enhancements
- [ ] Add full-text search columns
  - Products (name, description, tags)
  - Collections (name, description)
  - Generated assets (metadata)
- [ ] Add materialized views for common queries
  - Dashboard stats (product counts, asset counts)
  - Collection stats (generated counts, status summaries)
- [ ] Implement soft delete with 30-day recovery
  - Currently hard deletes
  - Add `deleted_at` column
  - Cleanup job for expired deletions

#### Performance
- [ ] Add missing indexes
  - `collection_session_client_status_idx`
  - `generated_asset_approval_idx`
  - `generated_asset_pinned_idx`
- [ ] Optimize JSONB queries
  - Add GIN indexes on productIds
  - Create expression indexes for common filters
- [ ] Implement database connection pooling
  - Configure Drizzle pool size
  - Add connection monitoring

**Documentation:** [REMAINING_ROUTES_TODO.md](../apps/epox-platform/REMAINING_ROUTES_TODO.md#database-indexes-to-add-if-needed)

### API Enhancements

#### New Endpoints
- [ ] `/api/dashboard/stats` - Real-time dashboard stats
- [ ] `/api/export` - Bulk export (ZIP download)
- [ ] `/api/bulk-operations` - Batch operations endpoint
- [ ] `/api/webhooks` - Store webhook handlers

#### Existing Endpoints
- [ ] Add GraphQL support (optional, future)
- [ ] Implement request/response caching
- [ ] Add API versioning (v1, v2)
- [ ] Document all endpoints with OpenAPI/Swagger

**Documentation:** [API Development](../docs/development/api-development.md)

---

## 🎨 Long-Term (6-18 Months)

### Phase 2: Credit System (Months 4-9)

**Goal:** Enable self-service signup and pay-as-you-go pricing

**Monetization:**
- 10 free credits on signup (expires in 30 days)
- Credit packages: $12 (50), $40 (200), $150 (1000)
- Target: $10K MRR, 15% conversion rate

**Database Changes:**
```sql
-- Add to members table
ALTER TABLE members ADD COLUMN credit_balance INTEGER DEFAULT 0;

-- New tables
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund', 'grant'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_packages (
  id UUID PRIMARY KEY,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true
);
```

**Tasks:**
- [ ] Database schema migration
- [ ] Stripe integration for payments
- [ ] Credit purchase UI
- [ ] Generation quota checks (deduct credits)
- [ ] Self-service signup flow
- [ ] Credit usage analytics
- [ ] Refund handling
- [ ] Credit expiration logic

**Documentation:** [Design Log #002](../docs/README.md#authentication--security), [Design Log #008](../docs/README.md#business-model--pricing)

### Phase 3: Subscriptions (Months 10-18)

**Goal:** Recurring revenue with store sync features

**Subscription Tiers:**
- **Basic:** $49/mo (100 products, 100 credits/mo)
- **Pro:** $149/mo (500 products, 500 credits/mo)
- **Business:** $399/mo (2000 products, 2000 credits/mo)
- **Agency:** $499/mo (10 clients, 500 credits/mo)

**Target:** $50K MRR, <5% monthly churn

**Database Changes:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  tier VARCHAR(50) NOT NULL, -- 'basic', 'pro', 'business', 'agency'
  status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'past_due'
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscription_features (
  id UUID PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id),
  feature VARCHAR(100) NOT NULL, -- 'store_sync', 'api_access', etc.
  enabled BOOLEAN DEFAULT true
);
```

**Tasks:**
- [ ] Database schema migration
- [ ] Stripe subscription management
- [ ] Webhook handlers for subscription events
- [ ] Monthly credit grants (automatic)
- [ ] Subscription management UI
- [ ] Upgrade/downgrade flows
- [ ] Proration handling
- [ ] Store sync features (bidirectional)
- [ ] Team collaboration features
- [ ] Usage analytics per tier

**Documentation:** [Design Log #008](../docs/README.md#business-model--pricing)

### Phase 4: Enterprise & Agencies (Months 18+)

**Goal:** Enterprise contracts and agency partnerships

**Features:**
- Custom pricing starting at $5K/month
- Agency tier: Manage multiple clients
- White-label options
- Dedicated support
- Custom integrations
- API access with webhooks
- SSO/SAML authentication
- Advanced security features

**Target:** $100K+ MRR

**Database Changes:**
```sql
-- Agency support
CREATE TABLE agencies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE members ADD COLUMN agency_id UUID REFERENCES agencies(id);

-- API access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);
```

**Tasks:**
- [ ] Multi-client switching UI
- [ ] Agency dashboard
- [ ] API key management
- [ ] Webhook system
- [ ] SSO integration
- [ ] White-label theming
- [ ] Advanced permissions
- [ ] Custom contracts and billing
- [ ] Dedicated support channel
- [ ] SLA monitoring

---

## 📊 Technical Debt

### High Priority

1. **Better Auth Integration**
   - Fix WebSocket connection issues
   - Simplify auth flow
   - Add auth unit tests
   - Document auth patterns

2. **Error Handling**
   - Standardize error responses (RFC 7807)
   - Add error boundaries to UI
   - Improve error messages
   - Add retry logic

3. **Type Safety**
   - Remove `any` types
   - Add runtime validation (Zod)
   - Generate API types from schema
   - Strict TypeScript config

### Medium Priority

4. **Code Duplication**
   - Extract common patterns to shared utilities
   - Consolidate modal components
   - Standardize form handling
   - Reusable hooks

5. **Test Coverage**
   - Increase unit test coverage to >90%
   - Add integration tests
   - Visual regression tests
   - Performance benchmarks

6. **Documentation**
   - API documentation (OpenAPI)
   - Component documentation (Storybook)
   - Architecture decision records (ADRs)
   - Troubleshooting guides

### Low Priority

7. **Performance**
   - Bundle size optimization
   - Image optimization
   - Code splitting
   - Lazy loading

8. **Accessibility**
   - WCAG AA compliance audit
   - Keyboard navigation
   - Screen reader testing
   - ARIA labels

9. **Internationalization**
   - i18n framework setup
   - Translation infrastructure
   - RTL support
   - Currency/date localization

---

## 🧪 Research & Exploration

### AI Improvements

- [ ] **Multi-model Support**
  - Support multiple AI providers (OpenAI, Anthropic, Midjourney)
  - Provider failover
  - Cost optimization
  - Quality comparison

- [ ] **Advanced Prompt Engineering**
  - Prompt templates
  - A/B testing prompts
  - Auto-optimization
  - Feedback loop

- [ ] **Style Transfer**
  - Custom style training
  - Brand consistency
  - Style library

### Architecture Exploration

- [ ] **Microservices** (if needed at scale)
  - Service mesh evaluation
  - gRPC for internal communication
  - Service discovery

- [ ] **Event Sourcing** (for complex workflows)
  - Event store evaluation
  - CQRS patterns
  - Event replay

- [ ] **Real-time Features**
  - WebSocket infrastructure
  - Real-time collaboration
  - Live progress updates
  - Presence indicators

---

## 📈 Metrics & KPIs

### Product Metrics (To Track)

**Engagement:**
- [ ] Daily active users (DAU)
- [ ] Monthly active users (MAU)
- [ ] Sessions per user
- [ ] Time in app

**Feature Usage:**
- [ ] Bubble usage by type
- [ ] Store sync usage
- [ ] Generated images per user
- [ ] Download rate

**Quality:**
- [ ] Generation success rate
- [ ] User satisfaction (CSAT)
- [ ] Error rate
- [ ] Support tickets

**Business (Phase 2+):**
- [ ] Free-to-paid conversion rate (target: 15%)
- [ ] Monthly recurring revenue (MRR)
- [ ] Customer lifetime value (LTV)
- [ ] Churn rate (target: <5%)
- [ ] LTV:CAC ratio (target: >3:1)

---

## 🎯 Success Criteria

### MVP (Current Phase)

- [x] Both apps (admin, client) generate images using same services ✅
- [x] No duplicated generation logic ✅
- [ ] All API queries scoped to user's clientId (needs auth)
- [x] Can recover queue state from database ✅
- [x] All core routes production-ready (5/5) ✅
- [ ] E2E tests passing (22 failed, needs fix)
- [x] Mobile responsive ✅

### Phase 2 (Credit System)

- [ ] Self-service signup working
- [ ] Credit purchases via Stripe
- [ ] Generation quota enforcement
- [ ] 15% free-to-paid conversion
- [ ] $10K MRR

### Phase 3 (Subscriptions)

- [ ] Subscription tiers live
- [ ] Store sync features complete
- [ ] Monthly credit grants automated
- [ ] <5% monthly churn
- [ ] $50K MRR

### Phase 4 (Enterprise)

- [ ] Agency tier operational
- [ ] API access for integrations
- [ ] SSO/SAML authentication
- [ ] White-label options
- [ ] $100K+ MRR

---

## 🔄 Regular Maintenance

### Daily
- Monitor error rates (Sentry)
- Check queue health
- Review failed jobs
- Respond to support tickets

### Weekly
- Database backup verification
- Performance review (slow queries)
- Security updates
- Test suite health check

### Monthly
- Dependency updates
- Security audit
- Cost analysis (AI, storage, compute)
- Feature usage review
- User feedback analysis

### Quarterly
- Architecture review
- Technical debt prioritization
- Roadmap planning
- Team retrospective

---

## 📞 Questions & Decisions Needed

### Open Questions

1. **Authentication Bypass for Tests** - Should we add TEST_MODE to bypass Better Auth in E2E tests?
   - **Impact:** Unblocks 22 failing tests
   - **Trade-off:** Tests won't verify auth flow
   - **Decision needed by:** This week

2. **Rate Limiting Strategy** - Use Redis or database-based rate limiting?
   - **Impact:** Affects scalability and cost
   - **Trade-off:** Redis = faster but more complex
   - **Decision needed by:** Before production

3. **Multi-Client Support** - Enable in MVP or Phase 2?
   - **Impact:** Database schema changes
   - **Trade-off:** More complex but more flexible
   - **Decision needed by:** Next month

4. **AI Provider Strategy** - Support multiple providers or stay with Gemini?
   - **Impact:** Cost optimization vs complexity
   - **Trade-off:** Vendor lock-in vs maintenance overhead
   - **Decision needed by:** Phase 2

### Decisions Made

- ✅ Use Better Auth for authentication
- ✅ PostgreSQL for database (not MongoDB)
- ✅ Cloudflare R2 for storage (not S3)
- ✅ Monorepo structure with Turborepo
- ✅ Drizzle ORM (not Prisma)
- ✅ Feature-based E2E tests (not page-based)

---

**Last Updated:** 2026-01-26

**Next Review:** Weekly (Immediate Priorities), Monthly (Short/Medium-Term)

**Owner:** Development Team

---

## 📝 How to Use This Document

1. **Weekly Planning:** Review "Immediate Priorities" section
2. **Sprint Planning:** Pull from "Short-Term" section
3. **Quarterly Planning:** Align with "Medium-Term" and "Long-Term" sections
4. **Feature Requests:** Add to appropriate section with impact analysis
5. **Completed Items:** Move to relevant implementation summary doc

**When adding TODOs:**
- Include impact and trade-off analysis
- Link to related documentation
- Estimate effort (hours/days/weeks)
- Assign priority (Critical/High/Medium/Low)
- Tag with relevant feature area
