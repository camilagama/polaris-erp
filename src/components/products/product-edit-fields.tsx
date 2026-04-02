"use client";

import type { Dispatch, SetStateAction } from "react";
import { ProductImageInput } from "@/components/products/product-image-input";
import { Input } from "@/components/ui/input";
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

interface ProductCategoryOption {
  id: string;
  name: string;
}

export function ProductEditFields({
  categories,
  categoryId,
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
  productName,
}: {
  categories: ProductCategoryOption[];
  categoryId: string;
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
  productName: string;
}) {
  return (
    <div className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-3">
        <ProductImageInput
          currentImage={image}
          currentImageAlt={`Imagem de ${productName}`}
          description="Opcional. Aceita JPG, PNG ou WebP com ate 10 MB."
          disabled={imageDisabled}
          id="product-edit-image"
          isMarkedForRemoval={imageMarkedForRemoval}
          label="Imagem"
          onFileChange={(file) => {
            onImageFileChange(file);
            if (file) {
              onImageRemovalChange(false);
            }
          }}
          onRemoveCurrentImageToggle={onImageRemovalChange}
        />
      </div>
    </div>
  );
}
