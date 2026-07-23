"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

export const TabsList = forwardRef<ElementRef<typeof RadixTabs.List>, ComponentPropsWithoutRef<typeof RadixTabs.List>>(
  function TabsList({ className, ...props }, ref) {
    return (
      <RadixTabs.List
        ref={ref}
        className={cn("inline-flex items-center gap-1 border-b border-border", className)}
        {...props}
      />
    );
  }
);

export const TabsTrigger = forwardRef<
  ElementRef<typeof RadixTabs.Trigger>,
  ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        "relative -mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-text-2 transition-colors",
        "hover:text-text",
        "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        "data-[state=active]:border-accent data-[state=active]:text-text",
        className
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  ElementRef<typeof RadixTabs.Content>,
  ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn(
        "pt-4 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        className
      )}
      {...props}
    />
  );
});
