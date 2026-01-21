# Design Log #012: Admin Platform

**Status**: Draft
**Created**: 2026-01-13
**Updated**: 2026-01-13
**Author**: Claude
**Related**: Design Log #001 (Architecture), Design Log #002 (Authentication), Design Log #003 (Data Model)

---

## Background

The Scenergy team needs a comprehensive **admin platform** to manage the entire Scenergy Visualizer ecosystem. This will replace the current `scenergy-visualizer` app (which was initially client-facing) with a robust back-office dashboard.

The admin platform will provide:

- **Full visibility** into all clients, users, generations, and platform activity
- **Operational control** over credits, payments, and client settings
- **Debugging tools** for generation jobs, prompts, and error investigation
- **Audit trails** for all admin actions
- **Generation capabilities** for admin-space testing and client support

This is a "one-stop shop" for the Scenergy team to manage everything about the platform and its users.

## Problem

Currently, `scenergy-visualizer` is a client-facing admin portal with:

- Multi-client management (URL pattern: `/[clientId]/...`)
- Admin authentication (`adminUser` table)
- Full access to all client data
- Direct manipulation of products, images, and settings

We need to transform this into a dedicated admin platform that:

1. Provides a **dashboard** with platform-wide metrics and health
2. Enables **client management** with full CRUD operations
3. Supports **generation debugging** with prompt history and job monitoring
4. Implements **credit management** for manual grants and balance adjustments
5. Tracks **audit logs** for all admin actions
6. Allows **admin-only generation** without consuming client credits
7. Provides **user management** across all clients

## Questions and Answers

### Q1: Should this be a new app or rewrite the existing one?

**A**: **Rewrite** `scenergy-visualizer` as the admin platform:

