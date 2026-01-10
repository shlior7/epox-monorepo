import React, { useCallback, useEffect } from 'react';
import { ImageData } from '../lib/simple-types';

interface ImageUploaderProps {
  onImageUpload: (imageData: ImageData) => void;
}

export const SimpleImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onImageUpload({
          base64,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Add paste functionality
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              processFile(file);
              break;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFile]);

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="w-full max-w-lg mx-auto p-12 border-2 border-dashed border-gray-600 rounded-xl text-center hover:border-gray-500 transition-colors cursor-pointer bg-gray-800/50"
      >
        <div className="flex flex-col items-center gap-6">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-200">Upload Your Product Image</h3>
            <p className="text-gray-400 max-w-sm">Drag and drop an image here, click to select, or paste from clipboard (Ctrl/Cmd + V)</p>
            <label className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors font-medium">
              Choose File
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
