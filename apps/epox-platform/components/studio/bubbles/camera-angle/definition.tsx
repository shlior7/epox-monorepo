/**
 * Camera Angle Bubble Definition
 * Registry definition for the camera angle bubble type
 */

import { Camera } from 'lucide-react';
import type { CameraAngleBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { CameraAngleModal } from './CameraAngleModal';

export const cameraAngleBubble: BubbleDefinition<CameraAngleBubbleValue> = {
  type: 'camera-angle',
  label: 'Camera Angle',
  icon: Camera,
  category: 'technical',
  allowMultiple: false,

  Modal: CameraAngleModal,

  renderPreview: (value) => (
    <div className="flex flex-col items-center px-1">
      <Camera className="h-4 w-4 text-foreground" />
      <span className="mt-0.5 text-center text-[9px] font-medium leading-tight text-foreground">
        {value.preset || 'Camera'}
      </span>
    </div>
  ),

  extractPromptContext: (value) => {
    if (value.preset) {
      return [`shot from ${value.preset.toLowerCase()}`];
    }
    return [];
  },

  isEmpty: (value) => !value.preset,

  getDefaultValue: () => ({ type: 'camera-angle' }),
};
