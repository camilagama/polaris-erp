"use client";

import {
  Add01Icon,
  Sorting05Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
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
  CommandSeparator,
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
  allowCreate = false,
  className,
  emptyMessage = "Nenhum item encontrado.",
  name,
  onCreateNew,
  onValueChange,
  options,
  placeholder = "Selecione um item...",
  searchPlaceholder = "Procurar...",
  value,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [extraOptions, setExtraOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [internalValue, setInternalValue] = useState(value || "");
  const [search, setSearch] = useState("");

  // Combina as opções vindas do servidor com as criadas localmente, evitando duplicatas
  const allOptions = [
    ...options,
    ...extraOptions.filter(
      (extra) => !options.some((opt) => opt.value === extra.value)
    ),
  ];

  const currentValue = value === undefined ? internalValue : value;

  const handleSelect = (newValue: string) => {
    const finalValue = newValue === currentValue ? "" : newValue;
    if (onValueChange) {
      onValueChange(finalValue);
    } else {
      setInternalValue(finalValue);
    }
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = () => {
    const trimmedSearch = search.trim();
    if (!trimmedSearch) {
      return;
    }

    const newOpt = { label: trimmedSearch, value: trimmedSearch };
    setExtraOptions((prev) => [...prev, newOpt]);
    handleSelect(trimmedSearch);
    onCreateNew?.(trimmedSearch);
  };

  const filteredOptions = allOptions.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = allOptions.some(
    (opt) => opt.label.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {name && <input name={name} type="hidden" value={currentValue} />}
      <Popover
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setSearch("");
          }
        }}
        open={open}
      >
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className="w-full justify-between font-normal transition-colors hover:border-primary/50"
            role="combobox"
            variant="outline"
          >
            <span className="truncate">
              {allOptions.find((opt) => opt.value === currentValue)?.label ||
                currentValue ||
                placeholder}
            </span>
            <HugeiconsIcon
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              icon={Sorting05Icon}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-full p-0">
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              value={search}
            />
            <CommandList className="max-h-[300px]">
              {allowCreate && search.trim() && !exactMatch && (
                <>
                  <CommandGroup>
                    <CommandItem
                      className="cursor-pointer py-3 font-medium text-primary"
                      onSelect={handleCreateNew}
                    >
                      <HugeiconsIcon
                        className="mr-2 h-4 w-4 text-primary"
                        icon={Add01Icon}
                      />
                      Criar "{search}"
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              {filteredOptions.length === 0 && !exactMatch && (
                <CommandEmpty className="p-4 text-center text-muted-foreground text-xs">
                  {emptyMessage}
                </CommandEmpty>
              )}
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    className="cursor-pointer py-2"
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    value={option.value}
                  >
                    <HugeiconsIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0 transition-all",
                        currentValue === option.value
                          ? "scale-110 text-primary opacity-100"
                          : "scale-90 opacity-0"
                      )}
                      icon={Tick02Icon}
                    />
                    <span className="truncate">{option.label}</span>
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
