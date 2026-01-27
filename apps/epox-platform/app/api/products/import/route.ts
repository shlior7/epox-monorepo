/**
 * Import Products API Route
 * POST - Import products from connected store
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { storage, storagePaths } from '@/lib/services/storage';
import { getStoreService } from '@/lib/services/erp';

async function downloadImage(url: string): Promise<{ blob: Blob; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageImporter/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to download image from ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const blob = await response.blob();
    return { blob, contentType };
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error);
    return null;
  }
}

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds must be a non-empty array' }, { status: 400 });
    }

    // Limit to 50 products per import
    if (productIds.length > 50) {
      return NextResponse.json(
        { error: 'Cannot import more than 50 products at once' },
        { status: 400 }
      );
    }

    // Get store connection
    const storeService = getStoreService();
    const connection = await db.storeConnections.getByClientId(clientId);

    if (!connection) {
      return NextResponse.json({ error: 'No store connection found' }, { status: 404 });
    }

    // Fetch product details from store
    const storeProducts = await Promise.all(
      productIds.map(async (productId) => {
        try {
          const product = await storeService.getProduct(clientId, productId);
          return product;
        } catch (error) {
          console.error(`Failed to fetch product ${productId}:`, error);
          return null;
        }
      })
    );

    // Filter out failed fetches
    const validProducts = storeProducts.filter((p) => p !== null);

    if (validProducts.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch any products from store' },
        { status: 400 }
      );
    }

    console.log(
      `✅ Fetched ${validProducts.length}/${productIds.length} products from store`,
      JSON.stringify(validProducts, null, 2)
    );

    // Import products into database
    const importedProducts = await Promise.all(
      validProducts.map(async (storeProduct) => {
        // Check if product already exists with this storeId
        const existing = await db.products.findByStoreId(clientId, String(storeProduct.id));

        if (existing) {
          // Update existing product
          return db.products.update(existing.id, {
            name: storeProduct.name,
            description: storeProduct.description || undefined,
            storeSku: storeProduct.sku || undefined,
            storeName: storeProduct.name,
          });
        }

        // Create new product
        const product = await db.products.create(clientId, {
          name: storeProduct.name,
          description: storeProduct.description || undefined,
          category: storeProduct.categories?.[0]?.name || undefined,
          source: 'imported',
          storeConnectionId: connection.id,
          storeId: String(storeProduct.id),
          storeSku: storeProduct.sku || undefined,
          storeUrl: undefined,
          storeName: storeProduct.name,
          importedAt: new Date(),
        });

        // Import product images if available
        if (storeProduct.images && storeProduct.images.length > 0) {
          // Import up to 5 images per product
          const imagesToImport = storeProduct.images.slice(0, 5);

          for (let i = 0; i < imagesToImport.length; i++) {
            const storeImage = imagesToImport[i];
            if (!storeImage.src) continue;

            try {
              // Download the image
              const downloaded = await downloadImage(storeImage.src);
              if (!downloaded) continue;

              // Generate image ID and storage key
              const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              const storageKey = storagePaths.productImageBase(clientId, product.id, imageId);

              // Upload to storage
              await storage.upload(storageKey, downloaded.blob);

              // Create product_image record with sync info
              await db.productImages.create(product.id, {
                imageUrl: storageKey,
                sortOrder: i,
                isPrimary: i === 0,
                syncStatus: 'synced', // Mark as synced since it's from the store
                originalStoreUrl: storeImage.src, // Keep reference to original store URL
                externalImageId: String(storeImage.id), // Save the store's image ID for updates
              });

              console.log(
                `✅ Imported image ${i + 1}/${imagesToImport.length} for product ${product.name} (store ID: ${storeImage.id})`
              );
            } catch (imageError) {
              console.error(`Failed to import image for product ${product.name}:`, imageError);
              // Continue with other images even if one fails
            }
          }
        }

        return product;
      })
    );

    console.log(`✅ Imported ${importedProducts.length} products for client ${clientId}`);

    return NextResponse.json({
      success: true,
      imported: importedProducts.length,
      products: importedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        storeId: p.storeId,
      })),
    });
  } catch (error: any) {
    console.error('❌ Failed to import products:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
