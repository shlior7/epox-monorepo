---
name: Visualizer Client App
overview: Create a new Next.js app `visualizer-client` that serves as a SaaS studio for individual clients, authenticated via the user table. This requires extracting shared logic into a new `visualizer-shared` package and building a simplified app where the clientId is derived from the authenticated user's membership.
todos:
  - id: create-shared-package
    content: Create packages/visualizer-shared with package.json and tsconfig
    status: pending
  - id: extract-types
    content: Move app-types.ts and related types to visualizer-shared
    status: pending
    dependencies:
      - create-shared-package
  - id: extract-services
    content: Extract service layer (gemini, s3, image-generation) to shared package
    status: pending
    dependencies:
      - extract-types
  - id: extract-contexts
    content: Extract DataContext with auth abstraction to shared package
    status: pending
    dependencies:
      - extract-services
  - id: extract-components
    content: Extract SceneStudioView and related components to shared package
    status: pending
    dependencies:
      - extract-contexts
  - id: create-client-app
    content: Create apps/visualizer-client Next.js app with basic structure
    status: pending
    dependencies:
      - create-shared-package
  - id: implement-user-auth
    content: Implement user authentication using visualizer-auth in client app
    status: pending
    dependencies:
      - create-client-app
  - id: implement-client-context
    content: Create ClientContext to derive clientId from user membership
    status: pending
    dependencies:
      - implement-user-auth
  - id: integrate-studio
    content: Integrate SceneStudioView from shared package into client app
    status: pending
    dependencies:
      - extract-components
      - implement-client-context
  - id: refactor-visualizer
    content: Refactor scenergy-visualizer to import from visualizer-shared
    status: pending
    dependencies:
      - extract-components
---

# Visualizer Client App Architecture

## Overview

Create `apps/visualizer-client` - a single-client SaaS studio using the same backend infrastructure as `scenergy-visualizer`, but:

- Authenticated via `user` table (Better Auth) instead of `adminUser`
- No `[clientId]` in URL - client is derived from user's membership
- Reuses all studio capabilities via a new shared package

## Architecture

```mermaid
graph TB
    subgraph apps [Apps Layer]
        SV[scenergy-visualizer<br/>Admin Portal]
        VC[visualizer-client<br/>Client SaaS]
    end

    subgraph shared [Shared Package]
        VS[visualizer-shared]
        VS --> Components[Reusable Components]
        VS --> Contexts[DataContext/ModalContext]
        VS --> Services[Service Layer]
        VS --> ApiClient[API Client]
        VS --> Types[App Types]
    end

    subgraph packages [Existing Packages]
        VA[visualizer-auth]
        VD[visualizer-db]
        VST[visualizer-storage]
        VT[visualizer-types]
    end

    SV --> VS
    VC --> VS
    VS --> VA
    VS --> VD
    VS --> VST
    VS --> VT
```

## Phase 1: Create visualizer-shared Package

Extract reusable code from `scenergy-visualizer` into [`packages/visualizer-shared`](packages/visualizer-shared):| Category | Files to Extract ||----------|-----------------|| **Components** | SceneStudioView/_, ChatView/_, common/_, modals/_ (subset) || **Contexts** | DataContext.tsx, ModalContext.tsx, ThemeContext.tsx || **Services** | gemini/, image-generation/, image-processing/, s3/, visualization/ || **Types** | lib/types/app-types.ts || **API Client** | lib/api-client.ts (make base URL configurable) || **Hooks** | lib/hooks/\* |Key changes during extraction:

- Make `apiClient` configurable with base URL injection
- DataContext will accept an `authProvider` abstraction (admin vs user auth)
- Components will be app-agnostic (no hardcoded routes)

## Phase 2: Create visualizer-client App

### App Structure

```javascript
apps/visualizer-client/
├── app/
│   ├── layout.tsx              # Root layout with user auth
│   ├── page.tsx                # Dashboard/redirect
│   ├── login/page.tsx          # User login (Better Auth)
│   ├── studio/
│   │   └── page.tsx            # Scene Studio (main workspace)
│   ├── products/
│   │   └── page.tsx            # Product catalog
│   ├── settings/
│   │   └── page.tsx            # Client settings
│   └── api/
│       ├── auth/[...all]/route.ts   # Better Auth routes
│       └── ... (proxy or mount shared API routes)
├── lib/
│   ├── auth/
│   │   └── client-auth.ts      # User auth helpers (wraps visualizer-auth)
│   └── client-context.tsx      # Provides clientId from user membership
├── package.json
└── next.config.js
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as visualizer-client
    participant Auth as Better Auth
    participant DB as visualizer-db

    U->>App: Access /studio
    App->>Auth: Check session
    Auth->>DB: Get user + memberships
    DB-->>Auth: User with member records
    Auth-->>App: Session with activeClientId
    App->>App: Derive clientId from membership
    App->>App: Render Studio for that client
```

### Key Differences from scenergy-visualizer

| Aspect | scenergy-visualizer | visualizer-client ||--------|---------------------|-------------------|| Auth | adminUser table | user table (Better Auth) || Scope | All clients (admin) | Single client (member) || URL | `/[clientId]/... `| `/studio`, `/products` || Client access | Any client | Only user's client(s) || Create clients | Yes | No |

## Phase 3: Refactor scenergy-visualizer

Update `scenergy-visualizer` to consume from `visualizer-shared`:

- Replace local copies with imports from shared package
- Keep admin-specific logic (multi-client management, admin auth)
- Both apps now share the same component/service implementations

## Key Files to Create

1. **[packages/visualizer-shared/package.json]** - Package definition
2. **[packages/visualizer-shared/src/index.ts]** - Public exports
3. **[apps/visualizer-client/package.json]** - App dependencies
4. **[apps/visualizer-client/app/layout.tsx]** - User auth provider setup
5. **[apps/visualizer-client/lib/client-context.tsx]** - Client derivation from user membership

## Implementation Considerations

- **API Routes**: The client app can either:
