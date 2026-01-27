'use client';

import React, { useRef, useState } from 'react';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { BulkGLBPreview, type BulkGLBPreviewHandle } from '../modals/BulkGLBPreview';
import { processGLBToImages } from '@/lib/services/product-image-processor';
import { v4 as uuidv4 } from 'uuid';
import { buildTestId } from '@/lib/utils/test-ids';

interface CameraDefaults {
  radius: number;
  minRadius: number;
  maxRadius: number;
}

interface CameraSettings {
  alpha: number;
  beta: number;
  radius?: number;
  fov: number;
  defaults?: CameraDefaults;
}

export interface FileUploadResult {
  mode: 'images' | 'glb';
  files: File[];
  glbFile?: File | null;
  jpegPreviews?: string[];
}

interface FileUploadSectionProps {
  // Callback when files are ready (either selected images or processed GLB)
  onFilesReady?: (result: FileUploadResult) => void;
  // Optional: callback during GLB processing
  onProcessingChange?: (isProcessing: boolean) => void;
  // Optional: initial mode
  initialMode?: 'images' | 'glb';
  // Optional: control whether to show mode toggle
  showModeToggle?: boolean;
}

const styles = {
  toggleContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    padding: '4px',
    backgroundColor: colors.slate[800],
    borderRadius: '8px',
    border: `1px solid ${colors.slate[700]}`,
  },
  toggleButton: {
    flex: 1,
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'transparent',
    color: colors.slate[400],
  },
  toggleButtonActive: {
    backgroundColor: colors.indigo[600],
    color: '#ffffff',
  },
  uploadZone: {
    width: '100%',
    border: `2px dashed ${colors.slate[600]}`,
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
    backgroundColor: colors.slate[900],
    marginBottom: '24px',
  },
  uploadIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    color: colors.slate[400],
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.slate[300],
    marginBottom: '8px',
  },
  uploadSubtext: {
    fontSize: '14px',
    color: colors.slate[500],
  },
  previewContainer: {
    padding: '15px',
    borderRadius: '12px',
    border: `1px solid ${colors.slate[700]}`,
    backgroundColor: colors.slate[900],
  },
  previewTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '12px',
  },
  previewDescription: {
    fontSize: '14px',
    color: colors.slate[400],
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  imagePreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  imagePreviewItem: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover' as const,
    borderRadius: '8px',
    border: `1px solid ${colors.slate[700]}`,
  },
};

// Helper function to rename a file with UUID
function renameFileWithUUID(file: File): File {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const uuid = uuidv4();
  const newName = `${uuid}.${extension}`;
  return new File([file], newName, { type: file.type });
}

