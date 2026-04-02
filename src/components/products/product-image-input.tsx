"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
        <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
          <Image
            alt="Preview da imagem selecionada"
            className="object-contain"
            fill
            src={previewUrl}
            unoptimized
          />
        </div>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
