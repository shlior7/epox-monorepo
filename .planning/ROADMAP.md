# Epox Platform — Milestone 1 Roadmap

## Goal
Turn the existing AI asset generation platform into a revenue-generating business by implementing credit-based billing, subscription tiers, self-serve onboarding, and completing the asset management tooling.

## Phases

### Phase 1: Credit System Foundation -- Complete (2026-01-28)
**Why first:** No revenue without billing — this is the core value proposition. The quota schema and service already exist but aren't wired up.
**Scope:**
- Extend DB schema: credit balance table, credit transaction ledger, subscription plans table
- Wire existing `QuotaService.checkQuota()` and `consumeQuota()` into generation endpoints
- Replace hardcoded 500 credits with real quota lookups in dashboard API and SSR queries
- Credit deduction before generation, refund on failure
- Credit balance display in dashboard (replace hardcoded values)
**Depends on:** Nothing (foundation)
**Existing code:** `packages/visualizer-services/src/quota/`, `packages/visualizer-db/src/schema/usage.ts`, `packages/visualizer-db/src/repositories/usage.ts`

### Phase 2: Subscription Tiers & Payment Integration
**Why second:** Credits need a way to be purchased. Stripe integration enables recurring revenue.
**Scope:**
- Stripe integration: checkout sessions, webhook handlers, subscription lifecycle
- Subscription tiers with product slot limits (100/500/1000/5000) and included monthly credits
- Credit pack add-on purchases (one-time top-ups)
- Monthly credit allotment auto-grant on subscription renewal
- Billing history and invoice access
**Depends on:** Phase 1 (credit system must exist to grant credits)
**Existing code:** Design doc `docs/plans/008-business-model-pricing.md` has pricing tiers and Stripe flow designs

### Phase 3: Self-Serve Signup & Onboarding
**Why third:** Payment infrastructure must exist before users can self-serve sign up and pick a plan.
**Scope:**
- Public pricing page with tier comparison
- Signup flow: register → pick plan → connect store → start generating
- Free trial: auto-grant starter credits on signup
- Onboarding wizard: connect store, import products, first generation
- Plan upgrade/downgrade flows
**Depends on:** Phase 2 (subscription tiers and payment must work)
**Existing code:** Better Auth signup exists, WooCommerce + Shopify OAuth flows exist

### Phase 4: Credit Usage Tracking & Dashboard
**Why fourth:** Paying customers need visibility into their usage and remaining credits.
**Scope:**
- Credit usage history page (transactions log with filtering)
- Usage analytics: credits consumed by operation type, time period
- Low credit warnings and notifications
- Per-action cost breakdown display
- Admin credit management (grant, adjust, view client usage)
**Depends on:** Phase 1 (credit transactions must be recorded)
**Existing code:** `AICostTrackingRepository` already tracks per-operation costs

### Phase 5: Asset Management Completion
**Why fifth:** With paying customers, the asset management tools need to actually work.
**Scope:**
- Implement the 5 TODO stubs in `assets-client.tsx`: pin, favorite, approve, edit, delete
- Wire "Approve to Store" action to existing store sync API
- Wire "Edit" action to existing ImageEditorModal
- Add pin/favorite fields to generated asset schema
- Batch asset actions (select multiple → approve/delete/sync)
**Depends on:** Nothing strict, but higher priority items come first
**Existing code:** Store sync APIs complete, ImageEditorModal complete, batch processor utility exists

### Phase 6: Store Sync-Back & Worker Integration
**Why sixth:** Completes the store integration loop — assets flow back to connected stores.
**Scope:**
- Implement `processSyncProduct()` in generation worker (currently throws "not yet implemented")
- Credential decryption and store API calls from worker
- Auto-sync option: automatically push approved assets to store
- Sync status tracking in UI (pending, synced, failed)
- Retry logic for failed syncs
**Depends on:** Phase 5 (approve action triggers sync)
**Existing code:** `services/generation-worker/src/worker.ts` has the stub, store sync APIs and logging are complete

### Phase 7: Video Generation & Editing
**Why last:** Lower priority than billing and core asset management. Video is an expansion feature.
**Scope:**
- Video generation UI in product studio (the API endpoint already exists)
- Video preview/playback component
- Video-specific editing tools (trim, aspect ratio)
- Video credit costs (higher than image generation)
- Video asset management in assets page
**Depends on:** Phase 1 (video generation should cost credits)
**Existing code:** `/api/generate-video/` endpoint exists with Zod validation, enqueues video jobs

---

## Phase Dependency Graph

```
Phase 1 (Credits) ──→ Phase 2 (Subscriptions) ──→ Phase 3 (Onboarding)
    │
    ├──→ Phase 4 (Usage Dashboard)
    │
    └──→ Phase 7 (Video)

Phase 5 (Asset Management) ──→ Phase 6 (Store Sync Worker)
```

## Research Needs

| Phase | Research Topic | Why |
|-------|---------------|-----|
| Phase 2 | Stripe Connect vs standard integration | Need to determine best Stripe setup for SaaS subscriptions with usage-based components |
| Phase 3 | Onboarding flow UX patterns | Best practices for multi-step SaaS onboarding with store connection |

---
*Created: 2026-01-28*
*Milestone: 1 — Revenue Foundation*
