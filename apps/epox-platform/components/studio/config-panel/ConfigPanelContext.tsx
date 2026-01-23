'use client';

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type {
  InspirationImage,
  InspirationBubbleValue,
  SceneTypeBubbleMap,
  ImageAspectRatio,
  ImageQuality,
} from 'visualizer-types';

// ===== STATE TYPES =====

export interface OutputSettingsConfig {
  aspectRatio: ImageAspectRatio;
  quality: ImageQuality;
  variantsCount: number;
}

export interface ConfigPanelState {
  // Inspiration bubbles per scene type
  sceneTypeBubbles: SceneTypeBubbleMap;
  // User prompt
  userPrompt: string;
  // Collection prompt (read-only in single-flow mode)
  collectionPrompt?: string;
  // Whether to apply collection prompt in single-flow mode
  applyCollectionPrompt: boolean;
  // Output settings
  outputSettings: OutputSettingsConfig;
  // Selected base image (single-flow mode)
  selectedBaseImageId?: string;
  // Legacy: raw inspiration images (for backwards compatibility)
  inspirationImages: InspirationImage[];
}

export interface ConfigPanelContextValue {
  state: ConfigPanelState;
  isDirty: boolean;
  dispatch: React.Dispatch<ConfigPanelAction>;
  // Convenience actions
  addBubble: (sceneType: string, bubble: InspirationBubbleValue) => void;
  updateBubble: (sceneType: string, index: number, bubble: InspirationBubbleValue) => void;
  removeBubble: (sceneType: string, index: number) => void;
  setUserPrompt: (prompt: string) => void;
  setApplyCollectionPrompt: (apply: boolean) => void;
  setOutputSettings: (settings: Partial<OutputSettingsConfig>) => void;
  setSelectedBaseImage: (imageId: string | undefined) => void;
  addInspirationImage: (image: InspirationImage) => void;
  removeInspirationImage: (index: number) => void;
  markClean: () => void;
  resetState: (state: ConfigPanelState) => void;
}

// ===== ACTIONS =====

type ConfigPanelAction =
  | { type: 'ADD_BUBBLE'; sceneType: string; bubble: InspirationBubbleValue }
  | { type: 'UPDATE_BUBBLE'; sceneType: string; index: number; bubble: InspirationBubbleValue }
  | { type: 'REMOVE_BUBBLE'; sceneType: string; index: number }
  | { type: 'SET_USER_PROMPT'; prompt: string }
  | { type: 'SET_APPLY_COLLECTION_PROMPT'; apply: boolean }
  | { type: 'SET_OUTPUT_SETTINGS'; settings: Partial<OutputSettingsConfig> }
  | { type: 'SET_SELECTED_BASE_IMAGE'; imageId: string | undefined }
  | { type: 'ADD_INSPIRATION_IMAGE'; image: InspirationImage }
  | { type: 'REMOVE_INSPIRATION_IMAGE'; index: number }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET_STATE'; state: ConfigPanelState };

// ===== DEFAULT STATE =====

export const DEFAULT_CONFIG_PANEL_STATE: ConfigPanelState = {
  sceneTypeBubbles: {},
  userPrompt: '',
  applyCollectionPrompt: true,
  outputSettings: {
    aspectRatio: '1:1',
    quality: '2k',
    variantsCount: 1,
  },
  inspirationImages: [],
};

// ===== REDUCER =====

interface ReducerState {
  current: ConfigPanelState;
  original: ConfigPanelState;
  isDirty: boolean;
}

