"use client";

import { InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { calculateSuggestedPrices } from "@/features/catalog/pricing";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ProductPricingSettings {
  idealMarkupPercent: number;
  minimumMarkupPercent: number;
}

interface ProductPricingStateInput {
  costPrice: number | string;
  currentPrice: number | string;
  settings: ProductPricingSettings;
}

export function getProductPricingState({
  costPrice,
  currentPrice,
  settings,
}: ProductPricingStateInput) {
  const numericCurrentPrice = Number(currentPrice);
  const suggestion = calculateSuggestedPrices({
    costPrice: Number(costPrice),
    currentPrice: numericCurrentPrice,
    idealMarkupPercent: settings.idealMarkupPercent,
    minimumMarkupPercent: settings.minimumMarkupPercent,
  });

  const currentMarkupPercent =
    suggestion.costPrice > 0 && numericCurrentPrice > 0
      ? (numericCurrentPrice / suggestion.costPrice - 1) * 100
      : 0;

  return {
    currentMarkupPercent,
    currentPrice: numericCurrentPrice,
    suggestion,
  };
}

export function ProductPriceSuggestionGuide({
  costPrice,
  currentPrice,
  onPriceSelect,
  settings,
}: ProductPricingStateInput & {
  onPriceSelect: (value: number) => void;
}) {
  const { suggestion } = getProductPricingState({
    costPrice,
    currentPrice,
    settings,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
        Guia de preco sugerido
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => onPriceSelect(suggestion.minimumPrice)}
          type="button"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase leading-none tracking-wider">
              Minimo
            </span>
            <span className="text-[9px] text-muted-foreground/50 tabular-nums">
              {suggestion.minimumMarkupPercent}%
            </span>
          </div>
          <span className="font-medium text-[13px] tabular-nums">
            {formatCurrency(suggestion.minimumPrice)}
          </span>
        </button>
        <button
          className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => onPriceSelect(suggestion.idealPrice)}
          type="button"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase leading-none tracking-wider">
              Ideal
            </span>
            <span className="text-[9px] text-muted-foreground/50 tabular-nums">
              {suggestion.idealMarkupPercent}%
            </span>
          </div>
          <span className="font-medium text-[13px] tabular-nums">
            {formatCurrency(suggestion.idealPrice)}
          </span>
        </button>
      </div>

      {suggestion.isBelowMinimum ? (
        <p className="text-[11px] text-destructive">
          Preco abaixo do minimo sugerido. O salvamento continua permitido.
        </p>
      ) : null}
    </div>
  );
}

export function ProductPriceMarkupIndicator({
  costPrice,
  minimumMarkupPercent,
  price,
}: {
  costPrice: number | string;
  minimumMarkupPercent: number;
  price: number | string;
}) {
  const { currentMarkupPercent, suggestion } = getProductPricingState({
    costPrice,
    currentPrice: price,
    settings: {
      idealMarkupPercent: minimumMarkupPercent,
      minimumMarkupPercent,
    },
  });

  return (
    <InputGroupAddon align="inline-end">
      <InputGroupText
        className={cn(
          "font-medium text-[10px] opacity-70",
          Number(price) > 0 &&
            (suggestion.isBelowMinimum
              ? "text-destructive"
              : "text-emerald-500")
        )}
      >
        {currentMarkupPercent.toFixed(1)}%
      </InputGroupText>
    </InputGroupAddon>
  );
}
