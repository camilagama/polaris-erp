"use client";

import {
  Cancel01Icon,
  Image01Icon,
  ImageUploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { validateProductImageFile } from "@/components/products/product-image-upload";
import { Button } from "@/components/ui/button";
import type { ProductImageAsset } from "@/features/products/contracts";
import { cn } from "@/lib/utils";

interface ProductImageInputProps {
  currentImage?: ProductImageAsset | null;
  currentImageAlt?: string;
  description?: string;
  disabled?: boolean;
  id: string;
  isMarkedForRemoval?: boolean;
  label: string;
  onFileChange: (file: File | null) => void;
  onRemoveCurrentImageToggle?: (value: boolean) => void;
}

const buildDisplayImage = ({
  currentImage,
  currentImageAlt,
  isMarkedForRemoval,
  previewUrl,
}: {
  currentImage: ProductImageAsset | null;
  currentImageAlt: string;
  isMarkedForRemoval: boolean;
  previewUrl: string | null;
}) => {
  if (previewUrl) {
    return {
      alt: "Preview da imagem selecionada",
      src: previewUrl,
    };
  }

  if (currentImage && !isMarkedForRemoval) {
    return {
      alt: currentImageAlt,
      src: currentImage.detailUrl,
    };
  }

  return null;
};

export function ProductImageInput({
  currentImage = null,
  currentImageAlt = "Imagem do produto",
  description,
  disabled = false,
  id,
  isMarkedForRemoval = false,
  label,
  onFileChange,
  onRemoveCurrentImageToggle,
}: ProductImageInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayImage = useMemo(
    () =>
      buildDisplayImage({
        currentImage,
        currentImageAlt,
        isMarkedForRemoval,
        previewUrl,
      }),
    [currentImage, currentImageAlt, isMarkedForRemoval, previewUrl]
  );

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setPreviewUrl(null);
    setFileName(null);
    setError(null);
    onFileChange(null);
  };

  const handleSelectedFile = (selectedFile: File | null) => {
    if (!selectedFile) {
      clearSelectedFile();
      return;
    }

    try {
      validateProductImageFile(selectedFile);
      const nextPreviewUrl = URL.createObjectURL(selectedFile);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(nextPreviewUrl);
      setFileName(selectedFile.name);
      setError(null);
      onRemoveCurrentImageToggle?.(false);
      onFileChange(selectedFile);
    } catch (validationError) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setPreviewUrl(null);
      setFileName(null);
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Selecione uma imagem valida."
      );
      onFileChange(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
  };

  const hasVisibleImage = Boolean(displayImage);
  const visibleImage = hasVisibleImage ? displayImage : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{label}</p>
          {description ? (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {currentImage && !previewUrl && onRemoveCurrentImageToggle ? (
          <Button
            disabled={disabled}
            onClick={() => onRemoveCurrentImageToggle(!isMarkedForRemoval)}
            size="xs"
            type="button"
            variant="ghost"
          >
            {isMarkedForRemoval ? "Manter atual" : "Remover atual"}
          </Button>
        ) : null}
      </div>

      <input
        accept={["image/jpeg", "image/png", "image/webp"].join(",")}
        className="sr-only"
        disabled={disabled}
        id={id}
        onChange={(event) =>
          handleSelectedFile(event.target.files?.[0] ?? null)
        }
        ref={inputRef}
        type="file"
      />

      <div className="relative">
        <button
          className={cn(
            "group relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-border/70 border-dashed bg-muted/15 p-4 text-left transition-colors",
            hasVisibleImage
              ? "border-border/60 border-solid bg-card"
              : "hover:bg-muted/25",
            isDragging && "border-primary bg-primary/5",
            disabled && "pointer-events-none opacity-60"
          )}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              setIsDragging(false);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={handleDrop}
          type="button"
        >
          {visibleImage ? (
            <>
              <div className="absolute inset-0">
                <Image
                  alt={visibleImage.alt}
                  className="object-contain"
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  src={visibleImage.src}
                  unoptimized={previewUrl !== null}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent px-4 py-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {previewUrl ? "Nova imagem selecionada" : "Imagem atual"}
                    </p>
                    <p className="truncate text-muted-foreground text-xs">
                      {fileName ?? "Clique para trocar ou arraste outra imagem"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 rounded-md border border-border/60 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground sm:block">
                    Trocar
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground">
                <HugeiconsIcon icon={ImageUploadIcon} strokeWidth={1.8} />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Arraste uma imagem ou clique para selecionar
                </p>
                <p className="text-muted-foreground text-xs">
                  JPG, PNG ou WebP. O app gera automaticamente a versao de
                  detalhe e a miniatura da tabela.
                </p>
              </div>
            </div>
          )}
        </button>

        {previewUrl ? (
          <span className="absolute top-3 right-3">
            <Button
              aria-label="Remover imagem selecionada"
              className="rounded-full"
              onClick={(event) => {
                event.stopPropagation();
                clearSelectedFile();
              }}
              size="icon-xs"
              type="button"
              variant="secondary"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </span>
        ) : null}
      </div>

      {hasVisibleImage ? null : (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <HugeiconsIcon icon={Image01Icon} strokeWidth={1.8} />
          Nenhuma imagem selecionada.
        </div>
      )}

      {isMarkedForRemoval && !previewUrl ? (
        <p className="text-[11px] text-muted-foreground">
          A imagem atual sera removida ao salvar.
        </p>
      ) : null}

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
