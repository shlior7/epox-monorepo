/**
 * Generic Accordion Component
 *
 * A reusable accordion component built on top of Radix UI's Accordion primitive.
 * Handles state management internally and provides a clean API for collapsible sections.
 */

'use client';

import React from 'react';
import * as RadixAccordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

import styles from './Accordion.module.scss';

export interface AccordionSectionProps {
  /** Unique identifier for the section */
  value: string;
  /** Title displayed in the header */
  title: React.ReactNode;
  /** Optional element rendered alongside the header title */
  headerSuffix?: React.ReactNode;
  /** Content to display when expanded */
  children: React.ReactNode;
  /** Whether this section is expanded by default */
  defaultExpanded?: boolean;
  /** Custom styles for the section container */
  containerStyle?: React.CSSProperties;
  /** Custom styles for the header */
  headerStyle?: React.CSSProperties;
  /** Custom styles for the content */
  contentStyle?: React.CSSProperties;
}

interface AccordionProps {
  /** Array of sections to render */
  sections: AccordionSectionProps[];
  /** Type of accordion - 'single' allows one item open, 'multiple' allows multiple */
  type?: 'single' | 'multiple';
  /** Whether items can be collapsed (for single type) */
  collapsible?: boolean;
  /** Values of sections that should be expanded by default */
  defaultValue?: string | string[];
  /** Whether to use mobile-friendly styling */
  isMobile?: boolean;
  /** Visual variant - 'default' has borders/padding, 'minimal' has no borders/padding with dividers */
  variant?: 'default' | 'minimal';
}

export function Accordion({
  sections,
  type = 'single',
  collapsible = true,
  defaultValue,
  isMobile = false,
  variant = 'default',
}: AccordionProps) {
  // Auto-generate defaultValue from sections with defaultExpanded if not provided
  const computedDefaultValue =
    defaultValue ||
    (type === 'single' ? sections.find((s) => s.defaultExpanded)?.value : sections.filter((s) => s.defaultExpanded).map((s) => s.value));

  const rootProps =
    type === 'single'
      ? { type: 'single' as const, collapsible, defaultValue: computedDefaultValue as string | undefined }
      : { type: 'multiple' as const, defaultValue: computedDefaultValue as string[] | undefined };

  const isMinimal = variant === 'minimal';
  const rootClassName = clsx(styles.accordion, isMobile && styles.accordionMobile, isMinimal && styles.accordionMinimal);
  const titleClassName = clsx(styles.title, isMobile && styles.titleMobile, isMinimal && styles.titleMinimal);
  const itemClassName = clsx(styles.item, isMinimal && styles.itemMinimal);

  return (
    <>
      {sections.map((section, index) => {
        const hoverEnabled = !section.headerStyle?.backgroundColor;
        const isLast = index === sections.length - 1;

        return (
          <RadixAccordion.Root key={section.value} {...rootProps} className={rootClassName} style={section.containerStyle}>
            <RadixAccordion.Item value={section.value} className={clsx(itemClassName, isMinimal && !isLast && styles.itemWithDivider)}>
              <RadixAccordion.Header className={styles.header}>
                <RadixAccordion.Trigger className={styles.trigger} style={section.headerStyle}>
                  <ChevronDown className={styles.chevron} aria-hidden="true" focusable="false" />
                  {typeof section.title === 'string' ? <h2 className={titleClassName}>{section.title}</h2> : section.title}
                </RadixAccordion.Trigger>
                {section.headerSuffix ? (
                  <div
                    className={styles.headerSuffix}
                    onClick={(event) => {
                      // Prevent suffix interactions from toggling the accordion
                      event.stopPropagation();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.stopPropagation();
                      }
                    }}
                  >
                    {section.headerSuffix}
                  </div>
                ) : null}
              </RadixAccordion.Header>

              <RadixAccordion.Content className={styles.content} style={section.contentStyle}>
                {section.children}
              </RadixAccordion.Content>
            </RadixAccordion.Item>
          </RadixAccordion.Root>
        );
      })}
    </>
  );
}
