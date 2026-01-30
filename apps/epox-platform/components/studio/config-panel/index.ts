/**
 * Unified Config Panel exports
 */

export {
  UnifiedStudioConfigPanel,
  type ConfigPanelMode,
  type SceneTypeInfo,
  type UnifiedStudioConfigPanelProps,
} from './UnifiedStudioConfigPanel';

export {
  ConfigPanelProvider,
  useConfigPanelContext,
  useConfigPanelContextOptional,
  DEFAULT_CONFIG_PANEL_STATE,
  type ConfigPanelState,
  type ConfigPanelContextValue,
  type ConfigPanelProviderProps,
  type OutputSettingsConfig,
} from './ConfigPanelContext';

export { InspireSection, type InspireSectionProps, type CategoryInfo } from './InspireSection';
export { ProductSection, type ProductSectionProps, type ProductCategoryInfo } from './ProductSection';
export { CollectionSettingsSection, type CollectionSettingsSectionProps } from './CollectionSettingsSection';
export { AddSectionDropdown, type AddSectionDropdownProps } from './AddSectionDropdown';
export { GeneralBubblesSection, type GeneralBubblesSectionProps } from './GeneralBubblesSection';
export { InspirationBubblesGrid, type InspirationBubblesGridProps } from './InspirationBubblesGrid';
export { CategoryBubble, type CategoryBubbleProps } from './CategoryBubble';
export { CategoryBubbleModal, type CategoryBubbleModalProps } from './CategoryBubbleModal';
export { CategoryBubblesSection, type CategoryBubblesSectionProps } from './CategoryBubblesSection';
export { BubbleChip, type BubbleChipProps } from './InspirationBubble';
export { AddBubbleButton, type AddBubbleButtonProps } from './AddBubbleButton';
export { ProductCountBadge, type ProductCountBadgeProps } from './ProductCountBadge';
export { PromptSection, type PromptSectionProps } from './PromptSection';
export { OutputSettingsPanel, type OutputSettingsPanelProps } from './OutputSettings';
export { ActionFooter, type ActionFooterProps } from './ActionFooter';
export { CollectionPromptDisplay, type CollectionPromptDisplayProps } from './CollectionPromptDisplay';
export { BaseImageBubble, BaseImageSelector, type BaseImageInfo, type BaseImageBubbleProps, type BaseImageSelectorProps } from './BaseImageBubble';
export { ScrollSyncProvider, useScrollSyncContext, useScrollSyncContextOptional, type ScrollSyncContextValue, type ScrollSyncProviderProps } from './ScrollSyncContext';

// Bubble System
export * from './bubbles';
