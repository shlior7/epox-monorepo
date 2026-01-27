# Epox Admin

Secure admin platform for managing epox-platform clients, analytics, and operations.

## Overview

Epox Admin is a Next.js 16 application that provides platform administrators with comprehensive tools to:

- View platform-wide metrics (clients, users, products, generations, costs)
- Manage client accounts (list, detail, delete)
- Monitor usage and costs
- Perform administrative operations

## Features

### ✅ Implemented

- **Admin Authentication** - Secure login with bcrypt-hashed passwords, session management
- **Dashboard** - Platform metrics: total clients, users, products, generations, current month cost, active clients
- **Client Management** - List all clients with search/pagination, view client details, delete clients with confirmation
- **Admin Security** - Rate limiting (10-200 req/min), request IDs, security event logging
- **Delete Client** - Cascading deletion of all client data (14 record types) with confirmation modal
- **Client Analytics** - Cost breakdown by operation/model, quota monitoring, daily trends
- **Alerts & Monitoring** - Real-time alerts for quota, cost, errors with Betterstack/Sentry integration
- **Pagination** - Full pagination controls on client list

### 🚧 Planned

- **Testing** - Comprehensive test suite for all endpoints
- **Analytics Charts** - Visual cost/usage trends (currently showing data, needs charts)
- **S3 Integration** - Actual S3 asset deletion (currently counted only)
- **Audit Log UI** - View admin action history

## Getting Started

### 1. Create an Admin User

First, create an admin user to access the platform:

```bash
# Interactive mode (recommended)
cd apps/scenergy-visualizer
tsx scripts/create-admin.ts

# Or with command-line args
tsx scripts/create-admin.ts --email admin@epox.com --name "Admin Name" --password SecurePassword123!
```

### 2. Start the Development Server

```bash
cd apps/scenergy-visualizer
yarn dev
```

### 3. Login

Navigate to http://localhost:3000/admin/login and login with your admin credentials.

## Project Structure

```
apps/scenergy-visualizer/
├── app/
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout with navigation
│   │   ├── login/page.tsx          # Admin login page
│   │   ├── dashboard/page.tsx      # Dashboard with metrics
│   │   └── clients/
│   │       ├── page.tsx            # Client list
│   │       └── [id]/page.tsx       # Client detail
│   └── api/admin/
│       ├── login/route.ts          # Admin login endpoint
│       ├── logout/route.ts         # Admin logout endpoint
│       ├── session/route.ts        # Session validation endpoint
│       ├── dashboard/route.ts      # Dashboard metrics endpoint
│       └── clients/
│           ├── route.ts            # Client list endpoint
│           └── [id]/route.ts       # Client detail/delete endpoint
├── components/admin/
│   ├── AdminNav.tsx                # Sidebar navigation
│   └── MetricCard.tsx              # Metric display card
├── lib/
│   ├── auth/
│   │   └── admin-auth.ts           # Admin auth helpers
│   ├── security/
│   │   └── admin-middleware.ts     # Security middleware
│   └── services/
│       └── admin-operations.ts     # Admin operations (delete client)
├── scripts/
│   └── create-admin.ts             # Create admin user CLI
└── styles/
    └── admin.scss                  # Admin theme styles
```

## Security

### Authentication

- Admin users are stored in `admin_user` table (separate from client `user` table)
- Passwords are hashed using bcrypt with 10 rounds
- Sessions use UUID tokens stored in `admin_session` table
- Session cookies are httpOnly, secure (in production), sameSite=lax
- Session duration: 7 days (configurable)

### Authorization

- All `/api/admin/*` routes use `withAdminSecurity()` middleware
- Session validation on every request
- Session expiry checks
- Rate limiting per admin user

### Rate Limits

- **Read operations**: 200 requests/minute
- **Default operations**: 100 requests/minute
- **Write operations**: 50 requests/minute
- **Dangerous operations** (delete): 10 requests/minute

### Audit Logging

- All admin actions logged to console
- Logs include: admin ID, email, path, method
- Delete operations include detailed counts
- Future: Store in database audit table

## Admin Operations

### Delete Client

Deleting a client performs a cascading deletion of all associated data:

1. **S3 Assets** (placeholder - ready for integration)
   - Generated images
   - Product images
   - Other uploaded assets

2. **Database Records** (14 types, in dependency order)
   - Generation jobs
   - Generated assets
   - Generation flows
   - Collection sessions
   - Chat sessions
   - Product images
   - Products
   - Members
   - Invitations
   - Usage records
   - Quota limits
   - AI cost tracking
   - Users (only if no other client memberships)
   - Client record

**WARNING**: Client deletion is permanent and cannot be undone (currently no soft delete).

## API Endpoints

### Authentication

```
POST   /api/admin/login     - Login with email/password
GET    /api/admin/session   - Validate current session
POST   /api/admin/logout    - Logout and clear session
```

### Dashboard

```
GET    /api/admin/dashboard - Get platform metrics
```

### Clients

```
GET    /api/admin/clients                  - List all clients (with search, sort, pagination)
GET    /api/admin/clients/:id              - Get client details
GET    /api/admin/clients/:id/analytics    - Get client analytics (cost/usage trends)
DELETE /api/admin/clients/:id              - Delete client completely
```

### Alerts

```
GET    /api/admin/alerts           - Get current alerts (with severity/type filters)
```

## Styling

The admin interface uses a custom dark theme with:

- **Font**: DM Sans (Google Fonts)
- **Accent Color**: Amber (#f59e0b)
- **Background**: Dark gradient (#0a0a0a to #050505)
- **Components**: Card-based with subtle borders and hover effects
- **Navigation**: Fixed sidebar with icon menu

See `styles/admin.scss` for full theme configuration.

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth encryption secret
- `NEXT_PUBLIC_S3_DRIVER` - S3 driver (aws or fs)

### Optional (Monitoring)

- `BETTERSTACK_SOURCE_TOKEN` - Betterstack log ingestion token
- `SENTRY_DSN` - Sentry data source name
- `SENTRY_AUTH_TOKEN` - Sentry auth token
- `SENTRY_ORG` - Sentry organization slug
- `SENTRY_PROJECT` - Sentry project name

See [MONITORING-SETUP.md](./MONITORING-SETUP.md) for configuration details.

## Development

### Running in Development Mode

```bash
yarn dev          # Standard mode
yarn dev:test     # With filesystem S3 driver
yarn dev:local    # With local S3 directory
```

### Creating Test Data

Use the epox-platform test data seed scripts to create test clients for testing admin features.

## Known Limitations

1. **No S3 integration yet** - Delete client counts assets but doesn't delete from S3
2. **No database transactions** - Uses sequential deletions instead of atomic transaction
3. **No visual charts** - Analytics data available via API but needs chart components
4. **Console logging only** - No database audit trail yet (logs to Betterstack/Sentry when configured)

## Future Enhancements

- [ ] Analytics dashboard with cost charts
- [ ] Alerts and monitoring system
- [ ] Confirmation modals for dangerous operations
- [ ] Soft delete with restore capability
- [ ] Admin roles (super_admin, viewer)
- [ ] IP whitelisting
- [ ] 2FA for admin login
- [ ] Audit log viewer UI
- [ ] Bulk operations
- [ ] Data export (CSV, JSON)
- [ ] Client impersonation (view as client)

## Support

For issues or questions, see the main epox-monorepo documentation.

## Design Documentation

See `design-log/001-epox-admin-transformation.md` for detailed architecture decisions, implementation notes, and trade-offs.