- The current app already has admin auth infrastructure
- Client-facing SaaS will be built as `visualizer-client` (per Design Log #001)
- Rewriting keeps infrastructure (auth, routes, components) in place
- Cleaner separation: admin app vs client app

### Q2: What's the admin role hierarchy?

**A**: Three-tier role system:

| Role          | Capabilities                                         |
| ------------- | ---------------------------------------------------- |
| `super_admin` | Full platform access + manage other admins + billing |
| `admin`       | Full CRUD on clients/users/credits, view audit logs  |
| `viewer`      | Read-only access to all data, no mutations           |

```typescript
type AdminRole = 'super_admin' | 'admin' | 'viewer';

interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole; // NEW FIELD
  createdAt: Date;
  updatedAt: Date;
}
```

### Q3: How do admins generate images without using client credits?

**A**: **Admin-only generation mode**:

- Admins generate into a separate "admin space"
- No credits deducted from any client
- Generated assets marked with `is_admin_generated = true`
- Admins can **transfer** assets to a client if needed

```typescript
interface GeneratedAsset {
  // ... existing fields
  isAdminGenerated: boolean; // NEW: true for admin generations
  transferredToClientId: string | null; // NEW: target client after transfer
  transferredAt: Date | null; // NEW: when transferred
}
```

**Transfer flow**:

1. Admin generates image (goes to admin space)
2. Admin clicks "Transfer to Client"
3. Select target client from dropdown
4. Asset moves to client's gallery with `transferredToClientId` set

### Q4: What metrics should the dashboard show?

**A**: Key platform health indicators:

**Real-time metrics**:

- Active jobs (generating right now)
- Jobs in queue (pending)
- Error rate (last 24 hours)

**Aggregate metrics**:

- Total clients
- Total users (across all clients)
- Generations today / this week / this month
- Storage usage (R2)

**Top performers**:

- Top 5 clients by generation count (last 30 days)
- Most active users

**Recent activity**:

- Latest 10 admin actions (from audit log)
- Latest 10 generation completions

### Q5: How do we handle credit management?

**A**: **Credit balance system** with full transaction history:

**Credit Balance** (per client):

```typescript
interface CreditBalance {
  id: string;
  clientId: string;
  balance: number; // Current credit count
  version: number; // Optimistic locking
  createdAt: Date;
  updatedAt: Date;
}
```

**Credit Transaction** (audit trail):

```typescript
interface CreditTransaction {
  id: string;
  clientId: string;
  amount: number; // +positive for credit, -negative for debit
  balanceAfter: number; // Balance after this transaction
  type: 'purchase' | 'grant' | 'usage' | 'refund' | 'adjustment';
  description: string | null;

  // References
  generatedAssetId: string | null; // For 'usage' type
  paymentTransactionId: string | null; // For 'purchase' type
  adminUserId: string | null; // Who performed this action

  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

**Admin actions**:

- **View balance**: See current credits for any client
- **Grant credits**: Add credits with reason (e.g., "Beta tester reward")
- **Adjust balance**: Correct errors with explanation
- **View history**: Full transaction log with filters

### Q6: What should the audit log capture?

**A**: **All mutations** with before/after state:

```typescript
interface AuditLog {
  id: string;
  adminUserId: string;
  action: string; // e.g., 'client.create', 'credit.grant', 'user.delete'
  entityType: string; // e.g., 'client', 'user', 'credit_balance'
  entityId: string;

  previousState: Record<string, unknown> | null; // State before change
  newState: Record<string, unknown> | null; // State after change

  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

**Audit actions** (examples):

- `client.create` / `client.update` / `client.delete`
- `user.invite` / `user.update` / `user.delete`
- `credit.grant` / `credit.adjust` / `credit.refund`
- `asset.transfer` / `asset.delete`
- `admin.create` / `admin.update` / `admin.delete`
- `job.regenerate` / `job.cancel`

**Sensitive data exclusion**:

- Passwords, tokens, and credentials are NEVER logged
- Sanitize before storing

### Q7: How do we debug generation jobs?

**A**: **Job debugger** with full visibility:

**Job list view**:

- Active jobs (currently generating)
- Recent jobs (completed/failed in last 24h)
- Filterable by client, status, date

**Job detail view**:

```typescript
interface JobDebugInfo {
  // Identity
  jobId: string;
  clientId: string;
  generationFlowId: string;

  // Request
  products: ProductSummary[];
  prompt: string; // Full compiled prompt
  settings: GenerationFlowSettings;
  inspirationImages: string[];

  // Execution
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number; // 0-100
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;

  // Result
  generatedAssetId: string | null;
  assetUrl: string | null;

  // Error (if failed)
  errorMessage: string | null;
  errorStack: string | null;

  // Cost
  tokensUsed: number | null;
  estimatedCost: number | null;
}
```

**Admin actions**:

- **View full prompt**: See exactly what was sent to Gemini
- **Regenerate**: Retry the job with same settings
- **View error stack**: Full error details for debugging

### Q8: How do admins browse all generated images?

**A**: **Global image browser** with powerful filters:

**Filters**:

- Client (dropdown)
- Date range (picker)
- Status (pending, approved, rejected)
- Admin-generated (yes/no)
- Has errors (yes/no)

**Image card shows**:

- Thumbnail
- Client name
- Product(s) in image
- Generation date
- Approval status badge

**Actions per image**:

- View full size
- View prompt/settings
- Transfer to client (if admin-generated)
- Approve/Reject (for store sync)
- Delete

### Q9: How do we handle client detail views?

**A**: **Tabbed interface** for each client:

**Tabs**:

1. **Overview**: Stats, recent activity, quick actions
2. **Users**: Members table, pending invitations, add user
3. **Products**: Product grid with counts
4. **Sessions**: Collection sessions list
5. **Generations**: All generated assets for this client
6. **Settings**: AI config, store connection, metadata
7. **Credits**: Balance, transaction history, grant button

**Overview tab content**:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Acme Furniture Co.                              [Edit] [Delete] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Created: Jan 5, 2026          Status: Active                   │
│  Slug: acme-furniture          Plan: Pro ($149/mo)              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   127        │  │   45         │  │   847        │          │
│  │   Products   │  │   Sessions   │  │   Credits    │          │
│  │              │  │              │  │   remaining  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Store Connection                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ WooCommerce • acme-store.com • Connected ✓              │   │
│  │ Last sync: 2 hours ago • Auto-sync: Enabled             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Activity                                                │
│  • Generated 45 images (2 hours ago)                           │
│  • User john@acme.com logged in (3 hours ago)                  │
│  • Imported 12 products from store (yesterday)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Q10: What's the user management approach?

**A**: Two views for user management:

**Global users view** (`/admin/users`):

- All users across all clients
- Shows: Email, Name, Clients (count), Last active
- Click to see user detail with all client memberships

**Client users view** (`/admin/clients/[id]/users`):

- Users for specific client only
- Shows: Email, Name, Role, Status, Joined date
- Actions: Change role, Remove from client, Resend invite

**User detail**:

```typescript
interface UserAdminView {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;

  // Cross-client memberships
  memberships: {
    clientId: string;
    clientName: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'invited' | 'suspended';
    joinedAt: Date;
  }[];

  // Activity
  lastActiveAt: Date | null;
  totalGenerations: number;
}
```

---

## Design

### Route Architecture

```mermaid
graph TB
    Login[/admin/login] --> Dashboard[/admin/dashboard]

    Dashboard --> Clients[/admin/clients]
    Dashboard --> Users[/admin/users]
    Dashboard --> Generations[/admin/generations]
    Dashboard --> Credits[/admin/credits]
    Dashboard --> Payments[/admin/payments]
    Dashboard --> Settings[/admin/settings]

    Clients --> ClientDetail[/admin/clients/clientId]
    ClientDetail --> ClientUsers[.../users]
    ClientDetail --> ClientProducts[.../products]
    ClientDetail --> ClientGenerations[.../generations]
    ClientDetail --> ClientSettings[.../settings]

    Users --> UserDetail[/admin/users/userId]

    Generations --> Jobs[/admin/generations/jobs]
    Jobs --> JobDetail[.../jobs/jobId]
    Generations --> AssetDetail[.../assetId]

    Credits --> ClientCredits[/admin/credits/clientId]
    Credits --> Transactions[.../transactions]

    Settings --> Admins[/admin/settings/admins]
    Settings --> Audit[/admin/settings/audit]
```

### Route Structure

```
/admin
  /login                           # Admin login (existing)
  /dashboard                       # Platform metrics overview

/admin/clients
  /                                # All clients list (paginated)
  /[clientId]                      # Client detail (tabbed)
  /[clientId]/users                # Client members & invitations
  /[clientId]/products             # Client products
  /[clientId]/generations          # Client generated assets
  /[clientId]/settings             # Client settings

/admin/users
  /                                # All users (cross-client)
  /[userId]                        # User detail

/admin/generations
  /                                # Global image browser
  /jobs                            # Job queue + history
  /jobs/[jobId]                    # Job debug detail
  /[assetId]                       # Asset detail

/admin/credits
  /                                # All client balances
  /[clientId]                      # Client credit detail
  /transactions                    # All transactions

/admin/payments
  /                                # Payment overview
  /transactions                    # Stripe transactions

/admin/settings
  /                                # Platform settings
  /admins                          # Admin user management
  /audit                           # Audit log viewer
```

---

## Screen Specifications

### 1. Admin Login

**Route**: `/admin/login`

**Purpose**: Authenticate admin users (existing, keep as-is)

**No changes needed** - current implementation works.

---

### 2. Dashboard

**Route**: `/admin/dashboard`

**Purpose**: Platform health overview and quick navigation

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Platform Overview                               [Refresh] [30m ▼]  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐│
│  │   24         │  │   156        │  │   1,247      │  │   3     ││
│  │   Clients    │  │   Users      │  │   Today      │  │   Active││
│  │              │  │   (total)    │  │   Generations│  │   Jobs  ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘│
│                                                                     │
│  ┌─────────────────────────────────┬────────────────────────────┐  │
│  │ Active Jobs (3)                 │ Top Clients (30 days)      │  │
│  │                                 │                            │  │
│  │ Acme Co - Product X             │ 1. Acme Furniture    420   │  │
│  │ ████████████░░░░ 75%            │ 2. Modern Home       380   │  │
│  │ Generating...                   │ 3. Office Plus       245   │  │
│  │                                 │ 4. Cozy Living       198   │  │
│  │ Widget Inc - Batch #12          │ 5. Urban Design      156   │  │
│  │ ██████░░░░░░░░░░ 40%            │                            │  │
│  │ Generating...                   │                            │  │
│  │                                 │                            │  │
│  │ Design Shop - Office Chair      │                            │  │
│  │ ░░░░░░░░░░░░░░░░ Pending        │                            │  │
│  │                                 │                            │  │
│  └─────────────────────────────────┴────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────┬────────────────────────────┐  │
│  │ Recent Activity                 │ System Health              │  │
│  │                                 │                            │  │
│  │ • admin@scenergy.ai granted     │ API         ● Healthy      │  │
│  │   100 credits to Acme Co        │ Queue       ● Healthy      │  │
│  │   2 minutes ago                 │ Database    ● Healthy      │  │
│  │                                 │ R2 Storage  ● Healthy      │  │
│  │ • Generation completed for      │ Gemini API  ● Healthy      │  │
│  │   Widget Inc (45 images)        │                            │  │
│  │   5 minutes ago                 │ Errors (24h)               │  │
│  │                                 │ 3 failed jobs (0.2%)       │  │
│  │ • New client created:           │                            │  │
│  │   Urban Design                  │                            │  │
│  │   1 hour ago                    │                            │  │
│  │                                 │                            │  │
│  │ [View All Activity →]           │                            │  │
│  └─────────────────────────────────┴────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Components**:

- `StatCard` - Metric display with optional trend indicator
- `ActiveJobsList` - Live job progress (polls every 2s)
- `TopClientsChart` - Horizontal bar chart
- `RecentActivity` - Audit log summary
- `SystemHealth` - Service status indicators

**State**:

```typescript
interface DashboardState {
  stats: {
    totalClients: number;
    totalUsers: number;
    generationsToday: number;
    activeJobs: number;
  };
  activeJobs: JobSummary[];
  topClients: { clientId: string; name: string; count: number }[];
  recentActivity: AuditLogEntry[];
  systemHealth: {
    api: 'healthy' | 'degraded' | 'down';
    queue: 'healthy' | 'degraded' | 'down';
    database: 'healthy' | 'degraded' | 'down';
    storage: 'healthy' | 'degraded' | 'down';
    gemini: 'healthy' | 'degraded' | 'down';
  };
  errorsLast24h: { count: number; percentage: number };
  isLoading: boolean;
}
```

**Data Requirements**:

- `GET /api/admin/dashboard` - Returns all dashboard data
- Active jobs polled separately every 2s during active generation

---

### 3. Clients List

**Route**: `/admin/clients`

**Purpose**: Browse, search, and manage all clients

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Clients                                          [+ Create Client] │
│                                                                     │
│  🔍 Search clients...        [Status ▼] [Plan ▼] [Sort: Recent ▼]  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Name              Products  Users  Credits  Last Active  Status│ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ Acme Furniture       127     5      847     2 hours ago    ●  │ │
│  │ Modern Home Co        89     3      234     1 day ago      ●  │ │
│  │ Office Plus           45     2        0     3 days ago     ○  │ │
│  │ Cozy Living           67     4      156     5 hours ago    ●  │ │
│  │ Urban Design          23     1       50     Just now       ●  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Showing 5 of 24 clients         [◀] [1] 2 3 4 5 [▶]               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Table columns**:
| Column | Description |
|--------|-------------|
| Name | Client name (click to view detail) |
| Products | Count of products |
| Users | Count of members |
| Credits | Current balance |
| Last Active | Most recent user activity |
| Status | Active (●) / Inactive (○) based on 7-day activity |

**Row actions** (on hover/menu):

- View details
- Edit settings
- Grant credits
- Delete (with confirmation)

**Components**:

- `DataTable` - Sortable, filterable table
- `SearchBar` - Full-text search
- `FilterDropdown` - Status/plan filters
- `Pagination` - Page controls
- `CreateClientModal` - New client form

---

### 4. Client Detail

**Route**: `/admin/clients/[clientId]`

**Purpose**: Deep dive into single client with tabbed navigation

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ← Back to Clients                                                  │
│                                                                     │
│  Acme Furniture Co.                              [Edit] [⋮ More]    │
│  acme-furniture • Pro Plan • Created Jan 5, 2026                   │
│                                                                     │
│  [Overview] [Users] [Products] [Sessions] [Generations] [Settings] │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  {TAB CONTENT AREA}                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Tabs**:

**Overview Tab**:

- Stats cards (products, sessions, generations, credits)
- Store connection status
- Recent activity for this client
- Quick actions (Grant credits, Add user, etc.)

**Users Tab**:

- Members table with role, status, joined date
- Pending invitations
- Actions: Change role, Remove, Resend invite
- "+ Invite User" button

**Products Tab**:

- Product grid with thumbnails
- Filter by source (imported/uploaded), category
- Click product to view details
- Import products button

**Sessions Tab**:

- Collection sessions list
- Status, product count, generation count
- Click to view session details

**Generations Tab**:

- All generated assets for this client
- Grid view with filters
- Same as global browser but client-scoped

**Settings Tab**:

- Client info (name, slug, description)
- AI model configuration
- Store connection management
- Danger zone (delete client)

---

### 5. Generation Browser

**Route**: `/admin/generations`

**Purpose**: Browse ALL generated images across platform

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Generation Browser                               [+ Admin Generate]│
│                                                                     │
│  [Client ▼] [Date Range ▼] [Status ▼] [Admin Only ☐] 🔍 Search... │
│                                                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │        │ │        │ │        │ │        │ │        │ │        ││
│  │  img   │ │  img   │ │  img   │ │  img   │ │  img   │ │  img   ││
│  │        │ │        │ │        │ │        │ │        │ │        ││
│  ├────────┤ ├────────┤ ├────────┤ ├────────┤ ├────────┤ ├────────┤│
│  │Acme Co │ │Modern  │ │Acme Co │ │Office+ │ │Cozy    │ │Admin   ││
│  │Pending │ │Approved│ │Approved│ │Rejected│ │Pending │ │Generated│
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│
│                                                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │        │ │        │ │        │ │        │ │        │ │        ││
│  │  img   │ │  img   │ │  img   │ │  img   │ │  img   │ │  img   ││
│  ...                                                                │
│                                                                     │
│  Showing 1-24 of 1,247                    Load more ↓              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Image card actions** (click to expand):

- View full size
- View prompt & settings
- Approve / Reject
- Transfer to client (admin-generated only)
- Delete

**Components**:

- `ImageGrid` - Responsive masonry grid
- `ImageCard` - Thumbnail with metadata
- `ImageDetailModal` - Full view with actions
- `FilterBar` - Multi-filter controls
- `AdminGenerateModal` - Create admin generation

---

### 6. Job Debugger

**Route**: `/admin/generations/jobs`

**Purpose**: Monitor and debug generation jobs

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Generation Jobs                                                    │
│                                                                     │
│  [Active (3)] [Completed] [Failed]        [Client ▼] [Date ▼]      │
│                                                                     │
│  Active Jobs                                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Job ID        Client          Progress   Started    Action    │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ job_abc123    Acme Co         ████░░ 75%  5m ago    [View]    │ │
│  │ job_def456    Widget Inc      ██░░░░ 40%  2m ago    [View]    │ │
│  │ job_ghi789    Design Shop     ░░░░░░ 0%   Just now  [View]    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Recent Completed (24h)                                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ job_xyz001    Modern Home     ✓ 100%     12m ago    [View]    │ │
│  │ job_xyz002    Cozy Living     ✓ 100%     1h ago     [View]    │ │
│  │ job_xyz003    Office Plus     ✗ Error    2h ago     [View]    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Job Detail View** (`/admin/generations/jobs/[jobId]`):

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Job: job_abc123                               [Regenerate] [Cancel]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Status: Generating ████████████░░░░░░ 75%                         │
│  Client: Acme Furniture Co.                                        │
│  Flow: flow_xyz789                                                 │
│  Started: Jan 13, 2026 14:32:15 (5 minutes ago)                   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Products (2)                                                       │
│  ┌─────────┐ ┌─────────┐                                           │
│  │ [img]   │ │ [img]   │                                           │
│  │ Sofa    │ │ Table   │                                           │
│  └─────────┘ └─────────┘                                           │
│                                                                     │
│  Prompt                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ A photorealistic image of a modern living room featuring    │   │
│  │ a gray velvet sofa and wooden coffee table. Natural light   │   │
│  │ streams through large windows. Scandinavian style, cozy     │   │
│  │ atmosphere, minimalist decor, high ceilings, wooden floors. │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Settings                                                           │
│  • Room Type: Living Room                                          │
│  • Style: Scandinavian                                             │
│  • Lighting: Natural                                               │
│  • Aspect Ratio: 16:9                                              │
│  • Model: gemini-2.0-flash-exp                                     │
│                                                                     │
│  Execution                                                          │
│  • Queue Time: 2.3s                                                │
│  • Processing Time: 45.2s (ongoing)                                │
│  • Tokens Used: 1,247                                              │
│  • Est. Cost: $0.045                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Error detail** (for failed jobs):

```text
│  Error                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GeminiAPIError: Rate limit exceeded                         │   │
│  │                                                             │   │
│  │ Stack trace:                                                │   │
│  │ at generateImage (lib/services/gemini/service.ts:142)      │   │
│  │ at processJob (lib/services/image-generation/worker.ts:89) │   │
│  │ ...                                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
```

---

### 7. Credits Management

**Route**: `/admin/credits`

**Purpose**: View and manage client credit balances

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Credit Balances                                 [View Transactions]│
│                                                                     │
│  🔍 Search clients...                       [Sort: Balance ▼]      │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Client              Balance   Last Used      Actions          │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ Acme Furniture        847     2 hours ago    [Grant] [View]   │ │
│  │ Modern Home           234     1 day ago      [Grant] [View]   │ │
│  │ Cozy Living           156     5 hours ago    [Grant] [View]   │ │
│  │ Urban Design           50     Just now       [Grant] [View]   │ │
│  │ Office Plus             0     3 days ago     [Grant] [View]   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Summary                                                            │
│  Total credits in circulation: 1,287                               │
│  Credits used today: 156                                           │
│  Credits granted today: 100                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Grant Credits Modal**:

```text
┌─────────────────────────────────────────────┐
│ Grant Credits                        [×]    │
├─────────────────────────────────────────────┤
│                                             │
│ Client: Acme Furniture Co.                  │
│ Current Balance: 847 credits                │
│                                             │
│ Amount to Grant                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 100                                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Reason                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Beta tester reward                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ New Balance: 947 credits                    │
│                                             │
│         [Cancel]            [Grant Credits] │
└─────────────────────────────────────────────┘
```

**Transactions View** (`/admin/credits/transactions`):

- All transactions across all clients
- Filters: Client, Type, Date range
- Columns: Date, Client, Type, Amount, Balance After, Admin, Description

---

### 8. Audit Log

**Route**: `/admin/settings/audit`

**Purpose**: View all admin actions for accountability

**Layout**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Clients  Users  Generations  Credits  Settings  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Audit Log                                            [Export CSV] │
│                                                                     │
│  [Admin ▼] [Action ▼] [Entity ▼] [Date Range ▼]   🔍 Search...    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Time          Admin           Action           Entity          │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ 2m ago        admin@scen...   credit.grant     Acme Furniture │ │
│  │               Granted 100 credits (Beta tester reward)        │ │
│  │               [View Details]                                  │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ 1h ago        admin@scen...   client.create    Urban Design   │ │
│  │               Created new client                              │ │
│  │               [View Details]                                  │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ 2h ago        super@scen...   admin.create     john@scenergy  │ │
│  │               Added new admin user                            │ │
│  │               [View Details]                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Showing 1-50 of 1,234                    [◀] 1 2 3 ... [▶]        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Audit Detail Modal**:

- Full before/after JSON diff
- IP address and user agent
- Timestamp with timezone
- Related entity link

---

## Database Schema

### New Tables

#### `credit_balance`

```sql
CREATE TABLE credit_balance (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX credit_balance_client_id_idx ON credit_balance(client_id);
```

#### `credit_transaction`

```sql
CREATE TABLE credit_transaction (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'grant', 'usage', 'refund', 'adjustment')),
  description TEXT,
  generated_asset_id TEXT REFERENCES generated_asset(id) ON DELETE SET NULL,
  payment_transaction_id TEXT,
  admin_user_id TEXT REFERENCES admin_user(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX credit_transaction_client_id_idx ON credit_transaction(client_id);
CREATE INDEX credit_transaction_created_at_idx ON credit_transaction(created_at);
CREATE INDEX credit_transaction_type_idx ON credit_transaction(type);
```

#### `audit_log`

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_user(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_admin_user_id_idx ON audit_log(admin_user_id);
CREATE INDEX audit_log_entity_idx ON audit_log(entity_type, entity_id);
CREATE INDEX audit_log_action_idx ON audit_log(action);
CREATE INDEX audit_log_created_at_idx ON audit_log(created_at);
```

### Schema Modifications

#### Extend `admin_user`

```sql
ALTER TABLE admin_user ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('super_admin', 'admin', 'viewer'));
```

#### Extend `generated_asset`

```sql
ALTER TABLE generated_asset ADD COLUMN is_admin_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE generated_asset ADD COLUMN transferred_to_client_id TEXT REFERENCES client(id) ON DELETE SET NULL;
ALTER TABLE generated_asset ADD COLUMN transferred_at TIMESTAMP;

CREATE INDEX generated_asset_admin_generated_idx ON generated_asset(is_admin_generated)
  WHERE is_admin_generated = TRUE;
```

---

## API Endpoints

### Dashboard

```
GET /api/admin/dashboard
  Response: { stats, activeJobs, topClients, recentActivity, systemHealth }
```

### Clients

```
GET    /api/admin/clients                  # List clients (paginated)
POST   /api/admin/clients                  # Create client
GET    /api/admin/clients/[id]             # Get client detail
PATCH  /api/admin/clients/[id]             # Update client
DELETE /api/admin/clients/[id]             # Delete client

GET    /api/admin/clients/[id]/users       # List client members
POST   /api/admin/clients/[id]/users       # Invite user to client
PATCH  /api/admin/clients/[id]/users/[uid] # Update member role
DELETE /api/admin/clients/[id]/users/[uid] # Remove member

GET    /api/admin/clients/[id]/credits     # Get credit balance
PATCH  /api/admin/clients/[id]/credits     # Adjust balance
POST   /api/admin/clients/[id]/credits/grant # Grant credits
GET    /api/admin/clients/[id]/credits/transactions # Transaction history
```

### Users

```
GET    /api/admin/users                    # List all users
GET    /api/admin/users/[id]               # Get user detail
PATCH  /api/admin/users/[id]               # Update user
DELETE /api/admin/users/[id]               # Delete user
```

### Generations

```
GET    /api/admin/generations              # List all assets (paginated)
GET    /api/admin/generations/[id]         # Get asset detail
PATCH  /api/admin/generations/[id]         # Update asset
DELETE /api/admin/generations/[id]         # Delete asset
POST   /api/admin/generations/[id]/transfer # Transfer to client

GET    /api/admin/jobs                     # List jobs (active + recent)
GET    /api/admin/jobs/[id]                # Get job detail
POST   /api/admin/jobs/[id]/regenerate     # Retry job
POST   /api/admin/jobs/[id]/cancel         # Cancel job

POST   /api/admin/generate                 # Admin-only generation
```

### Credits

```
GET    /api/admin/credits                  # All client balances
GET    /api/admin/credits/transactions     # All transactions
```

### Audit

```
GET    /api/admin/audit                    # Audit log (paginated)
GET    /api/admin/audit/[id]               # Audit entry detail
```

### Settings

```
GET    /api/admin/settings                 # Platform settings
PATCH  /api/admin/settings                 # Update settings

GET    /api/admin/settings/admins          # List admin users
POST   /api/admin/settings/admins          # Create admin
PATCH  /api/admin/settings/admins/[id]     # Update admin
DELETE /api/admin/settings/admins/[id]     # Delete admin
```

---

## Component Architecture

```
components/admin/
  AdminLayout/
    AdminLayout.tsx              # Main layout with sidebar
    AdminSidebar.tsx             # Navigation sidebar
    AdminHeader.tsx              # Top header with user menu
    AdminBreadcrumb.tsx          # Breadcrumb navigation

  Dashboard/
    StatsCards.tsx               # Metric cards row
    ActiveJobsList.tsx           # Live job progress
    TopClientsChart.tsx          # Horizontal bar chart
    RecentActivity.tsx           # Activity feed
    SystemHealth.tsx             # Service status

  Clients/
    ClientsTable.tsx             # Client list table
    ClientDetailTabs.tsx         # Tabbed detail view
    ClientOverviewTab.tsx        # Overview content
    ClientUsersTab.tsx           # Users content
    ClientProductsTab.tsx        # Products content
    CreateClientModal.tsx        # New client form

  Users/
    UsersTable.tsx               # Global users table
    UserDetailCard.tsx           # User info card
    InviteUserModal.tsx          # Invite form

  Generations/
    ImageGrid.tsx                # Masonry image grid
    ImageCard.tsx                # Single image thumbnail
    ImageDetailModal.tsx         # Full image view
    JobQueueTable.tsx            # Job list
    JobDetailView.tsx            # Job debug info
    PromptDebugger.tsx           # Prompt viewer
    AdminGenerateModal.tsx       # Admin generation form
    TransferModal.tsx            # Transfer to client

  Credits/
    CreditBalancesTable.tsx      # All balances
    TransactionHistory.tsx       # Transaction list
    GrantCreditsModal.tsx        # Grant form

  Audit/
    AuditLogTable.tsx            # Log list
    AuditEntryDetail.tsx         # Entry detail modal

  shared/
    DataTable.tsx                # Reusable sortable table
    FilterBar.tsx                # Multi-filter controls
    SearchBar.tsx                # Search input
    Pagination.tsx               # Page controls
    StatusBadge.tsx              # Status indicator
    ConfirmModal.tsx             # Confirmation dialog
    DateRangePicker.tsx          # Date range selector
    JSONDiff.tsx                 # Before/after diff viewer
```

---

## Implementation Plan

### Phase 1: Foundation (1-2 weeks)

- [ ] Create admin layout with sidebar navigation
- [ ] Build dashboard with basic stats
- [ ] Implement clients list with pagination/filtering
- [ ] Add client detail view with tabs
- [ ] Create credits tables (balance + transactions)
- [ ] Build credit management UI (view, edit, grant)

**Files to create/modify**:

- `app/admin/layout.tsx` - New admin layout
- `app/admin/dashboard/page.tsx` - Dashboard
- `app/admin/clients/page.tsx` - Clients list
- `app/admin/clients/[clientId]/page.tsx` - Client detail
- `app/admin/credits/page.tsx` - Credits overview
- `packages/visualizer-db/src/schema/credits.ts` - New tables
- `packages/visualizer-db/src/repositories/credits.ts` - New repos

### Phase 2: Generation Debugging (1 week)

- [ ] Build global image browser
- [ ] Create job queue view with live polling
- [ ] Implement job detail with prompt debugging
- [ ] Add regenerate functionality

**Files to create/modify**:

- `app/admin/generations/page.tsx` - Image browser
- `app/admin/generations/jobs/page.tsx` - Job queue
- `app/admin/generations/jobs/[jobId]/page.tsx` - Job detail
- `components/admin/Generations/` - Components

### Phase 3: User Management (1 week)

- [ ] Build users list (cross-client)
- [ ] Add user detail view
- [ ] Implement member management per client
- [ ] Create invitation system

**Files to create/modify**:

- `app/admin/users/page.tsx`
- `app/admin/users/[userId]/page.tsx`
- `app/admin/clients/[clientId]/users/page.tsx`

### Phase 4: Audit & Security (3-5 days)

- [ ] Create audit log table
- [ ] Implement audit logging middleware
- [ ] Build audit log viewer
- [ ] Add admin role system

**Files to create/modify**:

- `packages/visualizer-db/src/schema/audit.ts`
- `lib/middleware/audit-logger.ts`
- `app/admin/settings/audit/page.tsx`
- `app/admin/settings/admins/page.tsx`

### Phase 5: Payments Integration (1 week)

- [ ] Integrate Stripe dashboard data
- [ ] Build payments view
- [ ] Link payments to credit purchases

---

## Success Criteria

- [ ] Admin can log in and see dashboard with live metrics
- [ ] Admin can browse, create, edit, delete clients
- [ ] Admin can view all users across clients
- [ ] Admin can grant credits and see transaction history
- [ ] Admin can browse all generated images with filters
- [ ] Admin can view job queue with live progress
- [ ] Admin can debug failed jobs (see prompts, errors)
- [ ] Admin can regenerate failed jobs
- [ ] Admin can generate images to admin space
- [ ] Admin can transfer admin images to clients
- [ ] All admin actions are audit logged
- [ ] Role-based access control works (super_admin, admin, viewer)
- [ ] API response time <200ms for list endpoints
- [ ] Dashboard loads in <2 seconds

---

## References

- Design Log #001: Architecture & Infrastructure
- Design Log #002: Authentication & Authorization
- Design Log #003: Data Model & Terminology
- Design Log #005: Screens & UI Components
- Existing admin auth: `apps/scenergy-visualizer/lib/auth/admin-auth.ts`
- Database facade: `packages/visualizer-db/src/facade.ts`
