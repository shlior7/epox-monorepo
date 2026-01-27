'use client';

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type {
  BubbleValue,
  SceneTypeInspirationMap,
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
  // General inspiration bubbles - apply to all scene types
  generalInspiration: BubbleValue[];
  // Inspiration bubbles per scene type
  sceneTypeInspiration: SceneTypeInspirationMap;
  // Whether to use scene-type-specific inspiration
  useSceneTypeInspiration: boolean;
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
}

export interface ConfigPanelContextValue {
  state: ConfigPanelState;
  isDirty: boolean;
  dispatch: React.Dispatch<ConfigPanelAction>;
  // General inspiration actions
  addGeneralInspiration: (bubble: BubbleValue) => void;
  updateGeneralInspiration: (index: number, bubble: BubbleValue) => void;
  removeGeneralInspiration: (index: number) => void;
  moveGeneralInspirationToScene: (bubbleIndex: number, targetSceneType: string) => void;
  initializeDefaultGeneralInspiration: () => void;
  // Scene-specific inspiration actions
  addBubble: (sceneType: string, bubble: BubbleValue) => void;
  updateBubble: (sceneType: string, index: number, bubble: BubbleValue) => void;
  removeBubble: (sceneType: string, index: number) => void;
  moveSceneBubbleToGeneral: (sceneType: string, bubbleIndex: number) => void;
  moveSceneBubbleToScene: (fromSceneType: string, toSceneType: string, bubbleIndex: number) => void;
  initializeDefaultBubbles: (sceneType: string) => void;
  migrateBubbles: (fromSceneType: string, toSceneType: string) => void;
  // Other actions
  setUserPrompt: (prompt: string) => void;
  setApplyCollectionPrompt: (apply: boolean) => void;
  setOutputSettings: (settings: Partial<OutputSettingsConfig>) => void;
  setSelectedBaseImage: (imageId: string | undefined) => void;
  setUseSceneTypeInspiration: (use: boolean) => void;
  markClean: () => void;
  resetState: (state: ConfigPanelState) => void;
}

// ===== ACTIONS =====

type ConfigPanelAction =
  // General inspiration actions
  | { type: 'ADD_GENERAL_INSPIRATION'; bubble: BubbleValue }
  | { type: 'UPDATE_GENERAL_INSPIRATION'; index: number; bubble: BubbleValue }
  | { type: 'REMOVE_GENERAL_INSPIRATION'; index: number }
  | { type: 'MOVE_GENERAL_INSPIRATION_TO_SCENE'; bubbleIndex: number; targetSceneType: string }
  | { type: 'INITIALIZE_DEFAULT_GENERAL_INSPIRATION' }
  // Scene-specific bubbles actions
  | { type: 'ADD_BUBBLE'; sceneType: string; bubble: BubbleValue }
  | { type: 'UPDATE_BUBBLE'; sceneType: string; index: number; bubble: BubbleValue }
  | { type: 'REMOVE_BUBBLE'; sceneType: string; index: number }
  | { type: 'MOVE_SCENE_BUBBLE_TO_GENERAL'; sceneType: string; bubbleIndex: number }
  | { type: 'MOVE_SCENE_BUBBLE_TO_SCENE'; fromSceneType: string; toSceneType: string; bubbleIndex: number }
  | { type: 'INITIALIZE_DEFAULT_BUBBLES'; sceneType: string }
  | { type: 'MIGRATE_BUBBLES'; fromSceneType: string; toSceneType: string }
  // Other actions
  | { type: 'SET_USER_PROMPT'; prompt: string }
  | { type: 'SET_APPLY_COLLECTION_PROMPT'; apply: boolean }
  | { type: 'SET_OUTPUT_SETTINGS'; settings: Partial<OutputSettingsConfig> }
  | { type: 'SET_SELECTED_BASE_IMAGE'; imageId: string | undefined }
  | { type: 'SET_USE_SCENE_TYPE_INSPIRATION'; use: boolean }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET_STATE'; state: ConfigPanelState };

// ===== DEFAULT STATE =====

export const DEFAULT_CONFIG_PANEL_STATE: ConfigPanelState = {
  generalInspiration: [],
  sceneTypeInspiration: {},
  useSceneTypeInspiration: true,
  userPrompt: '',
  applyCollectionPrompt: true,
  outputSettings: {
    aspectRatio: '1:1',
    quality: '2k',
    variantsCount: 1,
  },
};

// ===== REDUCER =====

interface ReducerState {
  current: ConfigPanelState;
  original: ConfigPanelState;
  isDirty: boolean;
}

