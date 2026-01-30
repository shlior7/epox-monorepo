'use client';

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type {
  BubbleValue,
  InspirationSection,
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
  // General inspiration bubbles - apply to all products as baseline
  generalInspiration: BubbleValue[];
  // Category/scene-type specific inspiration sections
  inspirationSections: InspirationSection[];
  // User prompt
  userPrompt: string;
  // Collection prompt (read-only in single-flow mode)
  collectionPrompt?: string;
  // Whether to apply collection inspiration in single-flow mode
  applyCollectionInspiration: boolean;
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
  initializeDefaultGeneralInspiration: () => void;
  // Section actions
  addSection: (section: InspirationSection) => void;
  removeSection: (sectionId: string) => void;
  toggleSection: (sectionId: string) => void;
  addSectionBubble: (sectionId: string, bubble: BubbleValue) => void;
  updateSectionBubble: (sectionId: string, index: number, bubble: BubbleValue) => void;
  removeSectionBubble: (sectionId: string, index: number) => void;
  // Other actions
  setUserPrompt: (prompt: string) => void;
  setApplyCollectionInspiration: (apply: boolean) => void;
  setApplyCollectionPrompt: (apply: boolean) => void;
  setOutputSettings: (settings: Partial<OutputSettingsConfig>) => void;
  setSelectedBaseImage: (imageId: string | undefined) => void;
  markClean: () => void;
  resetState: (state: ConfigPanelState) => void;
}

// ===== ACTIONS =====

type ConfigPanelAction =
  // General inspiration actions
  | { type: 'ADD_GENERAL_INSPIRATION'; bubble: BubbleValue }
  | { type: 'UPDATE_GENERAL_INSPIRATION'; index: number; bubble: BubbleValue }
  | { type: 'REMOVE_GENERAL_INSPIRATION'; index: number }
  | { type: 'INITIALIZE_DEFAULT_GENERAL_INSPIRATION' }
  // Section actions
  | { type: 'ADD_SECTION'; section: InspirationSection }
  | { type: 'REMOVE_SECTION'; sectionId: string }
  | { type: 'TOGGLE_SECTION'; sectionId: string }
  | { type: 'ADD_SECTION_BUBBLE'; sectionId: string; bubble: BubbleValue }
  | { type: 'UPDATE_SECTION_BUBBLE'; sectionId: string; index: number; bubble: BubbleValue }
  | { type: 'REMOVE_SECTION_BUBBLE'; sectionId: string; index: number }
  // Other actions
  | { type: 'SET_USER_PROMPT'; prompt: string }
  | { type: 'SET_APPLY_COLLECTION_INSPIRATION'; apply: boolean }
  | { type: 'SET_APPLY_COLLECTION_PROMPT'; apply: boolean }
  | { type: 'SET_OUTPUT_SETTINGS'; settings: Partial<OutputSettingsConfig> }
  | { type: 'SET_SELECTED_BASE_IMAGE'; imageId: string | undefined }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET_STATE'; state: ConfigPanelState };

// ===== DEFAULT STATE =====

export const DEFAULT_CONFIG_PANEL_STATE: ConfigPanelState = {
  generalInspiration: [],
  inspirationSections: [],
  userPrompt: '',
  applyCollectionInspiration: true,
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

    // ===== SECTION ACTIONS =====

    case 'ADD_SECTION': {
      const newCurrent = {
        ...state.current,
        inspirationSections: [...state.current.inspirationSections, action.section],
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'REMOVE_SECTION': {
      const newCurrent = {
        ...state.current,
        inspirationSections: state.current.inspirationSections.filter((s) => s.id !== action.sectionId),
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'TOGGLE_SECTION': {
      const newCurrent = {
        ...state.current,
        inspirationSections: state.current.inspirationSections.map((s) =>
          s.id === action.sectionId ? { ...s, enabled: !s.enabled } : s
        ),
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'ADD_SECTION_BUBBLE': {
      const newCurrent = {
        ...state.current,
        inspirationSections: state.current.inspirationSections.map((s) =>
          s.id === action.sectionId ? { ...s, bubbles: [...s.bubbles, action.bubble] } : s
        ),
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'UPDATE_SECTION_BUBBLE': {
      const newCurrent = {
        ...state.current,
        inspirationSections: state.current.inspirationSections.map((s) => {
          if (s.id !== action.sectionId) return s;
          const newBubbles = [...s.bubbles];
          newBubbles[action.index] = action.bubble;
          return { ...s, bubbles: newBubbles };
        }),
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'REMOVE_SECTION_BUBBLE': {
      const newCurrent = {
        ...state.current,
        inspirationSections: state.current.inspirationSections.map((s) =>
          s.id === action.sectionId
            ? { ...s, bubbles: s.bubbles.filter((_, i) => i !== action.index) }
            : s
        ),
      };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'SET_USER_PROMPT': {
      const newCurrent = { ...state.current, userPrompt: action.prompt };
      return { ...state, current: newCurrent, isDirty: true };
    }

    case 'SET_APPLY_COLLECTION_INSPIRATION': {
      const newCurrent = { ...state.current, applyCollectionInspiration: action.apply };
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

  const initializeDefaultGeneralInspiration = useCallback(() => {
    dispatch({ type: 'INITIALIZE_DEFAULT_GENERAL_INSPIRATION' });
  }, []);

  // Section actions
  const addSection = useCallback((section: InspirationSection) => {
    dispatch({ type: 'ADD_SECTION', section });
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    dispatch({ type: 'REMOVE_SECTION', sectionId });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    dispatch({ type: 'TOGGLE_SECTION', sectionId });
  }, []);

  const addSectionBubble = useCallback((sectionId: string, bubble: BubbleValue) => {
    dispatch({ type: 'ADD_SECTION_BUBBLE', sectionId, bubble });
  }, []);

  const updateSectionBubble = useCallback((sectionId: string, index: number, bubble: BubbleValue) => {
    dispatch({ type: 'UPDATE_SECTION_BUBBLE', sectionId, index, bubble });
  }, []);

  const removeSectionBubble = useCallback((sectionId: string, index: number) => {
    dispatch({ type: 'REMOVE_SECTION_BUBBLE', sectionId, index });
  }, []);

  const setUserPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_USER_PROMPT', prompt });
  }, []);

  const setApplyCollectionInspiration = useCallback((apply: boolean) => {
    dispatch({ type: 'SET_APPLY_COLLECTION_INSPIRATION', apply });
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
      initializeDefaultGeneralInspiration,
      addSection,
      removeSection,
      toggleSection,
      addSectionBubble,
      updateSectionBubble,
      removeSectionBubble,
      setUserPrompt,
      setApplyCollectionInspiration,
      setApplyCollectionPrompt,
      setOutputSettings,
      setSelectedBaseImage,
      markClean,
      resetState,
    }),
    [
      reducerState,
      addGeneralInspiration,
      updateGeneralInspiration,
      removeGeneralInspiration,
      initializeDefaultGeneralInspiration,
      addSection,
      removeSection,
      toggleSection,
      addSectionBubble,
      updateSectionBubble,
      removeSectionBubble,
      setUserPrompt,
      setApplyCollectionInspiration,
      setApplyCollectionPrompt,
      setOutputSettings,
      setSelectedBaseImage,
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
