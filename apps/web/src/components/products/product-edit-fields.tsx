"use client";

import type { Dispatch, SetStateAction } from "react";
import { ProductImageInput } from "@/components/products/product-image-input";
import {
  ProductPriceMarkupIndicator,
  ProductPriceSuggestionGuide,
} from "@/components/products/product-pricing-fields";
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
import type { ProductImageAsset } from "@/features/products/contracts";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/formatters";

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
  const numericCostPrice = Number(costPrice);
  const numericPrice = Number(price);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <ProductImageInput
          currentImage={image}
          currentImageAlt={`Imagem de ${productName}`}
          description="Opcional. Aceita JPG, PNG ou WebP com ate 5 MB."
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
      <ProductPriceSuggestionGuide
        costPrice={numericCostPrice}
        currentPrice={numericPrice}
        onPriceSelect={(selectedPrice) =>
          onPriceChange(selectedPrice.toString())
        }
        settings={settings}
      />
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
            value={formatCurrencyInput(numericPrice)}
          />
          <ProductPriceMarkupIndicator
            costPrice={numericCostPrice}
            minimumMarkupPercent={settings.minimumMarkupPercent}
            price={numericPrice}
          />
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
