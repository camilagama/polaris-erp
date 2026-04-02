"use client";

import { ImageDelete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Dispatch, SetStateAction } from "react";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { ProductImageInput } from "@/components/products/product-image-input";
import { Button } from "@/components/ui/button";
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
  selectedImageFile,
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
  selectedImageFile: File | null;
}) {
  const shouldShowCurrentImage = image && !imageMarkedForRemoval;

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
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Label>Imagem</Label>
            <p className="text-[11px] text-muted-foreground">
              Opcional. A versao final gera uma imagem de detalhe e uma
              miniatura.
            </p>
          </div>
          {image && !selectedImageFile ? (
            <Button
              disabled={imageDisabled}
              onClick={() => onImageRemovalChange(!imageMarkedForRemoval)}
              size="xs"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon
                data-icon="inline-start"
                icon={ImageDelete02Icon}
                strokeWidth={2}
              />
              {imageMarkedForRemoval ? "Manter atual" : "Remover atual"}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="w-full max-w-32 shrink-0">
            <div className="relative aspect-square">
              <ProductImageFrame
                alt={`Imagem de ${productName}`}
                image={shouldShowCurrentImage ? image : null}
                sizes="128px"
              />
            </div>
            {imageMarkedForRemoval && !selectedImageFile ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                A imagem atual sera removida ao salvar.
              </p>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <ProductImageInput
              description="Aceita JPG, PNG ou WebP com ate 10 MB."
              disabled={imageDisabled}
              id="product-edit-image"
              label={
                selectedImageFile ? "Nova imagem selecionada" : "Trocar imagem"
              }
              onFileChange={(file) => {
                onImageFileChange(file);
                if (file) {
                  onImageRemovalChange(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
