"use client";

import {
  Cancel01Icon,
  Image01Icon,
  ImageUploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { ProductImageAsset } from "@/features/products/contracts";
import { useFileUpload } from "@/hooks/use-file-upload";
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

const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

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

const translateUploadError = (error: string | undefined) => {
  if (!error) {
    return null;
  }

  if (error.includes("maximum size")) {
    return "A imagem excede o limite de 10 MB.";
  }

  if (error.includes("accepted file type")) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }

  return error;
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
  const [state, actions] = useFileUpload({
    accept: PRODUCT_IMAGE_ACCEPT,
    maxFiles: 1,
    maxSize: PRODUCT_IMAGE_MAX_BYTES,
    onFilesAdded: (addedFiles) => {
      const selectedFile = addedFiles[0]?.file;
      if (selectedFile instanceof File) {
        onRemoveCurrentImageToggle?.(false);
        onFileChange(selectedFile);
      }
    },
    onFilesChange: (files) => {
      const selectedFile = files[0]?.file;
      onFileChange(selectedFile instanceof File ? selectedFile : null);
    },
  });

  const previewUrl = state.files[0]?.preview ?? null;
  const fileName =
    state.files[0]?.file instanceof File
      ? state.files[0].file.name
      : (state.files[0]?.file.name ?? null);
  const error = translateUploadError(state.errors[0]);

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
    actions.clearFiles();
    onFileChange(null);
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
        {...actions.getInputProps({
          accept: PRODUCT_IMAGE_ACCEPT,
          disabled,
          id,
        })}
        className="sr-only"
      />

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
          {visibleImage ? (
            <Image
              alt={visibleImage.alt}
              className="object-cover"
              fill
              sizes="136px"
              src={visibleImage.src}
              unoptimized={previewUrl !== null}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <HugeiconsIcon icon={Image01Icon} strokeWidth={1.8} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3">
          <button
            className={cn(
              "flex min-h-28 w-full flex-col items-start justify-center rounded-2xl border border-border/70 border-dashed bg-muted/15 px-4 py-3 text-left transition-colors",
              !hasVisibleImage && "hover:bg-muted/25",
              state.isDragging && "border-primary bg-primary/5",
              disabled && "pointer-events-none opacity-60"
            )}
            onClick={actions.openFileDialog}
            onDragEnter={actions.handleDragEnter}
            onDragLeave={actions.handleDragLeave}
            onDragOver={actions.handleDragOver}
            onDrop={actions.handleDrop}
            type="button"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={ImageUploadIcon} strokeWidth={1.8} />
              <span className="font-medium text-foreground text-sm">
                {hasVisibleImage
                  ? "Trocar imagem"
                  : "Selecionar imagem do produto"}
              </span>
            </div>
            <p className="mt-2 text-muted-foreground text-xs">
              Arraste e solte aqui ou clique para buscar no dispositivo.
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              JPG, PNG ou WebP com ate 10 MB.
            </p>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {previewUrl ? (
              <Button
                aria-label="Remover imagem selecionada"
                onClick={clearSelectedFile}
                size="xs"
                type="button"
                variant="secondary"
              >
                <HugeiconsIcon
                  data-icon="inline-start"
                  icon={Cancel01Icon}
                  strokeWidth={2}
                />
                Limpar selecao
              </Button>
            ) : null}

            <p className="min-w-0 truncate text-muted-foreground text-xs">
              {fileName ??
                (visibleImage
                  ? "Imagem pronta para edicao."
                  : "Nenhuma imagem selecionada.")}
            </p>
          </div>
        </div>
      </div>

      {isMarkedForRemoval && !previewUrl ? (
        <p className="text-[11px] text-muted-foreground">
          A imagem atual sera removida ao salvar.
        </p>
      ) : null}

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
