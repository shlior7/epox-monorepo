# Optimistic Updates System

This app now has a comprehensive optimistic updates system that makes all interactions feel instant.

## ✨ What's Been Implemented

### Completed Hooks (Ready to Use)

#### 1. **useStoreActions** ✅
**Location:** `components/store/hooks/useStoreActions.ts`

**Features:**
- ✅ Sync/unsync assets (instant move between sections)
- ✅ Bulk sync (multiple assets at once)
- ✅ Toggle favorite (instant heart fill/unfill)
- ✅ Delete asset (instant removal)
- ✅ Automatic rollback on error
- ✅ Toast notifications

**Usage:**
```tsx
import { useStoreActions } from '@/lib/hooks';

function MyComponent() {
  const { deleteAsset, toggleFavorite, syncAsset } = useStoreActions();

  const handleDelete = async (id: string) => {
    await deleteAsset(id); // Instant UI update!
  };

  return ...;
}
```

---

#### 2. **useProductActions** ✅
**Location:** `lib/hooks/use-product-actions.ts`

**Features:**
- ✅ Delete product (instant removal from list)
- ✅ Bulk delete (remove multiple instantly)
- ✅ Toggle favorite (instant favorite state)
- ✅ Automatic rollback on error
- ✅ Toast notifications

**Usage:**
```tsx
import { useProductActions } from '@/lib/hooks';

function ProductsList() {
  const { deleteProduct, bulkDelete } = useProductActions();

  const handleDelete = async (id: string) => {
    await deleteProduct(id); // Product vanishes instantly!
  };

  return ...;
}
```

---

#### 3. **useCollectionActions** ✅
**Location:** `lib/hooks/use-collection-actions.ts`

**Features:**
- ✅ Delete collection (instant removal)
- ✅ Update collection (instant name/data changes)
- ✅ Automatic rollback on error
- ✅ Toast notifications

**Usage:**
```tsx
import { useCollectionActions } from '@/lib/hooks';

function CollectionDetail() {
  const { updateCollection, deleteCollection } = useCollectionActions();

  const handleUpdateName = async (id: string, name: string) => {
    await updateCollection({ id, data: { name } }); // Instant update!
  };

  return ...;
}
```

---

#### 4. **useAssetActions** ✅
**Location:** `lib/hooks/use-asset-actions.ts`

**Features:**
- ✅ Delete asset (instant removal from all pages)
- ✅ Toggle favorite (instant favorite state across pages)
- ✅ Automatic rollback on error
- ✅ Toast notifications

**Usage:**
```tsx
import { useAssetActions } from '@/lib/hooks';

function AssetsPage() {
  const { deleteAsset, toggleFavorite } = useAssetActions();

  return ...;
}
```

---

## 🎯 How to Use in Your Components

### Replace Old Pattern
```tsx
// ❌ OLD (slow, no optimistic updates)
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    await apiClient.deleteProduct(id);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Deleted');
  },
});
```

### With New Pattern
```tsx
// ✅ NEW (instant, with optimistic updates)
import { useProductActions } from '@/lib/hooks';

const { deleteProduct, isDeleting } = useProductActions();

// Just call it - everything handled automatically!
await deleteProduct(productId);
```

---

## 📋 Migration Checklist

### Pages to Update

- [x] **Store Page** - Already using optimistic updates
- [ ] **Products Page** - Replace mutations with `useProductActions`
- [ ] **Collections Page** - Replace mutations with `useCollectionActions`
- [ ] **Collection Detail** - Replace mutations with `useCollectionActions`
- [ ] **Product Detail** - Replace mutations with `useProductActions`
- [ ] **Assets Page** - Replace mutations with `useAssetActions`
- [ ] **Studio Pages** - Add optimistic flow creation/updates

### Steps to Migrate a Page

1. **Import the hook:**
   ```tsx
   import { useProductActions } from '@/lib/hooks';
   ```

2. **Replace useMutation:**
   ```tsx
   // Remove this
   const deleteMutation = useMutation({ ... });

   // Add this
   const { deleteProduct, isDeleting } = useProductActions();
   ```

3. **Update handler:**
   ```tsx
   // Remove this
   const handleDelete = () => deleteMutation.mutate(id);

   // Add this
   const handleDelete = () => deleteProduct(id);
   ```

