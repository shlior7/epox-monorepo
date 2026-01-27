/**
 * API Route: Cleanup edit session temp files
 * Deletes all temporary R2 files for an edit session
 */

import { NextResponse } from 'next/server';
import { storage, storagePaths } from 'visualizer-storage';
import { withGenerationSecurity } from '@/lib/security';
import { logger } from '@/lib/logger';

interface CleanupRequest {
  editSessionId: string;
}

interface CleanupResponse {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

export const dynamic = 'force-dynamic';

export const POST = withGenerationSecurity(
  async (request, context): Promise<NextResponse<CleanupResponse>> => {
    const clientId = context.clientId;
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      const body: CleanupRequest = await request.json();

      if (!body.editSessionId) {
        return NextResponse.json(
          { success: false, error: 'Missing editSessionId' },
          { status: 400 }
        );
      }

      // Get the prefix for this edit session
      const prefix = storagePaths.editSessionPrefix(clientId, body.editSessionId);

      // List all files under this prefix
      const files = await storage.list(prefix);

      logger.info(
        { clientId, editSessionId: body.editSessionId, fileCount: files.length, prefix },
        '[edit-image/cleanup] Cleaning up temp files'
      );

      // Delete each file
      let deletedCount = 0;
      for (const file of files) {
        try {
          await storage.delete(file.key);
          deletedCount++;
        } catch (err) {
          logger.warn({ key: file.key, err }, '[edit-image/cleanup] Failed to delete file');
        }
      }

      logger.info(
        { clientId, editSessionId: body.editSessionId, deletedCount },
        '[edit-image/cleanup] Cleanup complete'
      );

      return NextResponse.json({
        success: true,
        deletedCount,
      });
    } catch (error) {
      logger.error({ error }, '[edit-image/cleanup] Failed to cleanup');
      return NextResponse.json(
        { success: false, error: 'Failed to cleanup temp files' },
        { status: 500 }
      );
    }
  }
);
