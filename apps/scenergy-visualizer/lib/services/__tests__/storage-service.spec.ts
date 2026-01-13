import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import * as StorageService from '../s3/storage-service';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const { createUploadMock } = vi.hoisted(() => ({
  createUploadMock: vi.fn(),
}));

const sendMock = vi.fn();
const uploadDoneMock = vi.fn();
const originalFetch = globalThis.fetch;
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
const expectedBaseUrl = (() => {
  const publicUrl =
    process.env.R2_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (publicUrl) {
    return publicUrl.replace(/\/+$/, '');
  }

  return 'https://test-bucket.r2.cloudflarestorage.com';
})();

vi.mock('../s3/client', async () => {
  const actual = await vi.importActual('../s3/client');
  return {
    ...actual,
    getS3Client: () => ({ send: sendMock }),
    getS3Bucket: () => 'test-bucket',
  };
});

vi.mock('../s3/adapter', () => ({
  createUpload: createUploadMock,
  isFsDriver: false,
}));

describe('s3/storage-service', () => {
  beforeEach(() => {
    sendMock.mockReset();
    uploadDoneMock.mockReset();
    uploadDoneMock.mockResolvedValue(undefined);
    createUploadMock.mockReset();
    createUploadMock.mockReturnValue({ done: uploadDoneMock });
    warnSpy.mockClear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['preview'], { type: 'image/jpeg' })),
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    }) as any;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    warnSpy.mockRestore();
  });

  it('uploadFile infers content-type and returns S3 URL', async () => {
    const file = new File(['hello'], 'image.JPG', { type: 'application/octet-stream' });

    const url = await StorageService.uploadFile('clients/test/media/image.JPG', file);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [command] = sendMock.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input.Key).toBe('clients/test/media/image.JPG');
    expect((command as PutObjectCommand).input.ContentType).toBe('image/jpeg');
    expect(createUploadMock).not.toHaveBeenCalled();
    expect(url).toBe(`${expectedBaseUrl}/clients/test/media/image.JPG`);
  });

  it('uploadFile uses multipart upload for files >= 5MB when using AWS driver', async () => {
    const bigBuffer = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([bigBuffer], 'large.bin', { type: 'application/octet-stream' });

    await StorageService.uploadFile('clients/test/media/large.bin', file);

    expect(createUploadMock).toHaveBeenCalledTimes(1);
    const options = createUploadMock.mock.calls[0][0];
    expect(options.params.Key).toBe('clients/test/media/large.bin');
    expect(options.params.ContentType).toBe('application/octet-stream');
    expect(uploadDoneMock).toHaveBeenCalledTimes(1);
  });

  it('downloadFile retrieves blob with correct metadata', async () => {
    const bodyMock = {
      transformToByteArray: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    };
    sendMock.mockResolvedValueOnce({
      Body: bodyMock,
      ContentType: 'image/png',
    });

    const blob = await StorageService.downloadFile('clients/test/file.png');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [command] = sendMock.mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as GetObjectCommand).input.Key).toBe('clients/test/file.png');
    expect(bodyMock.transformToByteArray).toHaveBeenCalledTimes(1);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(3);
  });

  it('uploadFile propagates upload errors', async () => {
    const file = new File(['oops'], 'broken.png', { type: 'image/png' });
    sendMock.mockRejectedValueOnce(new Error('upload failed'));

    await expect(StorageService.uploadFile('path/to/file.png', file)).rejects.toThrow('upload failed');
  });

  it('downloadFile throws when S3 response lacks body', async () => {
    sendMock.mockResolvedValueOnce({
      Body: null,
      ContentType: 'image/png',
    });

    await expect(StorageService.downloadFile('clients/test/missing.png')).rejects.toThrow('No body in S3 response');
  });
  it('deleteProductImage attempts to delete base and preview paths', async () => {
    sendMock.mockResolvedValue({});

    await StorageService.deleteProductImage('client-1', 'product-1', 'image-1');

    expect(sendMock).toHaveBeenCalledTimes(2);
    const [firstCommand] = sendMock.mock.calls[0];
    const [secondCommand] = sendMock.mock.calls[1];
    expect(firstCommand).toBeInstanceOf(DeleteObjectCommand);
    expect((firstCommand as DeleteObjectCommand).input.Key).toContain('media/images/base/image-1.png');
    expect(secondCommand).toBeInstanceOf(DeleteObjectCommand);
    expect((secondCommand as DeleteObjectCommand).input.Key).toContain('media/images/preview/image-1.jpg');
  });

  it('deleteProductImage warns when deletion fails', async () => {
    sendMock.mockImplementationOnce(() => {
      throw new Error('delete failed');
    });
    sendMock.mockResolvedValueOnce({});

    await StorageService.deleteProductImage('client-err', 'product-err', 'image-err');

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete base image'), expect.any(Error));
  });


  it('withFallbackImage issues single HEAD request and falls back on failure', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValueOnce({ ok: false });

    const url = await StorageService.withFallbackImage('https://primary', 'https://fallback');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://primary', { method: 'HEAD' });
    expect(url).toBe('https://fallback');
  });

  it('uploadProductImagePreview converts data URL to blob and uploads via uploadFile', async () => {
    const dataUrl = 'data:image/jpeg;base64,aGVsbG8=';

    const url = await StorageService.uploadProductImagePreview('clientA', 'productB', 'imageC', dataUrl);

    expect(globalThis.fetch).toHaveBeenCalledWith(dataUrl);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [command] = sendMock.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input.Key).toBe('clients/clientA/products/productB/media/images/preview/imageC.jpg');
    expect(url).toBe(`${expectedBaseUrl}/clients/clientA/products/productB/media/images/preview/imageC.jpg`);
  });

  it('getPreviewImageUrl and getBaseImageUrl map through S3 paths', () => {
    expect(StorageService.getPreviewImageUrl('clientX', 'productY', 'imageZ')).toBe(
      `${expectedBaseUrl}/clients/clientX/products/productY/media/images/preview/imageZ.jpg`
    );
    expect(StorageService.getBaseImageUrl('clientX', 'productY', 'imageZ')).toBe(
      `${expectedBaseUrl}/clients/clientX/products/productY/media/images/base/imageZ.png`
    );
    expect(StorageService.getProductModelUrl('clientX', 'productY', 'model.glb')).toBe(
      `${expectedBaseUrl}/clients/clientX/products/productY/media/models/model.glb`
    );
  });

  it('withFallbackImage returns original URL when fetch succeeds', async () => {
    const result = await StorageService.withFallbackImage('https://primary', 'https://fallback');
    expect(result).toBe('https://primary');
  });

  it('withFallbackImage returns original when HEAD request succeeds', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValueOnce({ ok: true });

    const result = await StorageService.withFallbackImage('https://origin', 'https://fallback');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://origin', { method: 'HEAD' });
    expect(result).toBe('https://origin');
  });

  it('withFallbackImage returns fallback when fetch fails', async () => {
    (globalThis.fetch as vi.Mock).mockRejectedValueOnce(new Error('network'));
    const result = await StorageService.withFallbackImage('https://primary', 'https://fallback');
    expect(result).toBe('https://fallback');
  });

  it('withFallbackImage returns fallback when HEAD returns non-ok status', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValueOnce({ ok: false });
    const result = await StorageService.withFallbackImage('https://primary', 'https://fallback');
    expect(result).toBe('https://fallback');
  });
});
