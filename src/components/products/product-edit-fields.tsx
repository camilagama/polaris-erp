"use client";

import type { Dispatch, SetStateAction } from "react";
import { ProductImageInput } from "@/components/products/product-image-input";
import { Button } from "@/components/ui/button";
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
import { formatCurrency } from "@/lib/formatters";

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
            min="0"
            onChange={(event) => onPriceChange(event.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={price}
          />
        </InputGroup>
      </div>
      <div className="rounded-md border border-border/50 bg-muted/10 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
              Guia de preco
            </p>
            <p className="truncate text-muted-foreground text-xs">
              Min. {formatCurrency(suggestion.minimumPrice)} | Ideal{" "}
              {formatCurrency(suggestion.idealPrice)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              onClick={() => onPriceChange(suggestion.minimumPrice.toString())}
              size="xs"
              type="button"
              variant="outline"
            >
              Min
            </Button>
            <Button
              onClick={() => onPriceChange(suggestion.idealPrice.toString())}
              size="xs"
              type="button"
              variant="outline"
            >
              Ideal
            </Button>
          </div>
        </div>

        {suggestion.isBelowMinimum ? (
          <p className="mt-2 text-[11px] text-destructive">
            Preco abaixo do minimo sugerido. O salvamento continua permitido.
          </p>
        ) : null}
      </div>
    </div>
  );
}
