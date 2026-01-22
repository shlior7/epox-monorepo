import { NextRequest, NextResponse } from 'next/server';
import { storage, storagePaths } from '@/lib/services/storage';
import { db } from '@/lib/services/db';
import { getGeminiService } from 'visualizer-ai';
import { withUploadSecurity } from '@/lib/security/middleware';
import type { SubjectAnalysis, ProductAnalysis } from 'visualizer-types';


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const POST = withUploadSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string | null; // 'product' | 'collection' | 'inspiration'
    const productId = formData.get('productId') as string | null;
    const collectionId = formData.get('collectionId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Determine file extension
    const extension =
      file.type === 'image/jpeg'
        ? 'jpg'
        : file.type === 'image/png'
          ? 'png'
          : file.type === 'image/webp'
            ? 'webp'
            : file.type === 'image/gif'
              ? 'gif'
              : 'jpg';

    // Generate asset ID
    const assetId = `upload_${Date.now()}`;

    // Determine storage path based on type
    let storageKey: string;
    let productImageRecord: { id: string } | null = null;

    if (type === 'product' && productId) {
      // Product image - generate unique image ID
      const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      storageKey = storagePaths.productImageBase(clientId, productId, imageId);
    } else if (type === 'collection' && collectionId) {
      // Collection asset
      storageKey = storagePaths.collectionAsset(clientId, collectionId, assetId, extension);
    } else {
      // Generic inspiration or temporary upload
      storageKey = storagePaths.inspirationImage(clientId, 'temp', assetId, extension);
    }

    console.log(`📤 Uploading file: ${storageKey}`);

    // Upload to storage
    await storage.upload(storageKey, file);

    // If this is a product image, also create a database record to link it to the product
    if (type === 'product' && productId) {
      // Get existing images count to determine sort order
      const existingImages = await db.productImages.list(productId);
      const sortOrder = existingImages.length;

      // Create product_image record in database
      productImageRecord = await db.productImages.create(productId, {
        r2KeyBase: storageKey,
        sortOrder,
      });

      console.log(
        `✅ Created product image record: ${productImageRecord.id} for product ${productId}`
      );

      // Run Subject Scanner on first product image (primary image)
      // This pre-computes the product's subject analysis for prompt engineering
      if (sortOrder === 0) {
        try {
          const imageUrl = storage.getPublicUrl(storageKey);
          console.log(`🔍 Running Subject Scanner on primary product image: ${imageUrl}`);

          const geminiService = getGeminiService();
          const subjectAnalysis = await geminiService.analyzeProductSubject(imageUrl);

          // Get existing product to merge analysis data
          const product = await db.products.getById(productId);
          const existingAnalysis = product?.analysisData;

          // Build updated analysis with subject scanner output
          const updatedAnalysis: ProductAnalysis = {
            analyzedAt: new Date().toISOString(),
            productType: subjectAnalysis.subjectClassHyphenated.replace(/-/g, ' '),
            materials: subjectAnalysis.materialTags ?? existingAnalysis?.materials ?? [],
            colors: existingAnalysis?.colors ?? {
              primary: subjectAnalysis.dominantColors?.[0] ?? 'neutral',
            },
            style: existingAnalysis?.style ?? [],
            sceneTypes: subjectAnalysis.nativeSceneTypes,
            scaleHints: existingAnalysis?.scaleHints ?? { width: 'medium', height: 'medium' },
            promptKeywords: existingAnalysis?.promptKeywords ?? [],
            version: '2.0',
            subject: subjectAnalysis as SubjectAnalysis,
          };

          // Update product with analysis
          await db.products.update(productId, {
            analysisData: updatedAnalysis,
            analysisVersion: '2.0',
            analyzedAt: new Date(),
            sceneTypes: subjectAnalysis.nativeSceneTypes,
          });

          console.log(`✅ Subject Scanner analysis saved for product ${productId}:`, {
            subjectClass: subjectAnalysis.subjectClassHyphenated,
            sceneTypes: subjectAnalysis.nativeSceneTypes,
            cameraAngle: subjectAnalysis.inputCameraAngle,
          });
        } catch (analysisError) {
          // Don't fail the upload if analysis fails - just log the error
          console.error(`⚠️ Subject Scanner failed for product ${productId}:`, analysisError);
        }
      }
    }

    // Get public URL
    const url = storage.getPublicUrl(storageKey);

    console.log(`✅ Uploaded file: ${url}`);

    return NextResponse.json({
      url,
      key: storageKey,
      filename: file.name,
      size: file.size,
      type: file.type,
      productImageId: productImageRecord?.id,
    });
  } catch (error: any) {
    console.error('❌ Failed to upload file:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