// Helper function to generate JPEG preview from an image file
async function generateJPEGPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to convert to JPEG
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw white background (for transparency)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Convert to JPEG data URL
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(jpegDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function FileUploadSection({
  onFilesReady,
  onProcessingChange,
  initialMode = 'images',
  showModeToggle = true,
}: FileUploadSectionProps) {
  // Internal state
  const [uploadMode, setUploadMode] = useState<'images' | 'glb'>(initialMode);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jpegPreviews, setJpegPreviews] = useState<string[]>([]); // Track JPEG previews
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    alpha: 0,
    beta: Math.PI / 3,
    fov: 0.8,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<BulkGLBPreviewHandle>(null);

  const handleCameraUpdate = (camera: { alpha: number; beta: number; radius: number; fov: number; defaults?: CameraDefaults }) => {
    setCameraSettings({
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      fov: camera.fov,
      defaults: camera.defaults,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (uploadMode === 'images') {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      // Rename files with UUIDs and generate JPEG previews
      const renamedFiles = imageFiles.map(renameFileWithUUID);
      const generatedPreviews = await Promise.all(imageFiles.map(generateJPEGPreview));

      setSelectedFiles(renamedFiles);
      setJpegPreviews(generatedPreviews);

      // Immediately notify parent with renamed images and previews
      if (onFilesReady && renamedFiles.length > 0) {
        onFilesReady({
          mode: 'images',
          files: renamedFiles,
          jpegPreviews: generatedPreviews,
        });
      }
    } else {
      const glbFiles = files.filter((file) => file.name.toLowerCase().endsWith('.glb'));
      if (glbFiles.length > 0) {
        const file = glbFiles[0];
        setGlbFile(file);
        // Don't auto-process - let user adjust camera first
        setSelectedFiles([]);
        setJpegPreviews([]);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (uploadMode === 'images') {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      // Rename files with UUIDs and generate JPEG previews
      const renamedFiles = imageFiles.map(renameFileWithUUID);
      const generatedPreviews = await Promise.all(imageFiles.map(generateJPEGPreview));

      setSelectedFiles(renamedFiles);
      setJpegPreviews(generatedPreviews);

      // Immediately notify parent with renamed images and previews
      if (onFilesReady && renamedFiles.length > 0) {
        onFilesReady({
          mode: 'images',
          files: renamedFiles,
          jpegPreviews: generatedPreviews,
        });
      }
    } else {
      const glbFiles = files.filter((file) => file.name.toLowerCase().endsWith('.glb'));
      if (glbFiles.length > 0) {
        const file = glbFiles[0];
        setGlbFile(file);
        // Don't auto-process - let user adjust camera first
        setSelectedFiles([]);
        setJpegPreviews([]);
      }
    }
  };

  const takeScreenshot = async () => {
    if (!glbFile || !previewRef.current) {
      console.error('GLB file or preview not available');
      return;
    }

    setIsProcessing(true);
    if (onProcessingChange) {
      onProcessingChange(true);
    }

    try {
      const result = await previewRef.current.captureScreenshot();

      if (!result) {
        throw new Error('Failed to capture screenshot');
      }

      console.log('📸 Screenshot captured with camera:', {
        alpha: result.cameraState.alpha.toFixed(3),
        beta: result.cameraState.beta.toFixed(3),
        radius: result.cameraState.radius.toFixed(3),
        fov: result.cameraState.fov.toFixed(3),
      });

      // Convert data URL to File with UUID
      const { v4: uuidv4 } = await import('uuid');
      const imageId = uuidv4();
      const { dataUrlToFile } = await import('@/lib/services/glb-renderer');

      const pngFile = dataUrlToFile(result.dataUrl, `${imageId}.png`);

      // Add to existing files
      const newFiles = [...selectedFiles, pngFile];
      const newPreviews = [...jpegPreviews, result.jpegPreview];

      setSelectedFiles(newFiles);
      setJpegPreviews(newPreviews);

      // Notify parent
      if (onFilesReady) {
        onFilesReady({
          mode: 'glb',
          files: newFiles,
          glbFile: glbFile,
          jpegPreviews: newPreviews,
        });
      }

      console.log(`✅ Screenshot added. Total: ${newFiles.length} images`);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      alert('Failed to take screenshot. Please try again.');
    } finally {
      setIsProcessing(false);
      if (onProcessingChange) {
        onProcessingChange(false);
      }
    }
  };

  const handleDeleteSelectedImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = jpegPreviews.filter((_, i) => i !== index);

    setSelectedFiles(newFiles);
    setJpegPreviews(newPreviews);

    // Notify parent with updated files (preserving mode and glbFile)
    if (onFilesReady && newFiles.length > 0) {
      onFilesReady({
        mode: uploadMode,
        files: newFiles,
        glbFile: glbFile,
        jpegPreviews: newPreviews,
      });
    } else if (onFilesReady && newFiles.length === 0) {
      // If all files deleted, still notify but with empty arrays
      onFilesReady({
        mode: uploadMode,
        files: [],
        glbFile: glbFile,
        jpegPreviews: [],
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleModeChange = (mode: 'images' | 'glb') => {
    if (uploadMode !== mode) {
      setGlbFile(null);
      setSelectedFiles([]);
      setJpegPreviews([]);
    }
    setUploadMode(mode);
  };

  const hasFiles = uploadMode === 'images' ? selectedFiles.length > 0 : glbFile !== null;
  const acceptedFiles = uploadMode === 'images' ? 'image/*' : '.glb';

  return (
    <>
      {/* Upload Mode Toggle */}
      {showModeToggle && (
        <div style={styles.toggleContainer}>
          <button
            type="button"
            style={{
              ...styles.toggleButton,
              ...(uploadMode === 'images' && styles.toggleButtonActive),
            }}
            onClick={() => handleModeChange('images')}
            disabled={isProcessing}
            data-testid={buildTestId('file-upload', 'mode', 'images')}
          >
            <ImageIcon size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Upload Images
          </button>
          <button
            type="button"
            style={{
              ...styles.toggleButton,
              ...(uploadMode === 'glb' && styles.toggleButtonActive),
            }}
            onClick={() => handleModeChange('glb')}
            disabled={isProcessing}
            data-testid={buildTestId('file-upload', 'mode', 'glb')}
          >
            Upload GLB Model
          </button>
        </div>
      )}

      {/* File Upload Zone - Hide when GLB is being previewed */}
      {!(uploadMode === 'glb' && glbFile) && (
        <div
          style={{
            ...styles.uploadZone,
            ...(hasFiles && { borderColor: colors.indigo[500] }),
          }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          data-testid={buildTestId('file-upload', uploadMode, 'dropzone')}
        >
          <Upload style={styles.uploadIcon} />
          <div style={styles.uploadText}>
            {uploadMode === 'images' ? 'Drop images here or click to browse' : 'Drop GLB file here or click to browse'}
          </div>
          <div style={styles.uploadSubtext}>{uploadMode === 'images' ? 'Supports JPG, PNG, WebP' : 'Supports .glb files only'}</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple={uploadMode === 'images'}
            accept={acceptedFiles}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            data-testid={buildTestId('file-upload', uploadMode, 'file-input')}
          />
        </div>
      )}

      {/* GLB Preview with Take Screenshot button */}
      {uploadMode === 'glb' && glbFile && (
        <div style={styles.previewContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={styles.previewTitle}>GLB Model Preview</div>
            <button
              type="button"
              onClick={() => {
                setGlbFile(null);
                setSelectedFiles([]);
                setJpegPreviews([]);
                // Notify parent that files were cleared
                if (onFilesReady) {
                  onFilesReady({
                    mode: 'glb',
                    files: [],
                    glbFile: null,
                    jpegPreviews: [],
                  });
                }
              }}
              disabled={isProcessing}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.slate[600],
                transition: 'all 0.2s ease',
                opacity: isProcessing ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.background = colors.slate[200];
                  e.currentTarget.style.color = colors.red[600];
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.slate[600];
              }}
              title="Clear GLB and go back to upload"
              data-testid={buildTestId('file-upload', 'glb', 'clear')}
            >
              <X size={20} />
            </button>
          </div>
          <div style={styles.previewDescription}>
            Adjust the camera angle, zoom, and field of view, then click Take Screenshot to capture this view. You can take multiple
            screenshots from different angles.
          </div>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <BulkGLBPreview
              ref={previewRef}
              initialSource={glbFile}
              initialCamera={{
                beta: cameraSettings.beta,
                radius: cameraSettings.radius,
                fov: cameraSettings.fov,
              }}
              disabled={isProcessing}
              onCameraReady={handleCameraUpdate}
            />
            {/* Take Screenshot Button */}
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={takeScreenshot}
                disabled={isProcessing}
                style={{
                  ...commonStyles.button.primary,
                  padding: '10px 24px',
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
                data-testid={buildTestId('file-upload', 'glb', 'take-screenshot')}
              >
                {isProcessing ? 'Taking Screenshot...' : '📸 Take Screenshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section for uploaded images */}
      {selectedFiles.length > 0 && (
        <div style={styles.previewContainer}>
          <div style={styles.previewTitle}>
            {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''} Uploaded
          </div>
          <div style={styles.imagePreviewGrid}>
            {selectedFiles.map((file, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} style={styles.imagePreviewItem} />
                <button
                  type="button"
                  onClick={() => handleDeleteSelectedImage(index)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: colors.red[600],
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  title="Remove image"
                  data-testid={buildTestId('file-upload', 'images', 'remove', index)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
