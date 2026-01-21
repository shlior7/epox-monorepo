'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Minimal Accordion Component
 *
 * A clean, minimal accordion that supports multiple sections open simultaneously.
 * Designed for configuration panels with no colored icons or extra visual noise.
 */

interface MinimalAccordionProps {
  children: React.ReactNode;
  /** Default expanded section values */
  defaultValue?: string[];
  /** Controlled expanded values */
  value?: string[];
  /** Callback when expanded sections change */
  onValueChange?: (value: string[]) => void;
  className?: string;
}

const MinimalAccordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  MinimalAccordionProps
>(({ children, defaultValue, value, onValueChange, className }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    type="multiple"
    defaultValue={defaultValue}
    value={value}
    onValueChange={onValueChange}
    className={cn('space-y-px', className)}
  >
    {children}
  </AccordionPrimitive.Root>
));
MinimalAccordion.displayName = 'MinimalAccordion';

interface MinimalAccordionItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

const MinimalAccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  MinimalAccordionItemProps
>(({ children, value, className }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    value={value}
    className={cn('border-b border-border/50 last:border-b-0', className)}
  >
    {children}
  </AccordionPrimitive.Item>
));
MinimalAccordionItem.displayName = 'MinimalAccordionItem';

interface MinimalAccordionTriggerProps {
  children: React.ReactNode;
  /** Optional badge/suffix element rendered on the right side */
  suffix?: React.ReactNode;
  className?: string;
}

const MinimalAccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  MinimalAccordionTriggerProps
>(({ children, suffix, className }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-3 text-sm font-medium transition-all',
        'text-foreground hover:text-foreground/80',
        '[&[data-state=open]>div>.chevron-icon]:rotate-180',
        className
      )}
    >
      <span className="text-left">{children}</span>
      <div className="flex items-center gap-2">
        {suffix}
        <ChevronDown className="chevron-icon h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
MinimalAccordionTrigger.displayName = 'MinimalAccordionTrigger';

interface MinimalAccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

const MinimalAccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  MinimalAccordionContentProps
>(({ children, className }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
  >
    <div className={cn('pb-4 pt-1', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
MinimalAccordionContent.displayName = 'MinimalAccordionContent';

export { MinimalAccordion, MinimalAccordionItem, MinimalAccordionTrigger, MinimalAccordionContent };
