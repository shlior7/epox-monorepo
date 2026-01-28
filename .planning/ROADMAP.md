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

### Phase 2: Admin Credit Management for Design Partners
**Why second:** Before payment integration, design partners need platform access with manually granted credits from the admin panel.
**Scope:**
- Admin UI: credit granting form on client detail page (`/admin/clients/[id]`) — set plan, grant credits, adjust monthly limit
- Admin API: `POST /api/admin/clients/[id]/credits` to grant/adjust credits
- Admin API: `PUT /api/admin/clients/[id]/quota` to change plan and limits
- Credit grant creates a usage record adjustment (or resets usage for the month)
- Admin can view client's current credit usage, plan, and remaining credits (already partially shown in client detail)
- Audit trail: log credit grants with admin ID, reason, and timestamp
**Depends on:** Phase 1 (credit system must exist)
**Existing code:** Admin client detail page at `apps/epox-admin/app/admin/clients/[id]/page.tsx` already shows quota/plan section. Admin security middleware (`withAdminWriteSecurity`) exists.

### Phase 3: Tranzila Payment Integration
**Why third:** Revenue requires payment processing. Using Tranzila (Israeli payment gateway) for credit card processing.
**Scope:**
- Tranzila API V2 integration: token creation via iframe, token-based charging
- Subscription tiers with product slot limits (100/500/1000/5000) and included monthly credits
- Credit pack add-on purchases (one-time token-based charges)
- Monthly credit allotment auto-grant on subscription renewal
- Billing history and invoice access
- Tranzila auth: `X-tranzila-api-app-key` header, terminal name, transaction password
- Token flow: iframe tokenization (`tranmode=VK`) → store token → charge via `tranzila31tk.cgi`
**Depends on:** Phase 1 (credit system must exist to grant credits)
**Existing code:** Design doc `docs/plans/008-business-model-pricing.md` has pricing tiers. Tranzila docs at https://docs.tranzila.com/
**Tranzila API reference:**
- Token creation: `https://direct.tranzila.com/{terminal}/iframe.php?tranmode=VK`
- Token charge: `https://secure5.tranzila.com/cgi-bin/tranzila31tk.cgi` (POST: supplier, sum, currency, expdate, TranzilaPW, TranzilaTK)
- API V2: `https://api.tranzila.com` with `X-tranzila-api-app-key` header
- Payment request: `https://api.tranzila.com/v1/pr/create`

### Phase 4: Self-Serve Signup & Onboarding
**Why fourth:** Payment infrastructure must exist before users can self-serve sign up and pick a plan.
**Scope:**
- Public pricing page with tier comparison
- Signup flow: register → pick plan → connect store → start generating
- Free trial: auto-grant starter credits on signup
- Onboarding wizard: connect store, import products, first generation
- Plan upgrade/downgrade flows
**Depends on:** Phase 3 (payment integration must work)
**Existing code:** Better Auth signup exists, WooCommerce + Shopify OAuth flows exist

### Phase 5: Credit Usage Tracking & Dashboard
**Why fifth:** Paying customers need visibility into their usage and remaining credits.
**Scope:**
- Credit usage history page (transactions log with filtering)
- Usage analytics: credits consumed by operation type, time period
- Low credit warnings and notifications
- Per-action cost breakdown display
**Depends on:** Phase 1 (credit transactions must be recorded)
**Existing code:** `AICostTrackingRepository` already tracks per-operation costs

### Phase 6: Asset Management Completion
**Why sixth:** With paying customers, the asset management tools need to actually work.
**Scope:**
- Implement the 5 TODO stubs in `assets-client.tsx`: pin, favorite, approve, edit, delete
- Wire "Approve to Store" action to existing store sync API
- Wire "Edit" action to existing ImageEditorModal
- Add pin/favorite fields to generated asset schema
- Batch asset actions (select multiple → approve/delete/sync)
**Depends on:** Nothing strict, but higher priority items come first
**Existing code:** Store sync APIs complete, ImageEditorModal complete, batch processor utility exists

### Phase 7: Store Sync-Back & Worker Integration
**Why seventh:** Completes the store integration loop — assets flow back to connected stores.
**Scope:**
- Implement `processSyncProduct()` in generation worker (currently throws "not yet implemented")
- Credential decryption and store API calls from worker
- Auto-sync option: automatically push approved assets to store
- Sync status tracking in UI (pending, synced, failed)
- Retry logic for failed syncs
**Depends on:** Phase 6 (approve action triggers sync)
**Existing code:** `services/generation-worker/src/worker.ts` has the stub, store sync APIs and logging are complete

### Phase 8: Video Generation & Editing
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
Phase 1 (Credits) ──→ Phase 2 (Admin Credits) ──→ Design partners can use platform
    │
    ├──→ Phase 3 (Tranzila) ──→ Phase 4 (Onboarding)
    │
    ├──→ Phase 5 (Usage Dashboard)
    │
    └──→ Phase 8 (Video)

Phase 6 (Asset Management) ──→ Phase 7 (Store Sync Worker)
```

## Research Needs

| Phase | Research Topic | Why |
|-------|---------------|-----|
| Phase 3 | Tranzila API V2 vs legacy endpoints | V2 uses JSON + app-key auth, legacy uses CGI query params. Need to confirm V2 supports all needed operations (tokenize, charge, recurring) |
| Phase 4 | Onboarding flow UX patterns | Best practices for multi-step SaaS onboarding with store connection |

---
*Created: 2026-01-28*
*Updated: 2026-01-28 — Replaced Stripe with Tranzila, added Phase 2 for admin credit management*
*Milestone: 1 — Revenue Foundation*