function reducer(state: ReducerState, action: ConfigPanelAction): ReducerState {
  switch (action.type) {
    case 'ADD_BUBBLE': {
      const currentBubbles = state.current.sceneTypeBubbles[action.sceneType]?.bubbles || [];
      const newCurrent = {
        ...state.current,
        sceneTypeBubbles: {
          ...state.current.sceneTypeBubbles,
          [action.sceneType]: {
            bubbles: [...currentBubbles, action.bubble],
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'UPDATE_BUBBLE': {
      const currentBubbles = state.current.sceneTypeBubbles[action.sceneType]?.bubbles || [];
      const newBubbles = [...currentBubbles];
      newBubbles[action.index] = action.bubble;
      const newCurrent = {
        ...state.current,
        sceneTypeBubbles: {
          ...state.current.sceneTypeBubbles,
          [action.sceneType]: {
            bubbles: newBubbles,
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'REMOVE_BUBBLE': {
      const currentBubbles = state.current.sceneTypeBubbles[action.sceneType]?.bubbles || [];
      const newBubbles = currentBubbles.filter((_, i) => i !== action.index);
      const newCurrent = {
        ...state.current,
        sceneTypeBubbles: {
          ...state.current.sceneTypeBubbles,
          [action.sceneType]: {
            bubbles: newBubbles,
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'SET_USER_PROMPT': {
      const newCurrent = { ...state.current, userPrompt: action.prompt };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'SET_APPLY_COLLECTION_PROMPT': {
      const newCurrent = { ...state.current, applyCollectionPrompt: action.apply };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'SET_OUTPUT_SETTINGS': {
      const newCurrent = {
        ...state.current,
        outputSettings: { ...state.current.outputSettings, ...action.settings },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'SET_SELECTED_BASE_IMAGE': {
      const newCurrent = { ...state.current, selectedBaseImageId: action.imageId };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'ADD_INSPIRATION_IMAGE': {
      const newCurrent = {
        ...state.current,
        inspirationImages: [...state.current.inspirationImages, action.image],
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'REMOVE_INSPIRATION_IMAGE': {
      const newCurrent = {
        ...state.current,
        inspirationImages: state.current.inspirationImages.filter((_, i) => i !== action.index),
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'MARK_CLEAN': {
      return { ...state, original: state.current, isDirty: false };
    }

    case 'RESET_STATE': {
      return { current: action.state, original: action.state, isDirty: false };
    }

    default:
      return state;
  }
}

// ===== CONTEXT =====

const ConfigPanelContext = createContext<ConfigPanelContextValue | null>(null);

// ===== PROVIDER =====

export interface ConfigPanelProviderProps {
  children: ReactNode;
  initialState?: ConfigPanelState;
}

export function ConfigPanelProvider({ children, initialState }: ConfigPanelProviderProps) {
  const initial = initialState ?? DEFAULT_CONFIG_PANEL_STATE;
  const [reducerState, dispatch] = useReducer(reducer, {
    current: initial,
    original: initial,
    isDirty: false,
  });

  const addBubble = useCallback((sceneType: string, bubble: InspirationBubbleValue) => {
    dispatch({ type: 'ADD_BUBBLE', sceneType, bubble });
  }, []);

  const updateBubble = useCallback((sceneType: string, index: number, bubble: InspirationBubbleValue) => {
    dispatch({ type: 'UPDATE_BUBBLE', sceneType, index, bubble });
  }, []);

  const removeBubble = useCallback((sceneType: string, index: number) => {
    dispatch({ type: 'REMOVE_BUBBLE', sceneType, index });
  }, []);

  const setUserPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_USER_PROMPT', prompt });
  }, []);

  const setApplyCollectionPrompt = useCallback((apply: boolean) => {
    dispatch({ type: 'SET_APPLY_COLLECTION_PROMPT', apply });
  }, []);

  const setOutputSettings = useCallback((settings: Partial<OutputSettingsConfig>) => {
    dispatch({ type: 'SET_OUTPUT_SETTINGS', settings });
  }, []);

  const setSelectedBaseImage = useCallback((imageId: string | undefined) => {
    dispatch({ type: 'SET_SELECTED_BASE_IMAGE', imageId });
  }, []);

  const addInspirationImage = useCallback((image: InspirationImage) => {
    dispatch({ type: 'ADD_INSPIRATION_IMAGE', image });
  }, []);

  const removeInspirationImage = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_INSPIRATION_IMAGE', index });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' });
  }, []);

  const resetState = useCallback((state: ConfigPanelState) => {
    dispatch({ type: 'RESET_STATE', state });
  }, []);

  const value = useMemo<ConfigPanelContextValue>(
    () => ({
      state: reducerState.current,
      isDirty: reducerState.isDirty,
      dispatch,
      addBubble,
      updateBubble,
      removeBubble,
      setUserPrompt,
      setApplyCollectionPrompt,
      setOutputSettings,
      setSelectedBaseImage,
      addInspirationImage,
      removeInspirationImage,
      markClean,
      resetState,
    }),
    [
      reducerState,
      addBubble,
      updateBubble,
      removeBubble,
      setUserPrompt,
      setApplyCollectionPrompt,
      setOutputSettings,
      setSelectedBaseImage,
      addInspirationImage,
      removeInspirationImage,
      markClean,
      resetState,
    ]
  );

  return <ConfigPanelContext.Provider value={value}>{children}</ConfigPanelContext.Provider>;
}

// ===== HOOK =====

export function useConfigPanelContext(): ConfigPanelContextValue {
  const context = useContext(ConfigPanelContext);
  if (!context) {
    throw new Error('useConfigPanelContext must be used within a ConfigPanelProvider');
  }
  return context;
}

export function useConfigPanelContextOptional(): ConfigPanelContextValue | null {
  return useContext(ConfigPanelContext);
}
