# CDN Asset Management System

This document describes the enhanced CDN asset management system using content-addressed storage with S3 + CloudFront.

## 🌟 **Key Features**

- **Immutable Assets**: Content-based hashing with `max-age=31536000`
- **Manifest-Based Resolution**: Logical names resolve to hashed CDN URLs
- **Incremental Deployments**: Only changed assets are uploaded
- **Zero-Downtime Deployments**: New assets don't break existing URLs
- **Lean Repository**: Assets stored in CDN, not Git

## 📁 **Asset Structure**

```
S3 Bucket: scenergy-catalog/
├── clients/
│   ├── dr/
│   │   ├── assets/
│   │   │   ├── textures/
│   │   │   │   └── metal.0e4fd1e8.ktx2
│   │   │   └── models/
│   │   │       └── door.9f6a3a12.glb
│   │   ├── config/
│   │   │   └── catalog.3f1b0c1b.json5
│   │   └── manifests/
│   │       ├── manifest.json        # Logical → Hashed mapping
│   │       └── latest.json         # Version pointer
│   └── keisar/ ...
```

## 🚀 **Deployment**

### Manual Deployment

```bash
# Set environment variables
export S3_BUCKET_NAME=scenergy-catalog
export CDN_BASE_URL=https://catalog.scenergy.io
export CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC

# Deploy assets
./scripts/deploy-assets-to-s3.sh

# Dry run to see what would be deployed
./scripts/deploy-assets-to-s3.sh --dry-run
```

### GitHub Actions

Assets are automatically deployed when:
- Changes are pushed to `main`/`master`
- Files under `apps/*/public/media/` are modified
- Manual trigger via workflow dispatch

## 💻 **Usage in Code**

### Basic Asset Resolution

```typescript
import { assetConfig } from '@/config/assetConfig';

// Resolve asset URL using manifest
const textureUrl = await assetConfig.getAssetUrl('dr', 'textures/metal.ktx2');
// Returns: https://catalog.scenergy.io/clients/dr/assets/textures/metal.0e4fd1e8.ktx2

// Get asset metadata
const assetInfo = await assetConfig.getAssetInfo('dr', 'models/door.glb');
console.log(assetInfo.sha256, assetInfo.size, assetInfo.hash);
```

### Preloading Critical Assets

```typescript
import { assetConfig } from '@/config/assetConfig';

// Preload critical assets for better performance
await assetConfig.preloadCriticalAssets('dr', [
  'models/door.glb',
  'textures/metal.ktx2',
  'configuration/catalog.json5'
]);
```

### Direct Manifest Usage

```typescript
import { assetManifestResolver } from '@/services/asset/asset-manifest-resolver';

// Load manifest
const manifest = await assetManifestResolver.loadManifest('dr');

// Get all GLB files
const models = await assetManifestResolver.getAssetsByType('dr', 'glb');

// Resolve multiple assets
const urls = await assetManifestResolver.resolveMultipleAssets('dr', [
  'models/door.glb',
  'textures/metal.ktx2'
]);
```

## 🔧 **Development Setup**

### Local Development

For local development, assets can be served from `public/media/` directory:

```bash
# Keep a minimal dev subset (optional)
mkdir -p apps/scenergy-next/public/media/assets/dev
# Add small test assets here

# The system automatically falls back to local assets in development
```

### Environment Variables

```bash
# Production CDN
NEXT_PUBLIC_CDN_BASE_URL=https://catalog.scenergy.io

# AWS Configuration
S3_BUCKET_NAME=scenergy-cdn
S3_REGION=us-east-1
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC

# For GitHub Actions
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/GitHubActionsRole
```

## ⚡ **Performance Benefits**

### Cache Strategy
- **Assets**: `Cache-Control: public, max-age=31536000, immutable`
- **Manifests**: `Cache-Control: public, max-age=60, must-revalidate`

### CloudFront Optimization
- Only manifest paths (`/clients/*/manifests/*`) are invalidated
- Assets remain cached indefinitely due to content hashing
- Automatic compression for text-based files

### Loading Performance
```typescript
// Preload critical assets during app initialization
useEffect(() => {
  assetConfig.preloadCriticalAssets(clientId, criticalAssets);
}, [clientId]);
```

## 🛡️ **Security**

- S3 bucket is private with CloudFront OAC
- No public S3 access, only via CloudFront
- Optional presigned URLs for authenticated assets
- Content integrity verification via SHA-256

## 📊 **Monitoring**

### Asset Deployment Logs
- GitHub Actions provide deployment summaries
- S3 access logs available via CloudWatch
- CloudFront metrics for cache hit ratio

### Manifest Health Checks
```typescript
// Check manifest freshness
const manifest = await assetManifestResolver.loadManifest(clientId);
console.log('Manifest version:', manifest.version);

// Clear cache if needed
assetManifestResolver.clearCache(clientId);
```

## 🔄 **Migration Strategy**

### Phase 1: Deploy Infrastructure
1. Set up S3 bucket with proper CORS
2. Configure CloudFront distribution
3. Deploy enhanced asset deployment script

### Phase 2: Gradual Migration
1. Start with one client (e.g., 'dr')
2. Deploy assets and verify manifest generation
3. Update code to use manifest resolution
4. Monitor performance and cache hit rates

### Phase 3: Full Deployment
1. Migrate all clients to manifest-based system
2. Remove large assets from Git repository
3. Update CI/CD to use automated deployment

## 🐛 **Troubleshooting**

### Common Issues

**Manifest not found**
```typescript
// Check if manifest exists
const manifest = assetManifestResolver.getCachedManifest(clientId);
if (!manifest) {
  console.log('Manifest not loaded, triggering fetch...');
}
```

**Asset not in manifest**
```bash
# Re-deploy assets to regenerate manifest
./scripts/deploy-assets-to-s3.sh

# Check S3 bucket contents
aws s3 ls s3://scenergy-cdn/clients/dr/manifests/
```

**CloudFront cache issues**
```bash
# Invalidate manifest paths only
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/clients/*/manifests/*"
```

### Development vs Production

| Environment | Asset Source | Manifest | Cache |
|-------------|-------------|-----------|-------|
| Development | Local `/media/` | No | Browser cache |
| Production | CDN | Yes | CloudFront + Browser |

## 📈 **Future Enhancements**

- **Asset versioning**: Keep multiple versions for rollback
- **Progressive loading**: Lazy load non-critical assets  
- **WebP conversion**: Automatic format optimization
- **Bundle analysis**: Track asset usage and optimize