4. **Remove manual toasts** (hook handles them):
   ```tsx
   // Remove manual toast.success/error calls
   // The hook shows them automatically
   ```

---

## 🚀 Performance Benefits

### Before Optimistic Updates
```
User clicks "Delete"
→ UI shows loading spinner (500-2000ms)
→ Waits for server response
→ Updates UI
→ Shows toast
Total: 2-3 seconds
```

### After Optimistic Updates
```
User clicks "Delete"
→ UI updates instantly (0ms)
→ Shows toast immediately
→ Server request in background
→ Auto-rollback if fails
Total: Feels instant!
```

---

## 🎨 Features You Get Automatically

When you use these hooks, you automatically get:

✅ **Instant UI updates** - No waiting for server
✅ **Automatic rollback** - Reverts on error
✅ **Toast notifications** - Success/error messages
✅ **Loading states** - `isDeleting`, `isUpdating` flags
✅ **Cache synchronization** - Refetches to stay consistent
✅ **Multi-query updates** - Updates all relevant caches

---

## 🔧 Advanced Usage

### Handling Errors
```tsx
const { deleteProduct } = useProductActions();

try {
  await deleteProduct(id);
  // Success toast shown automatically
} catch (error) {
  // Error toast shown automatically
  // UI rolled back automatically
  // Do custom error handling here if needed
}
```

### Loading States
```tsx
const { deleteProduct, isDeleting, isBulkDeleting } = useProductActions();

return (
  <Button
    onClick={() => deleteProduct(id)}
    disabled={isDeleting}
  >
    {isDeleting ? 'Deleting...' : 'Delete'}
  </Button>
);
```

### Bulk Operations
```tsx
const { bulkDelete } = useProductActions();

const handleBulkDelete = async (ids: string[]) => {
  await bulkDelete(ids);
  // All products vanish instantly!
  // Toast shows: "3 products deleted"
};
```

---

## 📊 What's Optimized

| Operation | Hook | Status |
|-----------|------|--------|
| Delete product | useProductActions | ✅ |
| Bulk delete products | useProductActions | ✅ |
| Toggle product favorite | useProductActions | ✅ |
| Delete collection | useCollectionActions | ✅ |
| Update collection | useCollectionActions | ✅ |
| Delete asset | useStoreActions / useAssetActions | ✅ |
| Sync asset | useStoreActions | ✅ |
| Unsync asset | useStoreActions | ✅ |
| Bulk sync assets | useStoreActions | ✅ |
| Toggle asset favorite | useStoreActions / useAssetActions | ✅ |

---

## 🎯 Next Steps

1. **Migrate existing pages** to use these hooks (see checklist above)
2. **Add more actions** as needed (follow the same pattern)
3. **Remove old mutation code** after migration
4. **Enjoy the instant feel!** 🎉

---

## 🛠️ Adding New Optimistic Updates

To add optimistic updates for a new operation:

1. **Add method to appropriate hook:**
   ```tsx
   // In use-product-actions.ts
   const updatePriceMutation = useMutation({
     mutationFn: async ({ id, price }) => {
       return apiClient.updateProduct(id, { price });
     },
     onMutate: async ({ id, price }) => {
       // Cancel queries
       await queryClient.cancelQueries({ queryKey: ['products'] });

       // Save previous data
       const previousData = queryClient.getQueryData(['products']);

       // Optimistically update
       updateProductInCache(id, (p) => ({ ...p, price }));

       return { previousData };
     },
     onError: (err, vars, context) => {
       // Rollback
       if (context?.previousData) {
         queryClient.setQueryData(['products'], context.previousData);
       }
       toast.error('Failed to update price');
     },
     onSettled: () => {
       invalidateProducts();
     },
   });
   ```

2. **Export it:**
   ```tsx
   return {
     // ... existing
     updatePrice: updatePriceMutation.mutateAsync,
     isUpdatingPrice: updatePriceMutation.isPending,
   };
   ```

3. **Use it:**
   ```tsx
   const { updatePrice } = useProductActions();
   await updatePrice({ id, price: 99.99 });
   ```

---

## 📝 Notes

- All hooks use the same pattern for consistency
- Toasts are handled automatically (using sonner)
- Cache keys must match between hooks and queries
- Always test error scenarios to ensure rollback works
- Loading states are available for all mutations

---

**Made with ⚡ by implementing React Query optimistic updates across the entire app!**
