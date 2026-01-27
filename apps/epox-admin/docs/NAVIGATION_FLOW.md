# Navigation Flow Documentation

**Date**: November 3, 2025  
**Status**: ✅ Implemented

---

## 🗺️ Navigation Architecture

### Overview

The application now follows a clear, hierarchical navigation pattern:

- **Home** → **Client Settings** → **Product Settings** → **Session Chat**

---

## 📍 Routes & Pages

### 1. Home Page (`/`)

**Route**: `/`  
**Component**: `app/page.tsx`

**Behavior**:

- Shows `WelcomeView` component
- No auto-redirect (user must select a client)
- Displays empty state if no clients exist
- Encourages user to add their first client

**Navigation Actions**:

- Click "Add Client" → Opens AddClientModal
- Click client in NavigationDrawer → Navigate to client settings

---

### 2. Client Settings Page (`/[clientId]/settings`)

**Route**: `/[clientId]/settings`  
**Component**: `app/[clientId]/settings/page.tsx`

**Behavior**:

- Shows client configuration and settings
- NavigationDrawer displays products list (unselected)
- Main content shows client-specific settings

**Navigation Actions**:

- Click "Home" in breadcrumb → Navigate to `/`
- Click product in NavigationDrawer → Navigate to product settings
- Click "Add Product" → Opens AddProductModal

**Breadcrumb**:

```
🏠 Home > ClientName
```

---

### 3. Product Settings Page (`/[clientId]/[productId]/settings`)

**Route**: `/[clientId]/[productId]/settings`  
**Component**: `app/[clientId]/[productId]/settings/page.tsx`

**Behavior**:

- Shows product configuration and settings
- NavigationDrawer displays sessions list (unselected)
- Main content shows product-specific settings (GLB model, images, etc.)

**Navigation Actions**:

- Click "Home" in breadcrumb → Navigate to `/`
- Click "ClientName" in breadcrumb → Navigate to `/[clientId]/settings`
- Click session in NavigationDrawer → Navigate to session chat
- Click "New Session" → Creates session and navigates to chat

**Breadcrumb**:

```
🏠 Home > ClientName > ProductName
```

---

### 4. Session Chat Page (`/[clientId]/[productId]/[sessionId]`)

**Route**: `/[clientId]/[productId]/[sessionId]`  
**Component**: `app/[clientId]/[productId]/[sessionId]/page.tsx`

**Behavior**:

- Shows chat interface for image generation
- NavigationDrawer highlights active session
- Main content shows ChatView with message history

**Navigation Actions**:

- Click "Home" in breadcrumb → Navigate to `/`
- Click "ClientName" in breadcrumb → Navigate to `/[clientId]/settings`
- Click "ProductName" in breadcrumb → Navigate to `/[clientId]/[productId]/settings`
- Click different session in NavigationDrawer → Navigate to that session

**Breadcrumb**:

```
🏠 Home > ClientName > ProductName > SessionName
```

---

## 🧭 NavigationDrawer Behavior

### View States

The drawer has three view states:

1. **Clients View** - Shows list of clients
2. **Products View** - Shows products for selected client
3. **Sessions View** - Shows sessions for selected product

### Navigation Actions

#### From Clients View:

- **Click client** → Navigate to `/[clientId]/settings` + switch to Products View
- **Click settings icon** → Navigate to `/[clientId]/settings`

#### From Products View:

- **Click product** → Navigate to `/[clientId]/[productId]/settings` + switch to Sessions View
- **Click back arrow** → Return to Clients View
- **Click "Create Client Session"** → Multi-select products → Creates client session

#### From Sessions View:

- **Click session** → Navigate to `/[clientId]/[productId]/[sessionId]` (chat)
- **Click back arrow** → Return to Products View
- **Click "New Session"** → Creates session and navigates to chat

---

## 🔗 Breadcrumb Navigation

### Functionality

All breadcrumb items are **clickable links** that navigate to their respective pages:

```tsx
// Home breadcrumb always visible
🏠 Home → href="/"

// Dynamic path based on current route
ClientName → href="/[clientId]/settings"
ProductName → href="/[clientId]/[productId]/settings"
SessionName → href="/[clientId]/[productId]/[sessionId]" (current page, not a link)
```

