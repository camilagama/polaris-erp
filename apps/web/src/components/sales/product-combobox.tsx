"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ProductComboboxOption {
  id: string;
  name: string;
  stock: number;
}

export function ProductCombobox({
  label,
  onSelect,
  options,
  value,
}: {
  label: string;
  onSelect: (productId: string) => void;
  options: ProductComboboxOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedProduct = options.find((option) => option.id === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          aria-label={label}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-left text-xs shadow-xs transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedProduct && "text-muted-foreground"
          )}
          role="combobox"
          type="button"
        >
          <span className="truncate">
            {selectedProduct
              ? `${selectedProduct.name} (${selectedProduct.stock} un.)`
              : "Buscar produto..."}
          </span>
          <HugeiconsIcon
            className="ml-2 size-3.5 shrink-0 opacity-50"
            icon={ArrowDown01Icon}
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command>
          <CommandInput aria-label={label} placeholder="Buscar produto..." />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  data-checked={option.id === value}
                  key={option.id}
                  keywords={[option.name]}
                  onSelect={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                  value={option.id}
                >
                  <span className="truncate">{option.name}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {option.stock} un.
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
