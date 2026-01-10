# Live Database Deployment Guide

This guide shows you how to update your live Supabase database using an access token.

## Prerequisites

1. **Get your Supabase Access Token**
   - Go to [Supabase Account Tokens](https://app.supabase.com/account/tokens)
   - Click "Generate new token"
   - Give it a name like "scenergy-deployment"
   - Copy the token (keep it secure!)

2. **Get your Project Reference ID**
   - Go to your Supabase project dashboard
   - The project ref is in the URL: `https://app.supabase.com/project/[PROJECT_REF]`
   - Or go to Settings > General > Reference ID

## Setup Environment

1. **Create your environment file:**

   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your values:**

   ```env
   # Your live Supabase project
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_URL=https://your-project-ref.supabase.co

   # Get these from your Supabase dashboard > Settings > API
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Your project reference and access token
   SUPABASE_PROJECT_REF=your-project-ref-here
   SUPABASE_ACCESS_TOKEN=sbp_your-access-token-here
   ```

## Deployment Methods

### Method 1: Using the Deploy Script (Recommended)

```bash
# Deploy to live database
yarn deploy
```

This script will:

- Verify your credentials
- Link to your project
- Show current status
- Ask for confirmation
- Deploy your migrations
- Verify the deployment

### Method 2: Manual Commands

```bash
# Set your access token
export SUPABASE_ACCESS_TOKEN="your_access_token_here"

# Link to your project
yarn db:link --project-ref your-project-ref

# Push migrations to live database
yarn db:push

# Verify deployment
yarn verify
```

### Method 3: Direct CLI with Token

```bash
# Link with access token
SUPABASE_ACCESS_TOKEN="your_token" yarn supabase link --project-ref your-project-ref

# Deploy with access token
SUPABASE_ACCESS_TOKEN="your_token" yarn supabase db push
```

## What Gets Deployed

When you run the deployment, it will:

1. **Apply Database Migrations:**
   - Create all the RPC functions for table and secrets management
   - Set up proper permissions and security policies

2. **Deploy Functions:**
   - `read_secret()` - Read secrets from Vault
   - `insert_secret()` - Create new secrets
   - `update_secret()` - Update existing secrets
   - `delete_secret()` - Remove secrets
   - `get_table_list()` - List available tables
   - And more utility functions

## Verification

After deployment, verify everything works:

```bash
# Check project status
yarn db:status

# Verify database functions
yarn verify

# Test connection in your app
import { DatabaseService } from '@scenergy/supabase-service'
const db = new DatabaseService()
await db.healthCheck()
```

## Security Notes

- **Never commit your `.env.local` file**
- Store access tokens securely (use environment variables in CI/CD)
- Rotate access tokens regularly
- Use the principle of least privilege for production tokens

## Troubleshooting

### "Project not found" error

- Check your project reference ID
- Verify your access token has permission for this project

### "Authentication failed" error

- Regenerate your access token
- Make sure the token is properly set in environment

### Migration conflicts

- Check if there are pending local changes: `yarn db:diff`
- Pull latest schema: `yarn db:pull`
- Resolve conflicts and try again

## CI/CD Integration

For automated deployments, set these environment variables in your CI/CD:

```env
SUPABASE_ACCESS_TOKEN=your_token
SUPABASE_PROJECT_REF=your_project_ref
```

Then run:

```bash
yarn deploy
```
