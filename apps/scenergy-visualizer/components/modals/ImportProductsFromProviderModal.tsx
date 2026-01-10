'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '@/lib/contexts/DataContext';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { X, Loader2, CheckCircle, XCircle, ShoppingCart, Search, ChevronDown, Package } from 'lucide-react';
import { buildTestId } from '@/lib/utils/test-ids';
import type { WooCommerceProductPreview } from '@/app/api/provider/woocommerce/products/route';
import type { WooCommerceCategory } from '@/app/api/provider/woocommerce/categories/route';

interface ImportProductsFromProviderModalProps {
  isOpen: boolean;
  clientId: string;
  onClose: () => void;
}

interface ProductImportState {
  product: WooCommerceProductPreview;
  status: 'pending' | 'importing' | 'completed' | 'error';
  error?: string;
}

const styles = {
  ...commonStyles.modal,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: `1px solid ${colors.slate[700]}`,
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.slate[100],
  },
  body: {
    padding: '24px',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  configSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '24px',
  },
  configRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  configField: {
    flex: 1,
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.slate[300],
  },
  input: {
    padding: '10px 12px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    paddingRight: '32px',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  productCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: colors.slate[800],
    border: `1px solid ${colors.slate[700]}`,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  productCardSelected: {
    borderColor: colors.indigo[500],
    boxShadow: `0 0 0 1px ${colors.indigo[500]}`,
  },
  productImage: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover' as const,
    backgroundColor: colors.slate[900],
  },
  productInfo: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  productName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.slate[100],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  productMeta: {
    fontSize: '12px',
    color: colors.slate[400],
  },
  statusBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: colors.slate[400],
    textAlign: 'center' as const,
    gap: '16px',
  },
  footer: {
    padding: '20px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: '14px',
    color: colors.slate[400],
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  checkbox: {
    position: 'absolute' as const,
    top: '8px',
    left: '8px',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: `2px solid ${colors.slate[500]}`,
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.indigo[500],
    borderColor: colors.indigo[500],
  },
};

