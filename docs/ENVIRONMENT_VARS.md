# Environment Variables

Complete list of all environment variables for the Epox Platform.

---

## 🔐 Required - Core

| Variable | Description |
|----------|-------------|
| **`DATABASE_URL`** | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| **`STORE_CREDENTIALS_KEY`** | 32-byte AES-256 encryption key for store credentials. Generate: `openssl rand -base64 32` |

---

## 🛒 Required - Shopify Integration

| Variable | Description |
|----------|-------------|
| **`SHOPIFY_API_KEY`** | Client ID from Shopify Partner App |
| **`SHOPIFY_API_SECRET`** | Client Secret from Shopify Partner App |

> **Note:** WooCommerce does NOT require app registration. It uses the store's built-in `/wc-auth/v1/authorize` endpoint.

---

## 🖼️ Required - External Services

| Variable | Description |
|----------|-------------|
| **`R2_PUBLIC_URL`** | Cloudflare R2 public bucket URL for images (e.g., `https://pub-xxx.r2.dev`) |
| **`UNSPLASH_ACCESS_KEY`** | Unsplash API key for explore/search feature |

---

## 🔒 Security Flags (Optional)

All security flags have sensible defaults. Override only if needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `SECURITY_ENFORCE_URL_ALLOWLIST` | `true` | SSRF protection - enforce domain allowlist |
| `SECURITY_REQUIRE_AUTH` | `true` | Require authentication on protected routes |
| `SECURITY_ENABLE_RATE_LIMITING` | `false` | Enable rate limiting |
| `SECURITY_ENABLE_LOGGING` | `true` | Log security events |
| `SECURITY_BLOCK_PRIVATE_IPS` | `true` | Block private/internal IPs (SSRF protection) |

---

## 🌐 App Configuration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Auto-detected | Public URL for OAuth callbacks. Set in production for reliability. |
| `WOOCOMMERCE_APP_NAME` | `Epox Platform` | Name shown to WooCommerce users during OAuth authorization |
| `SHOPIFY_APP_NAME` | `Epox Platform` | Internal identifier for Shopify |
| `STORE_CREDENTIALS_KEY_ID` | `v1` | Key version identifier for credential encryption key rotation |
| `NODE_ENV` | - | `development` / `production` / `test` |

---

## 📋 Complete `.env.local` Template

```env
# ============================================
# REQUIRED - DATABASE
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/epox_platform

# ============================================
# REQUIRED - CREDENTIAL ENCRYPTION
# ============================================
# Generate with: openssl rand -base64 32
STORE_CREDENTIALS_KEY=your-32-byte-base64-key-here

# ============================================
# REQUIRED - SHOPIFY (if using Shopify integration)
# ============================================
# Get from partners.shopify.com
SHOPIFY_API_KEY=your-shopify-client-id
SHOPIFY_API_SECRET=your-shopify-client-secret

# ============================================
# REQUIRED - STORAGE & EXTERNAL SERVICES
# ============================================
R2_PUBLIC_URL=https://pub-xxx.r2.dev
UNSPLASH_ACCESS_KEY=your-unsplash-access-key

# ============================================
# OPTIONAL - APP CONFIG
# ============================================
NEXT_PUBLIC_APP_URL=https://your-app.com
WOOCOMMERCE_APP_NAME=Your App Name

# ============================================
# OPTIONAL - SECURITY FLAGS
# ============================================
# Uncomment to change from defaults
# SECURITY_ENFORCE_URL_ALLOWLIST=true
# SECURITY_REQUIRE_AUTH=true
# SECURITY_ENABLE_RATE_LIMITING=false
# SECURITY_ENABLE_LOGGING=true
# SECURITY_BLOCK_PRIVATE_IPS=true

# ============================================
# OPTIONAL - KEY ROTATION
# ============================================
STORE_CREDENTIALS_KEY_ID=v1
```

---

## Summary

| Category | Required | Optional |
|----------|----------|----------|
| Database | 1 | 0 |
| Encryption | 1 | 1 |
| Shopify | 2 | 0 |
| Storage/APIs | 2 | 0 |
| Security flags | 0 | 5 |
| App config | 0 | 3 |
| **Total** | **6** | **9** |

---

## Generating Keys

### Encryption Key (STORE_CREDENTIALS_KEY)

```bash
# Generate a secure 32-byte key
openssl rand -base64 32
```

### Key Rotation

To rotate the encryption key:
1. Generate a new key
2. Update `STORE_CREDENTIALS_KEY` with the new key
3. Increment `STORE_CREDENTIALS_KEY_ID` (e.g., `v1` → `v2`)
4. Re-encrypt existing credentials (migration required)

