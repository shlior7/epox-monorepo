Scenergy Admin Platform - Implementation Plan
Status: Ready for Approval
Created: 2026-01-13
Scope: Rewrite scenergy-visualizer as a comprehensive admin platform

Overview
Transform the existing scenergy-visualizer app into a robust admin platform for the Scenergy team to manage the entire platform. This is a "back-office" dashboard providing full visibility and control over clients, generations, credits, and platform operations.

MVP Features (Priority Order)
Client & User Management - CRUD, invites, roles, settings
Generation Debugging - Prompt history, job logs, error tracking, regeneration
Credits & Payments - View/edit balances, payment history, manual grants
Generation Mode: Admin-only (generate into admin space, transfer to client if needed)

Route Structure

/admin
/login # Existing admin login
/dashboard # Platform metrics overview

/admin/clients
/ # All clients list (paginated)
/[clientId] # Client detail (tabs: overview, users, products)
/[clientId]/settings # Client settings
/[clientId]/users # Client members & invitations
/[clientId]/products # Client products
/[clientId]/generations # Client generated assets

/admin/users
/ # All users (cross-client)
/[userId] # User detail

/admin/generations
/ # Global image browser (all clients)
/jobs # Job queue + history
/jobs/[jobId] # Job debug detail
/[assetId] # Asset detail with prompt history

/admin/credits
/ # All client balances
/[clientId] # Client credit detail
/transactions # All transactions

/admin/payments
/ # Payment overview
/transactions # Stripe transactions

/admin/settings
/ # Platform settings
/admins # Admin user management
/audit # Audit log viewer
New Database Tables

1. credit_balance - Client Credit Balances

CREATE TABLE credit_balance (
id TEXT PRIMARY KEY,
client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
balance INTEGER NOT NULL DEFAULT 0,
version INTEGER NOT NULL DEFAULT 1,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW(),
UNIQUE(client_id)
); 2. credit_transaction - Credit Movement History

CREATE TABLE credit_transaction (
id TEXT PRIMARY KEY,
client_id TEXT NOT NULL REFERENCES client(id),
amount INTEGER NOT NULL, -- positive=credit, negative=debit
balance_after INTEGER NOT NULL,
type TEXT NOT NULL, -- 'purchase'|'grant'|'usage'|'refund'|'adjustment'
description TEXT,
generated_asset_id TEXT REFERENCES generated_asset(id),
payment_transaction_id TEXT, -- External payment reference
admin_user_id TEXT REFERENCES admin_user(id),
metadata JSONB,
created_at TIMESTAMP DEFAULT NOW()
); 3. audit_log - Admin Action Trail

CREATE TABLE audit_log (
id TEXT PRIMARY KEY,
admin_user_id TEXT REFERENCES admin_user(id),
action TEXT NOT NULL, -- 'client.create', 'credit.grant', etc.
entity_type TEXT NOT NULL, -- 'client', 'user', 'credit', etc.
entity_id TEXT NOT NULL,
previous_state JSONB,
new_state JSONB,
ip_address TEXT,
user_agent TEXT,
metadata JSONB,
created_at TIMESTAMP DEFAULT NOW()
); 4. Schema Modifications

-- Admin role support
ALTER TABLE admin_user ADD COLUMN role TEXT DEFAULT 'admin';
-- Values: 'super_admin', 'admin', 'viewer'

-- Admin-generated assets tracking
ALTER TABLE generated_asset ADD COLUMN is_admin_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_asset ADD COLUMN transferred_to_client_id TEXT REFERENCES client(id);
ALTER TABLE generated_asset ADD COLUMN transferred_at TIMESTAMP;
Key Screens
Dashboard (/admin/dashboard)
Total clients, active users, generations today
Active jobs with live progress
Recent activity feed
Top clients by generation count
Clients List (/admin/clients)
Searchable/filterable table
Columns: Name, Products, Users, Last Activity, Status
Quick actions: View, Edit, Browse As Client
Client Detail (/admin/clients/[clientId])
Tabs: Overview, Users, Products, Sessions, Generations, Settings
Credit balance display with Edit/Grant actions
Store connection status
Generation Browser (/admin/generations)
Grid of ALL images across platform
Filters: Client, Date Range, Status
Click to expand: full prompt, settings, regenerate
Transfer to client action
Job Debugger (/admin/generations/jobs)
Active jobs with live progress (poll every 2s)
Job history (completed/failed)
Per-job detail: full prompt, settings, error stack, timing
Regenerate action
Credits (/admin/credits)
Client balances table
Grant credits modal (amount + reason)
Transaction history with filters
Component Structure