### Implementation

- **Home button**: Always links to `/`
- **Client name**: Links to `/[clientId]/settings`
- **Product name**: Links to `/[clientId]/[productId]/settings`
- **Session name**: Not a link (current page)

---

## 🎯 User Flow Examples

### Example 1: New User

1. Land on Home (`/`) → See WelcomeView
2. Click "Add Client" → Create first client
3. Click client in drawer → Navigate to `/client-1/settings`
4. Click "Add Product" → Create first product
5. Click product in drawer → Navigate to `/client-1/product-1/settings`
6. Click "New Session" → Navigate to `/client-1/product-1/session-1` (chat)

### Example 2: Returning User

1. Land on Home (`/`) → See WelcomeView with existing clients
2. Click "Client A" in drawer → Navigate to `/client-a/settings`
3. Click "Product B" in drawer → Navigate to `/client-a/product-b/settings`
4. Click "Session C" in drawer → Navigate to `/client-a/product-b/session-c` (chat)

### Example 3: Breadcrumb Navigation

1. Currently in chat: `/client-1/product-1/session-1`
2. Click "Product1" in breadcrumb → Navigate to `/client-1/product-1/settings`
3. Click "Client1" in breadcrumb → Navigate to `/client-1/settings`
4. Click "Home" → Navigate to `/`

---

## 🔄 Auto-Redirect Behavior

### Removed Auto-Redirects:

- **Home page**: No longer auto-redirects to first client
- **Product page**: No longer auto-redirects to first session

### Active Auto-Redirects:

- **Client page** (`/[clientId]`): Redirects to `/[clientId]/settings`
- **Product page** (`/[clientId]/[productId]`): Redirects to `/[clientId]/[productId]/settings`

This ensures clean URLs and predictable navigation.

---

## 📱 Mobile Behavior

### NavigationDrawer:

- Opens as overlay with backdrop
- Auto-closes after selecting client/product/session
- Hamburger menu button in top-left
- Escape key closes drawer

### Breadcrumb:

- Responsive padding (smaller on mobile)
- Scrollable horizontally if path is long
- Touch-friendly tap targets (44×44px)

---

## ♿ Accessibility

### Keyboard Navigation:

- **Tab**: Focus through breadcrumb links
- **Enter/Space**: Activate breadcrumb link
- **Arrow keys**: Navigate drawer items
- **Escape**: Close drawer (mobile)

### ARIA Attributes:

- Breadcrumb: `<nav aria-label="Breadcrumb">`
- Current page: `aria-current="page"`
- Drawer: `role="tree"`, `role="treeitem"`

---

## 🔧 Files Modified

### Navigation Flow:

- `app/page.tsx` - Removed auto-redirect, show WelcomeView
- `app/[clientId]/page.tsx` - Redirects to `/[clientId]/settings`
- `app/[clientId]/[productId]/page.tsx` - Redirects to `/[clientId]/[productId]/settings`

### NavigationDrawer:

- `components/NavigationDrawer/NavigationDrawer.tsx`
  - `handleClientClick()` - Navigate to client settings
  - `handleProductClick()` - Navigate to product settings

### Breadcrumb:

- `components/Breadcrumb.tsx` - All items clickable (not just non-last)
- `components/AppShell.tsx` - Generate hrefs with `/settings` paths

---

## ✅ Benefits

### User Experience:

- **Clear hierarchy**: Home → Client → Product → Session
- **No surprises**: Explicit navigation, no auto-redirects
- **Breadcrumb navigation**: Quick access to any level
- **Consistent patterns**: Same flow everywhere

### Developer Experience:

- **Predictable routing**: Clear URL patterns
- **Easy to maintain**: Simple redirect logic
- **Testable**: Each route has single responsibility

### SEO & Performance:

- **Clean URLs**: `/client/settings` not `/client`
- **Fast navigation**: Client-side routing with Next.js
- **Preloading**: `<Link prefetch>` for instant navigation

---

**Status**: ✅ All navigation flows implemented and tested  
**Last Updated**: November 3, 2025
