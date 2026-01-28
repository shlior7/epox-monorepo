# Epox Platform

## What This Is

A store-connected AI asset generation and editing platform for e-commerce. Clients connect their online stores (WooCommerce, Shopify), import products, and use AI to generate, edit, upscale, and remove backgrounds from product images and videos — in batch or per-product. Revenue comes from subscription tiers (based on connected product count) that include monthly credit allotments for AI operations.

## Core Value

Credit-based billing that turns AI asset generation into a sustainable business — without billing, everything else is a free tool.

## Requirements

### Validated

- ✓ AI image generation via Google Gemini — existing (`packages/visualizer-ai/`)
- ✓ Product studio with generation flows — existing (`apps/epox-platform/components/studio/`)
- ✓ Collection-based multi-product generation — existing (`apps/epox-platform/app/(dashboard)/studio/collections/`)
- ✓ WooCommerce store integration (OAuth, product import, sync) — existing (`services/erp-service/src/providers/woocommerce/`)
- ✓ Shopify store integration (OAuth, product import, webhooks) — existing (`services/erp-service/src/providers/shopify/`)
- ✓ Background removal API — existing (`apps/epox-platform/app/api/remove-background/`)
- ✓ Image upscaling API — existing (`apps/epox-platform/app/api/upscale-image/`)
- ✓ Background generation worker with job queue — existing (`services/generation-worker/`)
- ✓ User authentication via Better Auth — existing (`packages/visualizer-auth/`)
- ✓ Asset storage on Cloudflare R2 — existing (`packages/visualizer-storage/`)
- ✓ Admin dashboard for client management — existing (`apps/epox-admin/`)
- ✓ Security middleware with auth and SSRF protection — existing (`apps/epox-platform/lib/security/`)
- ✓ Error tracking via Sentry — existing (`apps/epox-platform/sentry.*.config.ts`)

### Active

- [ ] Credit system — per-action credit costs, monthly allotments per plan tier
- [ ] Subscription tiers — product slot limits (100/500/1000/5000), each tier includes N credits/month
- [ ] Self-serve signup and onboarding — user signs up, picks plan, connects store, starts generating
- [ ] Payment integration — billing for subscriptions and credit pack add-ons
- [ ] Batch operations — apply edits (upscale, remove BG, generate) to multiple assets at once
- [ ] Image editor — in-app crop, adjust, annotate tools for production-ready assets
- [ ] Video generation and editing — AI-powered video creation for product assets
- [ ] Store asset sync-back — push generated/edited assets back to connected store
- [ ] Credit usage tracking and dashboard — clients see remaining credits, usage history

### Out of Scope

- Wix and other ERP integrations — focus on WooCommerce and Shopify for v1
- Admin analytics dashboard — admin monitoring can wait, focus on client-facing revenue features
- Multi-model AI system — stick with Gemini for v1, add provider switching later

## Context

- Brownfield monorepo with Next.js 16, React 19, Drizzle ORM, PostgreSQL, Turbo
- Generation worker already processes AI jobs via DB-based queue
- Credits currently hardcoded to 500 in dashboard and server queries — needs real implementation
- Store sync from worker (`processSyncProduct`) throws "not yet implemented"
- Several editing tool action handlers (pin, favorite, approve, edit, delete) are TODO stubs in `assets-client.tsx`
- Large components (1,200-1,500+ lines) in studio pages may need splitting as features grow
- No `.env.example` files — onboarding friction for new environments

## Constraints

- **Tech stack**: Must stay within existing monorepo (Next.js, Drizzle, PostgreSQL, R2, Redis)
- **Auth**: Must use existing Better Auth setup
- **AI provider**: Google Gemini for v1 (already integrated)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Credit system as core priority | No revenue without billing — everything else is a free tool | — Pending |
| Subscription = product slots + included credits | Combines recurring revenue with usage-based upsell | — Pending |
| Self-serve onboarding | Required for scale, can't manually onboard paying customers | — Pending |
| Defer Wix/other ERPs to post-v1 | WooCommerce + Shopify cover majority of e-commerce market | — Pending |
| Defer admin analytics to post-v1 | Client-facing features drive revenue; admin can use DB queries initially | — Pending |

---
*Last updated: 2026-01-28 after initialization*
