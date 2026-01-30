/**
 * Import Products API Route
 * POST - Import products from connected store
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { storage, storagePaths } from '@/lib/services/storage';
import { getStoreService } from '@/lib/services/erp';
import { resolveStorageUrlAbsolute } from 'visualizer-storage';

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

    // Pre-create all unique categories sequentially to avoid race conditions
    const categoryNameToId = new Map<string, { id: string; name: string; hasSettings: boolean }>();
    const categoryProductCount = new Map<string, number>();
    for (const storeProduct of validProducts) {
      if (!storeProduct.categories) continue;
      for (const storeCat of storeProduct.categories) {
        if (!storeCat.name) continue;
        const key = storeCat.name.toLowerCase().trim();
        categoryProductCount.set(key, (categoryProductCount.get(key) ?? 0) + 1);
        if (!categoryNameToId.has(key)) {
          const cat = await db.categories.getOrCreate(clientId, storeCat.name);
          categoryNameToId.set(key, {
            id: cat.id,
            name: cat.name,
            hasSettings: !!cat.generationSettings,
          });
        }
      }
    }

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

        // Link product to pre-created categories
        if (storeProduct.categories && storeProduct.categories.length > 0) {
          for (let ci = 0; ci < storeProduct.categories.length; ci++) {
            const storeCat = storeProduct.categories[ci];
            if (!storeCat.name) continue;
            const key = storeCat.name.toLowerCase().trim();
            const catInfo = categoryNameToId.get(key);
            if (!catInfo) continue;
            try {
              await db.productCategories.link(product.id, catInfo.id, ci === 0);
            } catch (catError) {
              console.error(`Failed to link category "${storeCat.name}" to product ${product.name}:`, catError);
            }
          }
        }

        return product;
      })
    );

    // Find categories without generation settings (new categories needing wizard)
    const allCategories = Array.from(categoryNameToId.entries()).map(([key, c]) => ({
      ...c,
      productCount: categoryProductCount.get(key) ?? 0,
    }));
    const unconfiguredCategories = allCategories.filter((c) => !c.hasSettings);

    console.log(`✅ Imported ${importedProducts.length} products for client ${clientId}, ${allCategories.length} categories linked, ${unconfiguredCategories.length} unconfigured`);

    // Fire-and-forget: trigger background analysis for newly imported products
    const newProductIds = importedProducts.map(p => p.id);
    if (newProductIds.length > 0) {
      analyzeImportedProducts(newProductIds).catch(err =>
        console.warn('⚠️ Background product analysis failed:', err)
      );
    }

    return NextResponse.json({
      success: true,
      imported: importedProducts.length,
      products: importedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        storeId: p.storeId,
      })),
      categories: allCategories.map((c) => ({ id: c.id, name: c.name, productCount: c.productCount })),
      unconfiguredCategories: unconfiguredCategories.map((c) => ({ id: c.id, name: c.name, productCount: c.productCount })),
    });
  } catch (error: any) {
    console.error('❌ Failed to import products:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

/**
 * Background analysis for imported products.
 * Runs sequentially to avoid overwhelming the AI API.
 */
async function analyzeImportedProducts(productIds: string[]) {
  const { getProductAnalysisService } = await import('visualizer-ai');
  const analysisService = getProductAnalysisService();

  for (const productId of productIds) {
    try {
      const product = await db.products.getById(productId);
      if (!product) continue;

      // Get primary image URL
      const imagesMap = await db.productImages.listByProductIds([productId]);
      const images = imagesMap.get(productId) || [];
      const primaryImage = images.find(img => img.isPrimary) ?? images[0];
      const imageUrl = primaryImage?.imageUrl
        ? (resolveStorageUrlAbsolute(primaryImage.imageUrl) ?? undefined)
        : undefined;

      const result = await analysisService.analyzeProductWithAI({
        productId,
        name: product.name,
        description: product.description ?? undefined,
        category: product.category ?? undefined,
        imageUrl,
      });

      const importPrimaryColor = result.colorSchemes?.[0]?.colors[0] || '#000000';
      await db.products.update(productId, {
        analysisData: {
          analyzedAt: new Date().toISOString(),
          productType: result.productType || 'product',
          materials: result.materials || [],
          colors: result.colorSchemes?.[0]
            ? { primary: importPrimaryColor, accent: result.colorSchemes[0].colors.slice(1) }
            : { primary: '#000000' },
          dominantColorHex: importPrimaryColor,
          style: result.styles || [],
          sceneTypes: result.sceneTypes || ['Living Room'],
          scaleHints: { width: result.size?.type || 'medium', height: result.size?.dimensions || 'medium' },
          promptKeywords: [],
          version: '1.0',
          subject: {
            subjectClassHyphenated: result.productType?.replace(/\s+/g, '-') || 'product',
            nativeSceneTypes: result.sceneTypes || ['Living Room'],
            nativeSceneCategory: 'Indoor Room' as const,
            inputCameraAngle: 'Frontal' as const,
            dominantColors: result.colorSchemes?.[0]?.colors,
            materialTags: result.materials,
          },
        },
        analyzedAt: new Date(),
      });
      console.log(`✅ Analyzed imported product: ${product.name}`);
    } catch (err) {
      console.warn(`⚠️ Analysis failed for product ${productId}:`, err);
    }
  }
}
