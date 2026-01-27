# Roadmap Documentation

> Future plans, priorities, and TODOs

---

## Overview

Complete roadmap for the Epox platform including:
- Immediate priorities (this week)
- Short-term goals (this month)
- Medium-term features (3 months)
- Long-term vision (6-18 months)

---

## Documents

### [What's Next](./whats-next.md)
Complete roadmap with:
- **Immediate Priorities** - This week
  - E2E test fixes (22 failing tests)
  - Authentication integration
- **Short-Term** - This month
  - Testing improvements
  - Performance optimization
  - Monitoring & logging
- **Medium-Term** - 3 months
  - Feature enhancements (bubble presets, store sync)
  - Database improvements
  - API enhancements
- **Long-Term** - 6-18 months
  - Phase 2: Credit System ($10K MRR)
  - Phase 3: Subscriptions ($50K MRR)
  - Phase 4: Enterprise ($100K+ MRR)

### [TODO](./todo.md)
Task list and action items

### [Config Panel Status](./config-panel-status.md)
Unified config panel implementation status

---

## Quick Overview

### Immediate (This Week)

1. **Fix E2E Tests** - 22 tests failing due to Better Auth WebSocket issues
2. **Authentication Integration** - Remove PLACEHOLDER_CLIENT_ID

### Short-Term (This Month)

1. **Testing** - Increase coverage, fix failing tests
2. **Performance** - Add caching, optimize queries
3. **Monitoring** - Setup Sentry, add analytics
4. **Security** - Rate limiting, input validation

### Medium-Term (3 Months)

1. **Bubble Presets** - Save/load bubble combinations
2. **Store Enhancements** - Bidirectional sync, more platforms
3. **Database** - Full-text search, materialized views
4. **API** - New endpoints, versioning, GraphQL

### Long-Term (6-18 Months)

1. **Phase 2: Credit System** (Months 4-9)
   - Self-service signup
   - Pay-as-you-go pricing
   - Target: $10K MRR

2. **Phase 3: Subscriptions** (Months 10-18)
   - Monthly subscription tiers
   - Advanced store sync
   - Target: $50K MRR

3. **Phase 4: Enterprise** (Months 18+)
   - Agency features
   - White-label options
   - Target: $100K+ MRR

---

## Project Status

### ✅ Production Ready
- Core API routes (5/5 optimized)
- Bubble system (7 types)
- Optimistic updates
- Store integration
- Backend integration

### 🚧 In Progress
- E2E tests (22 failed)
- Authentication
- Rate limiting
- Monitoring

### 📋 Planned
- Credit system
- Subscriptions
- Enterprise features

---

## Success Metrics

### Technical

**MVP (Current):**
- [x] All routes production-ready ✅
- [x] Performance optimized (60x) ✅
- [ ] E2E tests passing
- [ ] Authentication integrated

**Phase 2 (Credit System):**
- [ ] Self-service signup
- [ ] 15% free-to-paid conversion
- [ ] $10K MRR

**Phase 3 (Subscriptions):**
- [ ] Subscription tiers live
- [ ] <5% monthly churn
- [ ] $50K MRR

**Phase 4 (Enterprise):**
- [ ] Agency tier operational
- [ ] White-label options
- [ ] $100K+ MRR

---

## Priorities

### High Priority 🔴
- Fix E2E tests
- Add authentication
- Implement rate limiting
- Setup monitoring

### Medium Priority 🟡
- Increase test coverage
- Add caching
- Optimize remaining queries
- Improve error handling

### Low Priority 🟢
- Bubble presets
- Additional store platforms
- GraphQL API
- Internationalization

---

## Related Documentation

- [What's Next](./whats-next.md) - Complete roadmap
- [Implementation Gaps](../development/implementation-gaps.md)
- [Production Readiness](../deployment/production-readiness.md)
- [Design Plans](../plans/README.md)

---

**Last Updated:** 2026-01-26
