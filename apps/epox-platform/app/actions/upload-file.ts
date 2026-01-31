'use server';

import { headers } from 'next/headers';
import { storage, storagePaths } from '@/lib/services/storage';
import { db } from '@/lib/services/db';
import { getGeminiService } from 'visualizer-ai';
import { getServerAuth } from '@/lib/services/get-auth';
import type { SubjectAnalysis, ProductAnalysis } from 'visualizer-types';

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  filename?: string;
  size?: number;
  type?: string;
  productImageId?: string;
  error?: string;
}

export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
  // Authenticate via session cookie
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie');
  const fakeRequest = new Request('http://localhost', {
    headers: { cookie: cookieHeader || '' },
  });
  const authInfo = await getServerAuth(fakeRequest);

  if (!authInfo?.clientId) {
    return { success: false, error: 'Unauthorized' };
  }

  const clientId = authInfo.clientId;
  const file = formData.get('file') as File;
  const type = formData.get('type') as string | null;
  const productId = formData.get('productId') as string | null;
  const collectionId = formData.get('collectionId') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.' };
  }

  // Validate file size (max 12MB)
  const maxSize = 12 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 12MB.`,
    };
  }

  try {
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

    const assetId = `upload_${Date.now()}`;
    let storageKey: string;
    let productImageRecord: { id: string } | null = null;

    if (type === 'product' && productId) {
      const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      storageKey = storagePaths.productImageBase(clientId, productId, imageId);
    } else if (type === 'collection' && collectionId) {
      storageKey = storagePaths.collectionAsset(clientId, collectionId, assetId, extension);
    } else {
      storageKey = storagePaths.inspirationImage(clientId, 'temp', assetId, extension);
    }

    console.log(`📤 Uploading file: ${storageKey} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

    await storage.upload(storageKey, file);

    // Create product image record + run Subject Scanner for first image
    if (type === 'product' && productId) {
      const existingImages = await db.productImages.list(productId);
      const sortOrder = existingImages.length;

      productImageRecord = await db.productImages.create(productId, {
        imageUrl: storageKey,
        sortOrder,
      });

      console.log(
        `✅ Created product image record: ${productImageRecord.id} for product ${productId}`
      );

      if (sortOrder === 0) {
        try {
          const imageUrl = storage.getPublicUrl(storageKey);
          console.log(`🔍 Running Subject Scanner on primary product image: ${imageUrl}`);

          const geminiService = getGeminiService();
          const subjectAnalysis = await geminiService.analyzeProductSubject(imageUrl);

          const product = await db.products.getById(productId);
          const existingAnalysis = product?.analysisData;

          const updatedAnalysis: ProductAnalysis = {
            analyzedAt: new Date().toISOString(),
            productType: subjectAnalysis.subjectClassHyphenated.replace(/-/g, ' '),
            materials: subjectAnalysis.materialTags ?? existingAnalysis?.materials ?? [],
            colors: existingAnalysis?.colors ?? {
              primary: subjectAnalysis.dominantColors?.[0] ?? '#B0A899',
            },
            style: existingAnalysis?.style ?? [],
            sceneTypes: subjectAnalysis.nativeSceneTypes,
            scaleHints: existingAnalysis?.scaleHints ?? { width: 'medium', height: 'medium' },
            promptKeywords: existingAnalysis?.promptKeywords ?? [],
            version: '2.0',
            subject: subjectAnalysis as SubjectAnalysis,
          };

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
          console.error(`⚠️ Subject Scanner failed for product ${productId}:`, analysisError);
        }
      }
    }

    const url = storage.getPublicUrl(storageKey);
    console.log(`✅ Uploaded file: ${url}`);

    return {
      success: true,
      url,
      key: storageKey,
      filename: file.name,
      size: file.size,
      type: file.type,
      productImageId: productImageRecord?.id,
    };
  } catch (error: any) {
    console.error('❌ Failed to upload file:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}
