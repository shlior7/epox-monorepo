import { NextRequest, NextResponse } from 'next/server';
import { visualizationQueue } from '../../../../lib/services/visualization/queue';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
  }

  const job = await visualizationQueue.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    session: job.session,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  });
}
