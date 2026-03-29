"use client";

import { Sorting05Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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

interface ComboboxProps {
  allowCreate?: boolean;
  className?: string;
  emptyMessage?: string;
  name?: string;
  onCreateNew?: (value: string) => void;
  onValueChange?: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  value?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione um item...",
  searchPlaceholder = "Procurar...",
  emptyMessage = "Nenhum item encontrado.",
  onCreateNew,
  allowCreate = false,
  name,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || "");
  const [search, setSearch] = useState("");

  const currentValue = value === undefined ? internalValue : value;

  const handleSelect = (newValue: string) => {
    const finalValue = newValue === currentValue ? "" : newValue;
    if (onValueChange) {
      onValueChange(finalValue);
    } else {
      setInternalValue(finalValue);
    }
    setOpen(false);
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {name && <input name={name} type="hidden" value={currentValue} />}
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className="w-full justify-between font-normal"
            role="combobox"
            variant="outline"
          >
            {options.find((opt) => opt.value === currentValue)?.label ||
              currentValue ||
              placeholder}
            <HugeiconsIcon
              className="ml-2 shrink-0 opacity-50"
              icon={Sorting05Icon}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              value={search}
            />
            <CommandList>
              <CommandEmpty className="flex flex-col gap-2 p-4">
                <span className="text-muted-foreground text-xs">
                  {emptyMessage}
                </span>
                {allowCreate && search && (
                  <Button
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      if (onCreateNew) {
                        onCreateNew(search);
                      } else {
                        handleSelect(search);
                      }
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Usar "{search}"
                  </Button>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    value={option.value}
                  >
                    <HugeiconsIcon
                      className={cn(
                        "mr-2 opacity-0",
                        currentValue === option.value ? "opacity-100" : ""
                      )}
                      icon={Tick02Icon}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