components/admin/
AdminLayout/
AdminLayout.tsx # Main layout with sidebar
AdminSidebar.tsx # Navigation sidebar
AdminHeader.tsx # Top header with admin info
Dashboard/
StatsCards.tsx
ActiveJobsList.tsx
RecentActivity.tsx
Clients/
ClientsTable.tsx
ClientDetailTabs.tsx
Generations/
ImageGrid.tsx
JobQueueTable.tsx
JobDetailView.tsx
PromptDebugger.tsx
Credits/
CreditBalancesTable.tsx
GrantCreditsModal.tsx
TransactionHistory.tsx
shared/
DataTable.tsx # Reusable sortable/filterable table
FilterBar.tsx
StatusBadge.tsx
Pagination.tsx
API Endpoints (New)

/api/admin/dashboard GET Dashboard stats
/api/admin/clients GET List clients
/api/admin/clients/[id] GET/PATCH Client CRUD
/api/admin/clients/[id]/users GET/POST Client members
/api/admin/clients/[id]/credits GET/PATCH Credit balance
/api/admin/clients/[id]/credits/grant POST Grant credits
/api/admin/users GET All users
/api/admin/users/[id] GET/PATCH/DELETE
/api/admin/generations GET All assets
/api/admin/generations/[id] GET/PATCH/DELETE
/api/admin/generations/[id]/transfer POST Transfer to client
/api/admin/jobs GET Job queue
/api/admin/jobs/[id] GET Job detail
/api/admin/jobs/[id]/regenerate POST Regenerate
/api/admin/credits/transactions GET All transactions
/api/admin/audit GET Audit log
/api/admin/settings/admins GET/POST Admin users
Security Model
Admin Roles
Role Capabilities
super_admin Full access + manage other admins
admin Full CRUD on clients/users/credits
viewer Read-only access
Audit Logging
All mutations logged with: admin, action, entity, before/after state
IP address and user agent captured
Sensitive fields (passwords, tokens) excluded from state
Implementation Phases
Phase 1: Foundation (1-2 weeks)
Create admin layout with sidebar navigation
Build dashboard with basic stats
Implement clients list with pagination/filtering
Add client detail view with tabs
Create credits tables (balance + transactions)
Build credit management UI (view, edit, grant)
Files to create/modify:

app/admin/layout.tsx - New admin layout
app/admin/dashboard/page.tsx - Dashboard
app/admin/clients/page.tsx - Clients list
app/admin/clients/[clientId]/page.tsx - Client detail
app/admin/credits/page.tsx - Credits overview
packages/visualizer-db/src/schema/credits.ts - New tables
packages/visualizer-db/src/repositories/credits.ts - New repos
Phase 2: Generation Debugging (1 week)
Build global image browser
Create job queue view with live polling
Implement job detail with prompt debugging
Add regenerate functionality
Files to create/modify:

app/admin/generations/page.tsx - Image browser
app/admin/generations/jobs/page.tsx - Job queue
app/admin/generations/jobs/[jobId]/page.tsx - Job detail
components/admin/Generations/ - Components
Phase 3: User Management (1 week)
Build users list (cross-client)
Add user detail view
Implement member management per client
Create invitation system
Files to create/modify:

app/admin/users/page.tsx
app/admin/users/[userId]/page.tsx
app/admin/clients/[clientId]/users/page.tsx
Phase 4: Audit & Security (3-5 days)
Create audit log table
Implement audit logging middleware
Build audit log viewer
Add admin role system
Files to create/modify:

packages/visualizer-db/src/schema/audit.ts
lib/middleware/audit-logger.ts
app/admin/settings/audit/page.tsx
app/admin/settings/admins/page.tsx
Phase 5: Payments (1 week)
Integrate Stripe dashboard data
Build payments view
Link payments to credit purchases
Critical Files Reference
File Purpose
apps/scenergy-visualizer/lib/auth/admin-auth.ts Extend with roles
packages/visualizer-db/src/schema/auth.ts Add role to admin_user
packages/visualizer-db/src/facade.ts Add new repositories
apps/scenergy-visualizer/components/AppShell.tsx Pattern for AdminLayout
apps/scenergy-visualizer/lib/services/image-generation/queue.ts Job monitoring
Verification
After implementation, verify:

Auth: Admin login works, role-based access enforced
Clients: Can list, view, edit all clients
Credits: Can view balances, grant credits, see transactions
Generations: Can browse all images, view job queue, see prompts
Audit: All admin actions logged with before/after state
Tests: Run yarn test in visualizer-db and scenergy-visualizer
