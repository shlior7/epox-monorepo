export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface OutputSettings {
  aspectRatio: string;
  variants: number;
}

export interface ExpertSettings {
  focalLength: string;
  aperture: string;
}

export interface VisualizerState {
  productImage: ImageData | null;
  scene: string;
  style: string;
  lighting: string;
  cameraAngle: string;
  surroundings: string;
  outputSettings: OutputSettings;
  expertMode: boolean;
  expertSettings: ExpertSettings;
  customScene: string;
  customStyle: string;
  customLighting: string;
  customCameraAngle: string;
  customSurroundings: string;
}

export interface GenerateVisualConfig extends Omit<
  VisualizerState,
  'expertMode' | 'customScene' | 'customStyle' | 'customLighting' | 'customCameraAngle' | 'customSurroundings'
> {
  productImage: ImageData;
}