function reducer(state: ReducerState, action: ConfigPanelAction): ReducerState {
  switch (action.type) {
    // ===== GENERAL INSPIRATION ACTIONS =====

    case 'ADD_GENERAL_INSPIRATION': {
      const newCurrent = {
        ...state.current,
        generalInspiration: [...state.current.generalInspiration, action.bubble],
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'UPDATE_GENERAL_INSPIRATION': {
      const newBubbles = [...state.current.generalInspiration];
      newBubbles[action.index] = action.bubble;
      const newCurrent = {
        ...state.current,
        generalInspiration: newBubbles,
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'REMOVE_GENERAL_INSPIRATION': {
      const newBubbles = state.current.generalInspiration.filter((_, i) => i !== action.index);
      const newCurrent = {
        ...state.current,
        generalInspiration: newBubbles,
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'MOVE_GENERAL_INSPIRATION_TO_SCENE': {
      const bubble = state.current.generalInspiration[action.bubbleIndex];
      if (!bubble) return state;

      const currentSceneBubbles = state.current.sceneTypeInspiration[action.targetSceneType]?.bubbles || [];
      const newCurrent = {
        ...state.current,
        generalInspiration: state.current.generalInspiration.filter((_, i) => i !== action.bubbleIndex),
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.targetSceneType]: {
            bubbles: [...currentSceneBubbles, bubble],
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    // ===== SCENE-SPECIFIC BUBBLES ACTIONS =====

    case 'MOVE_SCENE_BUBBLE_TO_GENERAL': {
      const bubble = state.current.sceneTypeInspiration[action.sceneType]?.bubbles[action.bubbleIndex];
      if (!bubble) return state;

      const currentSceneBubbles = state.current.sceneTypeInspiration[action.sceneType]?.bubbles || [];
      const newCurrent = {
        ...state.current,
        generalInspiration: [...state.current.generalInspiration, bubble],
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.sceneType]: {
            bubbles: currentSceneBubbles.filter((_, i) => i !== action.bubbleIndex),
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'MOVE_SCENE_BUBBLE_TO_SCENE': {
      const bubble = state.current.sceneTypeInspiration[action.fromSceneType]?.bubbles[action.bubbleIndex];
      if (!bubble) return state;

      const fromBubbles = state.current.sceneTypeInspiration[action.fromSceneType]?.bubbles || [];
      const toBubbles = state.current.sceneTypeInspiration[action.toSceneType]?.bubbles || [];
      const newCurrent = {
        ...state.current,
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.fromSceneType]: {
            bubbles: fromBubbles.filter((_, i) => i !== action.bubbleIndex),
          },
          [action.toSceneType]: {
            bubbles: [...toBubbles, bubble],
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'ADD_BUBBLE': {
      const currentBubbles = state.current.sceneTypeInspiration[action.sceneType]?.bubbles || [];
      const newCurrent = {
        ...state.current,
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.sceneType]: {
            bubbles: [...currentBubbles, action.bubble],
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'UPDATE_BUBBLE': {
      const currentBubbles = state.current.sceneTypeInspiration[action.sceneType]?.bubbles || [];
      const newBubbles = [...currentBubbles];
      newBubbles[action.index] = action.bubble;
      const newCurrent = {
        ...state.current,
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.sceneType]: {
            bubbles: newBubbles,
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'REMOVE_BUBBLE': {
      const currentBubbles = state.current.sceneTypeInspiration[action.sceneType]?.bubbles || [];
      const newBubbles = currentBubbles.filter((_, i) => i !== action.index);
      const newCurrent = {
        ...state.current,
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.sceneType]: {
            bubbles: newBubbles,
          },
        },
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'INITIALIZE_DEFAULT_GENERAL_INSPIRATION': {
      // Only initialize if general inspiration is empty
      if (state.current.generalInspiration.length > 0) {
        return state;
      }

      const defaultGeneralBubbles: BubbleValue[] = [
        { type: 'style' },
        { type: 'reference' },
        { type: 'lighting' },
      ];

      const newCurrent = {
        ...state.current,
        generalInspiration: defaultGeneralBubbles,
      };
      // Don't mark as dirty for default initialization
      return { ...state, current: newCurrent };
    }

    case 'INITIALIZE_DEFAULT_BUBBLES': {
      // Only initialize if scene type doesn't have bubbles yet
      if (state.current.sceneTypeInspiration[action.sceneType]?.bubbles?.length > 0) {
        return state;
      }

      const defaultBubbles: BubbleValue[] = [
        { type: 'custom', label: action.sceneType, value: action.sceneType },
        { type: 'style' },
        { type: 'reference' },
        { type: 'lighting' },
      ];

      const newCurrent = {
        ...state.current,
        sceneTypeInspiration: {
          ...state.current.sceneTypeInspiration,
          [action.sceneType]: {
            bubbles: defaultBubbles,
          },
        },
      };
      // Don't mark as dirty for default initialization
      return { ...state, current: newCurrent };
    }

    case 'MIGRATE_BUBBLES': {
      const fromBubbles = state.current.sceneTypeInspiration[action.fromSceneType]?.bubbles || [];

      if (fromBubbles.length === 0) {
        return state;
      }

      const newSceneTypeInspiration = { ...state.current.sceneTypeInspiration };

      newSceneTypeInspiration[action.toSceneType] = {
        bubbles: [...fromBubbles],
      };

      if (action.fromSceneType !== '') {
        delete newSceneTypeInspiration[action.fromSceneType];
      }

      const newCurrent = {
        ...state.current,
        sceneTypeInspiration: newSceneTypeInspiration,
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

    case 'SET_USE_SCENE_TYPE_INSPIRATION': {
      const newCurrent = { ...state.current, useSceneTypeInspiration: action.use };
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

  // General inspiration actions
  const addGeneralInspiration = useCallback((bubble: BubbleValue) => {
    dispatch({ type: 'ADD_GENERAL_INSPIRATION', bubble });
  }, []);

  const updateGeneralInspiration = useCallback((index: number, bubble: BubbleValue) => {
    dispatch({ type: 'UPDATE_GENERAL_INSPIRATION', index, bubble });
  }, []);

  const removeGeneralInspiration = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_GENERAL_INSPIRATION', index });
  }, []);

  const moveGeneralInspirationToScene = useCallback((bubbleIndex: number, targetSceneType: string) => {
    dispatch({ type: 'MOVE_GENERAL_INSPIRATION_TO_SCENE', bubbleIndex, targetSceneType });
  }, []);

  // Scene-specific bubbles actions
  const addBubble = useCallback((sceneType: string, bubble: BubbleValue) => {
    dispatch({ type: 'ADD_BUBBLE', sceneType, bubble });
  }, []);

  const updateBubble = useCallback((sceneType: string, index: number, bubble: BubbleValue) => {
    dispatch({ type: 'UPDATE_BUBBLE', sceneType, index, bubble });
  }, []);

  const removeBubble = useCallback((sceneType: string, index: number) => {
    dispatch({ type: 'REMOVE_BUBBLE', sceneType, index });
  }, []);

  const moveSceneBubbleToGeneral = useCallback((sceneType: string, bubbleIndex: number) => {
    dispatch({ type: 'MOVE_SCENE_BUBBLE_TO_GENERAL', sceneType, bubbleIndex });
  }, []);

  const moveSceneBubbleToScene = useCallback((fromSceneType: string, toSceneType: string, bubbleIndex: number) => {
    dispatch({ type: 'MOVE_SCENE_BUBBLE_TO_SCENE', fromSceneType, toSceneType, bubbleIndex });
  }, []);

  const initializeDefaultGeneralInspiration = useCallback(() => {
    dispatch({ type: 'INITIALIZE_DEFAULT_GENERAL_INSPIRATION' });
  }, []);

  const initializeDefaultBubbles = useCallback((sceneType: string) => {
    dispatch({ type: 'INITIALIZE_DEFAULT_BUBBLES', sceneType });
  }, []);

  const migrateBubbles = useCallback((fromSceneType: string, toSceneType: string) => {
    dispatch({ type: 'MIGRATE_BUBBLES', fromSceneType, toSceneType });
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

  const setUseSceneTypeInspiration = useCallback((use: boolean) => {
    dispatch({ type: 'SET_USE_SCENE_TYPE_INSPIRATION', use });
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
      addGeneralInspiration,
      updateGeneralInspiration,
      removeGeneralInspiration,
      moveGeneralInspirationToScene,
      initializeDefaultGeneralInspiration,
      addBubble,
      updateBubble,
      removeBubble,
      moveSceneBubbleToGeneral,
      moveSceneBubbleToScene,
      initializeDefaultBubbles,
      migrateBubbles,
      setUserPrompt,
      setApplyCollectionPrompt,
      setOutputSettings,
      setSelectedBaseImage,
      setUseSceneTypeInspiration,
      markClean,
      resetState,
    }),
    [
      reducerState,
      addGeneralInspiration,
      updateGeneralInspiration,
      removeGeneralInspiration,
      moveGeneralInspirationToScene,
      initializeDefaultGeneralInspiration,
      addBubble,
      updateBubble,
      removeBubble,
      moveSceneBubbleToGeneral,
      moveSceneBubbleToScene,
      initializeDefaultBubbles,
      migrateBubbles,
      setUserPrompt,
      setApplyCollectionPrompt,
      setOutputSettings,
      setSelectedBaseImage,
      setUseSceneTypeInspiration,
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
