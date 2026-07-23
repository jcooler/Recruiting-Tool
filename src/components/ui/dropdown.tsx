"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

/**
 * Thin styled wrapper around Radix Dropdown Menu. Composable like the
 * underlying primitive:
 *
 *   <Dropdown>
 *     <DropdownTrigger asChild><Button>Actions</Button></DropdownTrigger>
 *     <DropdownContent>
 *       <DropdownItem onSelect={...}>Edit</DropdownItem>
 *       <DropdownSeparator />
 *       <DropdownItem destructive onSelect={...}>Delete</DropdownItem>
 *     </DropdownContent>
 *   </Dropdown>
 *
 * Keyboard navigation, typeahead, and focus management are Radix defaults.
 */
export const Dropdown = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;

export const DropdownContent = forwardRef<
  ElementRef<typeof RadixDropdown.Content>,
  ComponentPropsWithoutRef<typeof RadixDropdown.Content>
>(function DropdownContent({ className, sideOffset = 6, align = "end", ...props }, ref) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-[10rem] rounded-md border border-border bg-surface p-1 shadow-lg outline-none",
          "data-[state=closed]:opacity-0 starting:opacity-0 transition-opacity duration-100",
          className
        )}
        {...props}
      />
    </RadixDropdown.Portal>
  );
});

export interface DropdownItemProps extends ComponentPropsWithoutRef<typeof RadixDropdown.Item> {
  destructive?: boolean;
}

export const DropdownItem = forwardRef<ElementRef<typeof RadixDropdown.Item>, DropdownItemProps>(
  function DropdownItem({ className, destructive, ...props }, ref) {
    return (
      <RadixDropdown.Item
        ref={ref}
        className={cn(
          "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors",
          "data-[highlighted]:bg-surface-2",
          destructive ? "text-danger" : "text-text",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

export const DropdownSeparator = forwardRef<
  ElementRef<typeof RadixDropdown.Separator>,
  ComponentPropsWithoutRef<typeof RadixDropdown.Separator>
>(function DropdownSeparator({ className, ...props }, ref) {
  return <RadixDropdown.Separator ref={ref} className={cn("my-1 h-px bg-border", className)} {...props} />;
});

export const DropdownLabel = forwardRef<
  ElementRef<typeof RadixDropdown.Label>,
  ComponentPropsWithoutRef<typeof RadixDropdown.Label>
>(function DropdownLabel({ className, ...props }, ref) {
  return (
    <RadixDropdown.Label
      ref={ref}
      className={cn("px-2.5 py-1.5 text-xs font-medium text-text-3", className)}
      {...props}
    />
  );
});
