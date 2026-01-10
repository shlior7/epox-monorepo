// Client-side utilities for handling API communication

export interface ApiProductAsset {
  url: string;
  type: 'image' | 'model';
  preview?: string;
}

export interface ApiVisualizationRequest {
  productName: string;
  productAsset?: ApiProductAsset;
  location: string;
  style: string;
  lighting: string;
  camera: string;
  cameraNotes: string;
  props: string;
  moodNotes: string;
  aspectRatio: string;
  resolution: string;
  variants: number;
  magnify: boolean;
  customPrompt?: string;
}

export async function uploadFile(file: File): Promise<ApiProductAsset> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  const uploadResult = await response.json();

  return {
    url: uploadResult.url,
    type: file.type.startsWith('image/') ? 'image' : 'model',
    preview: uploadResult.url, // For images, the URL can serve as preview
  };
}

export async function generateVisualization(request: ApiVisualizationRequest) {
  const response = await fetch('/api/visualization', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
