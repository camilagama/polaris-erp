"use client";

import { useEffect, useState } from "react";
import { ProductImageFrame } from "@/components/products/product-image-frame";
import { validateProductImageFile } from "@/components/products/product-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductImageInputProps {
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
}

export function ProductImageInput({
  description,
  disabled = false,
  id,
  label,
  onFileChange,
}: ProductImageInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {previewUrl ? (
          <Button
            disabled={disabled}
            onClick={() => {
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
              }

              setPreviewUrl(null);
              setError(null);
              onFileChange(null);
            }}
            size="xs"
            type="button"
            variant="ghost"
          >
            Remover
          </Button>
        ) : null}
      </div>
      <Input
        accept={["image/jpeg", "image/png", "image/webp"].join(",")}
        disabled={disabled}
        id={id}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] ?? null;

          if (!selectedFile) {
            setError(null);
            onFileChange(null);
            return;
          }

          try {
            validateProductImageFile(selectedFile);
            const nextPreviewUrl = URL.createObjectURL(selectedFile);

            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }

            setPreviewUrl(nextPreviewUrl);
            setError(null);
            onFileChange(selectedFile);
          } catch (validationError) {
            event.target.value = "";
            setPreviewUrl(null);
            setError(
              validationError instanceof Error
                ? validationError.message
                : "Selecione uma imagem valida."
            );
            onFileChange(null);
          }
        }}
        type="file"
      />
      {description ? (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      ) : null}
      {previewUrl ? (
        <div className="size-28">
          <div className="relative aspect-square">
            <ProductImageFrame
              alt="Preview da imagem selecionada"
              image={{
                blurDataURL: previewUrl,
                detailUrl: previewUrl,
                height: 1,
                tableUrl: previewUrl,
                version: 0,
                width: 1,
              }}
              sizes="112px"
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
