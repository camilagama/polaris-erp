"use client";

import type { Dispatch, SetStateAction } from "react";
import { ProductImageInput } from "@/components/products/product-image-input";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateSuggestedPrices } from "@/features/catalog/pricing";
import type { ProductImageAsset } from "@/features/products/contracts";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ProductCategoryOption {
  id: string;
  name: string;
}

export function ProductEditFields({
  categories,
  categoryId,
  costPrice,
  description,
  image,
  imageDisabled = false,
  imageMarkedForRemoval,
  name,
  onCategoryIdChange,
  onDescriptionChange,
  onImageFileChange,
  onImageRemovalChange,
  onNameChange,
  onPriceChange,
  price,
  productName,
  settings,
}: {
  categories: ProductCategoryOption[];
  categoryId: string;
  costPrice: string;
  description: string;
  image: ProductImageAsset | null;
  imageDisabled?: boolean;
  imageMarkedForRemoval: boolean;
  name: string;
  onCategoryIdChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onImageFileChange: Dispatch<SetStateAction<File | null>>;
  onImageRemovalChange: (value: boolean) => void;
  onNameChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  price: string;
  productName: string;
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
}) {
  const suggestion = calculateSuggestedPrices({
    costPrice: Number(costPrice),
    currentPrice: Number(price),
    idealMarkupPercent: settings.idealMarkupPercent,
    minimumMarkupPercent: settings.minimumMarkupPercent,
  });

  const currentMarkupPercent =
    suggestion.costPrice > 0 && Number(price) > 0
      ? (Number(price) / suggestion.costPrice - 1) * 100
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <ProductImageInput
          currentImage={image}
          currentImageAlt={`Imagem de ${productName}`}
          description="Opcional. Aceita JPG, PNG ou WebP com ate 10 MB."
          disabled={imageDisabled}
          id="product-edit-image"
          isMarkedForRemoval={imageMarkedForRemoval}
          label="Imagem"
          onFileChange={onImageFileChange}
          onRemoveCurrentImageToggle={onImageRemovalChange}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-edit-name">Nome</Label>
        <Input
          id="product-edit-name"
          onChange={(event) => onNameChange(event.target.value)}
          value={name}
        />
        {name.trim().length === 0 ? (
          <em className="text-[11px] text-destructive">
            O nome do produto e obrigatorio.
          </em>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-edit-category">Categoria</Label>
        <Select onValueChange={onCategoryIdChange} value={categoryId}>
          <SelectTrigger className="w-full" id="product-edit-category">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-edit-description">Observacoes</Label>
        <Textarea
          className="min-h-24"
          id="product-edit-description"
          onChange={(event) => onDescriptionChange(event.target.value)}
          value={description}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
          Guia de preco sugerido
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => onPriceChange(suggestion.minimumPrice.toString())}
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
            onClick={() => onPriceChange(suggestion.idealPrice.toString())}
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
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="product-edit-price">Preco de venda</Label>
          <span className="text-muted-foreground text-xs">
            Custo medio: {formatCurrency(costPrice)}
          </span>
        </div>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>R$</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="product-edit-price"
            inputMode="numeric"
            onChange={(event) =>
              onPriceChange(parseCurrencyInput(event.target.value).toString())
            }
            placeholder="0,00"
            type="text"
            value={formatCurrencyInput(Number(price))}
          />
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
        </InputGroup>
        {price.trim().length === 0 ||
        Number(price) < 0 ||
        Number.isNaN(Number(price)) ? (
          <em className="text-[11px] text-destructive">
            Forneca um preco valido e maior ou igual a zero.
          </em>
        ) : null}
      </div>
    </div>
  );
}
