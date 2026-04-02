"use client";

import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Image01Icon,
  ImageUploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProductImageAsset } from "@/features/products/contracts";
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload";
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

const getHelperText = ({
  currentImage,
  isMarkedForRemoval,
  selectedFile,
}: {
  currentImage: ProductImageAsset | null;
  isMarkedForRemoval: boolean;
  selectedFile: File | null;
}) => {
  if (selectedFile) {
    return `${selectedFile.name} - ${formatBytes(selectedFile.size)}`;
  }

  if (currentImage && !isMarkedForRemoval) {
    return "Imagem atual vinculada ao produto.";
  }

  if (isMarkedForRemoval) {
    return "A imagem atual sera removida ao salvar.";
  }

  return "Nenhuma imagem selecionada.";
};

function ProductImagePreview({
  previewUrl,
  visibleImage,
}: {
  previewUrl: string | null;
  visibleImage: { alt: string; src: string } | null;
}) {
  return (
    <div className="relative size-24 overflow-hidden rounded-3xl border border-border/60 bg-muted/20 sm:size-28">
      {visibleImage ? (
        <Image
          alt={visibleImage.alt}
          className="object-cover"
          fill
          sizes="112px"
          src={visibleImage.src}
          unoptimized={previewUrl !== null}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <HugeiconsIcon icon={Image01Icon} strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}

function ProductImageStatus({
  currentImage,
  helperText,
  isDragging,
  isMarkedForRemoval,
  selectedFile,
}: {
  currentImage: ProductImageAsset | null;
  helperText: string;
  isDragging: boolean;
  isMarkedForRemoval: boolean;
  selectedFile: File | null;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={selectedFile ? "default" : "secondary"}>
          {selectedFile ? "Nova imagem" : "Sem imagem"}
        </Badge>
        {currentImage && !isMarkedForRemoval && !selectedFile ? (
          <Badge variant="outline">Atual</Badge>
        ) : null}
        {isDragging ? <Badge variant="outline">Solte para enviar</Badge> : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-medium text-foreground text-sm">
          {selectedFile || (currentImage && !isMarkedForRemoval)
            ? "Imagem pronta para uso"
            : "Adicione uma imagem para o produto"}
        </p>
        <p className="text-muted-foreground text-sm">
          Arraste o arquivo para a area abaixo ou escolha uma imagem
          manualmente.
        </p>
        <p className="min-w-0 truncate text-muted-foreground text-xs">
          {helperText}
        </p>
      </div>
    </>
  );
}

function ProductImageSecondaryActions({
  currentImage,
  disabled,
  isMarkedForRemoval,
  onClearSelectedFile,
  onRemoveCurrentImageToggle,
  previewUrl,
}: {
  currentImage: ProductImageAsset | null;
  disabled: boolean;
  isMarkedForRemoval: boolean;
  onClearSelectedFile: () => void;
  onRemoveCurrentImageToggle?: (value: boolean) => void;
  previewUrl: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {previewUrl ? (
        <Button
          aria-label="Remover imagem selecionada"
          disabled={disabled}
          onClick={onClearSelectedFile}
          type="button"
          variant="secondary"
        >
          <HugeiconsIcon
            data-icon="inline-start"
            icon={Cancel01Icon}
            strokeWidth={2}
          />
          Descartar nova
        </Button>
      ) : null}

      {currentImage && !previewUrl && onRemoveCurrentImageToggle ? (
        <Button
          disabled={disabled}
          onClick={() => onRemoveCurrentImageToggle(!isMarkedForRemoval)}
          type="button"
          variant="outline"
        >
          <HugeiconsIcon
            data-icon="inline-start"
            icon={isMarkedForRemoval ? CheckmarkCircle02Icon : Cancel01Icon}
            strokeWidth={2}
          />
          {isMarkedForRemoval ? "Manter imagem atual" : "Remover atual"}
        </Button>
      ) : null}
    </div>
  );
}

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
  });

  const previewUrl = state.files[0]?.preview ?? null;
  const selectedFile =
    state.files[0]?.file instanceof File ? state.files[0].file : null;
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

  useEffect(() => {
    if (selectedFile) {
      onRemoveCurrentImageToggle?.(false);
    }

    onFileChange(selectedFile);
  }, [onFileChange, onRemoveCurrentImageToggle, selectedFile]);

  const helperText = getHelperText({
    currentImage,
    isMarkedForRemoval,
    selectedFile,
  });
  const hasVisibleImage = Boolean(displayImage);
  const visibleImage = hasVisibleImage ? displayImage : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">{label}</p>
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
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

      <div
        className={cn(
          "rounded-3xl border border-border/60 bg-card p-4 transition-colors",
          state.isDragging && "border-primary bg-primary/5",
          disabled && "opacity-60"
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <ProductImagePreview
              previewUrl={previewUrl}
              visibleImage={visibleImage}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <ProductImageStatus
              currentImage={currentImage}
              helperText={helperText}
              isDragging={state.isDragging}
              isMarkedForRemoval={isMarkedForRemoval}
              selectedFile={selectedFile}
            />

            <Separator className="my-4" />

            <div className="flex flex-col gap-3">
              <Button
                className={cn(
                  "min-h-14 justify-start rounded-2xl border border-border/70 border-dashed bg-muted/15 px-4 text-left hover:bg-muted/25",
                  state.isDragging && "border-primary bg-primary/5"
                )}
                disabled={disabled}
                onClick={actions.openFileDialog}
                onDragEnter={actions.handleDragEnter}
                onDragLeave={actions.handleDragLeave}
                onDragOver={actions.handleDragOver}
                onDrop={actions.handleDrop}
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon
                  data-icon="inline-start"
                  icon={ImageUploadIcon}
                  strokeWidth={2}
                />
                {hasVisibleImage
                  ? "Trocar imagem por outro arquivo"
                  : "Escolher imagem do produto"}
              </Button>

              <ProductImageSecondaryActions
                currentImage={currentImage}
                disabled={disabled}
                isMarkedForRemoval={isMarkedForRemoval}
                onClearSelectedFile={actions.clearFiles}
                onRemoveCurrentImageToggle={onRemoveCurrentImageToggle}
                previewUrl={previewUrl}
              />
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
