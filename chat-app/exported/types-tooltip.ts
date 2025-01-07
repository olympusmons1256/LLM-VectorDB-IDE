// types/tooltip.ts
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import type * as TooltipPrimitive from '@radix-ui/react-tooltip'

export interface TooltipProps extends ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  content: React.ReactNode
  children: React.ReactNode
}

export type TooltipTriggerElement = ElementRef<typeof TooltipPrimitive.Trigger>
export type TooltipContentElement = ElementRef<typeof TooltipPrimitive.Content>