export function ImportProductsFromProviderModal({ isOpen, clientId, onClose }: ImportProductsFromProviderModalProps) {
  const { addProduct, refreshData, clients } = useData();

  // Configuration state
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [productIds, setProductIds] = useState('');

  // Data state
  const [categories, setCategories] = useState<WooCommerceCategory[]>([]);
  const [products, setProducts] = useState<WooCommerceProductPreview[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // Loading/progress state
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStates, setImportStates] = useState<ProductImportState[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if client has WooCommerce configured
  const client = clients.find((c) => c.id === clientId);
  const hasWooCommerce = client?.commerce?.provider === 'woocommerce';

  // Fetch categories on mount
  useEffect(() => {
    if (!isOpen || !hasWooCommerce) return;

    const fetchCategories = async () => {
      setIsFetchingCategories(true);
      try {
        const response = await fetch('/api/provider/woocommerce/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }),
        });
        const data = await response.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setIsFetchingCategories(false);
      }
    };

    fetchCategories();
  }, [isOpen, clientId, hasWooCommerce]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!hasWooCommerce) return;

    setIsFetchingProducts(true);
    setError(null);
    setProducts([]);
    setSelectedProducts(new Set());

    try {
      const body: Record<string, unknown> = {
        clientId,
        limit,
        status: 'publish',
      };

      if (category) {
        body.category = category;
      }

      if (search.trim()) {
        body.search = search.trim();
      }

      if (productIds.trim()) {
        const ids = productIds
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id));
        if (ids.length > 0) {
          body.productIds = ids;
        }
      }

      const response = await fetch('/api/provider/woocommerce/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setIsFetchingProducts(false);
    }
  }, [clientId, limit, category, search, productIds, hasWooCommerce]);

  // Toggle product selection
  const toggleProductSelection = (productId: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Select all products
  const selectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  // Import selected products
  const handleImportProducts = async () => {
    const selectedProductsList = products.filter((p) => selectedProducts.has(p.id));
    if (selectedProductsList.length === 0) return;

    setIsImporting(true);
    setImportStates(
      selectedProductsList.map((product) => ({
        product,
        status: 'pending',
      }))
    );

    // Import products one by one
    for (let i = 0; i < selectedProductsList.length; i++) {
      const wooProduct = selectedProductsList[i];

      setImportStates((prev) =>
        prev.map((state, idx) => (idx === i ? { ...state, status: 'importing' } : state))
      );

      try {
        // Download images and create files
        const imageFiles: File[] = [];

        if (wooProduct.images && wooProduct.images.length > 0) {
          for (const image of wooProduct.images.slice(0, 5)) {
            // Limit to 5 images
            try {
              // Use proxy to avoid CORS
              const proxyUrl = `/api/download-image?url=${encodeURIComponent(image.src)}`;
              const response = await fetch(proxyUrl);
              if (response.ok) {
                const blob = await response.blob();
                const file = new File([blob], `${image.id}.jpg`, { type: 'image/jpeg' });
                imageFiles.push(file);
              }
            } catch (imgErr) {
              console.error(`Failed to download image ${image.id}:`, imgErr);
            }
          }
        }

        // Strip HTML from description
        const stripHtml = (html: string) => {
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          return tmp.textContent || tmp.innerText || '';
        };

        const description = stripHtml(wooProduct.shortDescription || wooProduct.description || '');

        // Create the product
        await addProduct(clientId, wooProduct.name, description, imageFiles);

        setImportStates((prev) =>
          prev.map((state, idx) => (idx === i ? { ...state, status: 'completed' } : state))
        );

        console.log(`✅ Imported product: ${wooProduct.name}`);
      } catch (err) {
        console.error(`Failed to import product ${wooProduct.name}:`, err);
        setImportStates((prev) =>
          prev.map((state, idx) =>
            idx === i
              ? { ...state, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
              : state
          )
        );
      }
    }

    // Refresh data after all imports
    await refreshData();
    setIsImporting(false);
  };

  // Handle close
  const handleClose = () => {
    if (isImporting) {
      if (!confirm('Import is in progress. Are you sure you want to close?')) {
        return;
      }
    }

    // Reset state
    setProducts([]);
    setSelectedProducts(new Set());
    setImportStates([]);
    setError(null);
    setSearch('');
    setProductIds('');
    onClose();
  };

  if (!isOpen) return null;

  const allCompleted = importStates.length > 0 && importStates.every((s) => s.status === 'completed');
  const hasErrors = importStates.some((s) => s.status === 'error');
  const completedCount = importStates.filter((s) => s.status === 'completed').length;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      data-testid={buildTestId('import-products-modal', 'overlay')}
    >
      <div
        style={{ ...styles.content, maxWidth: '900px' }}
        onClick={(e) => e.stopPropagation()}
        data-testid={buildTestId('import-products-modal', 'content')}
      >
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart style={{ width: '24px', height: '24px', color: colors.indigo[400] }} />
            <h2 style={styles.title}>Import from WooCommerce</h2>
          </div>
          <button
            onClick={handleClose}
            style={{ ...commonStyles.button.icon, color: colors.slate[400] }}
            data-testid={buildTestId('import-products-modal', 'close-button')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={styles.body}>
          {!hasWooCommerce ? (
            <div style={styles.emptyState}>
              <ShoppingCart style={{ width: '48px', height: '48px' }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
                  WooCommerce Not Configured
                </div>
                <div style={{ fontSize: '14px' }}>
                  This client doesn&apos;t have WooCommerce credentials configured. Please update the client settings first.
                </div>
              </div>
            </div>
          ) : isImporting || importStates.length > 0 ? (
            // Import progress view
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff' }}>
                {allCompleted
                  ? `Successfully imported ${completedCount} product${completedCount !== 1 ? 's' : ''}`
                  : `Importing products... (${completedCount}/${importStates.length})`}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {importStates.map((state, index) => (
                  <div
                    key={state.product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: colors.slate[800],
                      borderRadius: '8px',
                      border: `1px solid ${colors.slate[700]}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>{state.product.name}</div>
                      {state.error && (
                        <div style={{ fontSize: '12px', color: colors.red[400], marginTop: '4px' }}>{state.error}</div>
                      )}
                    </div>
                    {state.status === 'pending' && (
                      <div style={{ fontSize: '12px', color: colors.slate[400] }}>Waiting...</div>
                    )}
                    {state.status === 'importing' && (
                      <Loader2
                        style={{
                          width: '20px',
                          height: '20px',
                          color: colors.indigo[400],
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    )}
                    {state.status === 'completed' && (
                      <CheckCircle style={{ width: '20px', height: '20px', color: colors.green[400] }} />
                    )}
                    {state.status === 'error' && (
                      <XCircle style={{ width: '20px', height: '20px', color: colors.red[400] }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Configuration and product selection view
            <>
              {/* Configuration Section */}
              <div style={styles.configSection}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.slate[300], marginBottom: '8px' }}>
                  Filter Products
                </div>

                <div style={styles.configRow}>
                  <div style={styles.configField}>
                    <label style={styles.label}>Max Products</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value, 10) || 10)}
                      style={styles.input}
                      data-testid={buildTestId('import-products-modal', 'limit-input')}
                    />
                  </div>

                  <div style={styles.configField}>
                    <label style={styles.label}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={styles.select}
                      disabled={isFetchingCategories}
                      data-testid={buildTestId('import-products-modal', 'category-select')}
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name} ({cat.count})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.configRow}>
                  <div style={{ ...styles.configField, flex: 2 }}>
                    <label style={styles.label}>Search</label>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products..."
                      style={styles.input}
                      data-testid={buildTestId('import-products-modal', 'search-input')}
                    />
                  </div>

                  <div style={{ ...styles.configField, flex: 2 }}>
                    <label style={styles.label}>Product IDs (comma-separated)</label>
                    <input
                      type="text"
                      value={productIds}
                      onChange={(e) => setProductIds(e.target.value)}
                      placeholder="e.g. 123, 456, 789"
                      style={styles.input}
                      data-testid={buildTestId('import-products-modal', 'product-ids-input')}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={fetchProducts}
                    disabled={isFetchingProducts}
                    style={{
                      ...commonStyles.button.primary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isFetchingProducts ? 0.6 : 1,
                    }}
                    data-testid={buildTestId('import-products-modal', 'fetch-button')}
                  >
                    {isFetchingProducts ? (
                      <>
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Search style={{ width: '16px', height: '16px' }} />
                        Fetch Products
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${colors.red[700]}`,
                    borderRadius: '8px',
                    color: colors.red[400],
                    fontSize: '14px',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Products Grid */}
              {products.length > 0 && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '14px', color: colors.slate[400] }}>
                      {products.length} product{products.length !== 1 ? 's' : ''} found
                    </div>
                    <button
                      onClick={selectAllProducts}
                      style={{ ...commonStyles.button.secondary, fontSize: '13px', padding: '6px 12px' }}
                    >
                      {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div style={styles.productGrid}>
                    {products.map((product) => {
                      const isSelected = selectedProducts.has(product.id);
                      const hasImages = product.images && product.images.length > 0;

                      return (
                        <div
                          key={product.id}
                          onClick={() => toggleProductSelection(product.id)}
                          style={{
                            ...styles.productCard,
                            ...(isSelected ? styles.productCardSelected : {}),
                            position: 'relative',
                          }}
                          data-testid={buildTestId('import-products-modal', 'product-card', product.id)}
                        >
                          {/* Selection checkbox */}
                          <div
                            style={{
                              ...styles.checkbox,
                              ...(isSelected ? styles.checkboxChecked : {}),
                            }}
                          >
                            {isSelected && <CheckCircle style={{ width: '14px', height: '14px', color: '#ffffff' }} />}
                          </div>

                          {/* Product image */}
                          {hasImages ? (
                            <img
                              src={product.images[0].src}
                              alt={product.name}
                              style={styles.productImage}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                ...styles.productImage,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Package style={{ width: '32px', height: '32px', color: colors.slate[600] }} />
                            </div>
                          )}

                          {/* Product info */}
                          <div style={styles.productInfo}>
                            <div style={styles.productName} title={product.name}>
                              {product.name}
                            </div>
                            <div style={styles.productMeta}>
                              {product.images?.length || 0} image{product.images?.length !== 1 ? 's' : ''}
                              {product.sku && ` • SKU: ${product.sku}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Empty State */}
              {!isFetchingProducts && products.length === 0 && !error && (
                <div style={styles.emptyState}>
                  <ShoppingCart style={{ width: '48px', height: '48px' }} />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
                      No Products Fetched Yet
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Configure the filters above and click &quot;Fetch Products&quot; to load products from your WooCommerce store.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.infoText}>
            {isImporting
              ? `Importing ${completedCount}/${importStates.length} products...`
              : allCompleted
                ? 'All products imported successfully!'
                : selectedProducts.size > 0
                  ? `${selectedProducts.size} product${selectedProducts.size !== 1 ? 's' : ''} selected`
                  : 'Select products to import'}
          </div>
          <div style={styles.buttonGroup}>
            <button
              onClick={handleClose}
              style={commonStyles.button.secondary}
              data-testid={buildTestId('import-products-modal', 'cancel-button')}
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>
            {!allCompleted && !isImporting && (
              <button
                onClick={handleImportProducts}
                disabled={selectedProducts.size === 0}
                style={{
                  ...commonStyles.button.primary,
                  opacity: selectedProducts.size === 0 ? 0.5 : 1,
                }}
                data-testid={buildTestId('import-products-modal', 'import-button')}
              >
                Import Selected ({selectedProducts.size})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
