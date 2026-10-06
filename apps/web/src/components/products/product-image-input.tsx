"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  ImageUploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@polaris/ui/components/ui/button";
import { useFileUpload } from "@polaris/ui/hooks/use-file-upload";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import type { ProductImageAsset } from "@/features/products/contracts";
import { isSessionProxiedProductImageSrc } from "@/lib/product-image-client";

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
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

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
    return "A imagem excede o limite de 5 MB.";
  }

  if (error.includes("accepted file type")) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }

  return error;
};

function ProductImagePreview({
  previewUrl,
  visibleImage,
}: {
  previewUrl: string | null;
  visibleImage: { alt: string; src: string } | null;
}) {
  return (
    <div className="relative size-20 overflow-hidden rounded-2xl border border-border/40 bg-muted/20 sm:size-24">
      {visibleImage ? (
        <Image
          alt={visibleImage.alt}
          className="object-cover"
          fill
          sizes="96px"
          src={visibleImage.src}
          unoptimized={
            previewUrl !== null ||
            isSessionProxiedProductImageSrc(visibleImage.src)
          }
        />
      ) : null}
    </div>
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
  const isDeletable =
    previewUrl || (currentImage && !previewUrl && onRemoveCurrentImageToggle);

  if (!isDeletable) {
    return null;
  }

  return (
    <Button
      aria-label="Remover imagem"
      disabled={disabled}
      onClick={() => {
        if (previewUrl) {
          onClearSelectedFile();
        } else if (onRemoveCurrentImageToggle) {
          onRemoveCurrentImageToggle(!isMarkedForRemoval);
        }
      }}
      type="button"
      variant="destructive"
    >
      <HugeiconsIcon
        className="size-3.5"
        data-icon="inline-start"
        icon={isMarkedForRemoval ? Cancel01Icon : Delete02Icon}
        strokeWidth={2}
      />
      {previewUrl || isMarkedForRemoval ? "Descartar" : "Excluir atual"}
    </Button>
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
  const descriptionId = description ? `${id}-description` : undefined;

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

  const hasVisibleImage = Boolean(displayImage);
  const visibleImage = hasVisibleImage ? displayImage : null;

  return (
    <div className="flex flex-col gap-3">
      <input
        {...actions.getInputProps({
          accept: PRODUCT_IMAGE_ACCEPT,
          "aria-describedby": descriptionId,
          disabled,
          id,
        })}
        className="sr-only"
      />

      <div className="flex items-center gap-4">
        <div className="flex shrink-0 items-center">
          <ProductImagePreview
            previewUrl={previewUrl}
            visibleImage={visibleImage}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="mb-1 flex flex-col gap-0.5">
            <label className="font-semibold text-sm leading-tight" htmlFor={id}>
              {label}
            </label>
            {description ? (
              <p
                className="text-[10px] text-muted-foreground leading-tight"
                id={descriptionId}
              >
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={disabled}
              onClick={actions.openFileDialog}
              onDragEnter={actions.handleDragEnter}
              onDragLeave={actions.handleDragLeave}
              onDragOver={actions.handleDragOver}
              onDrop={actions.handleDrop}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon
                className="size-3.5"
                data-icon="inline-start"
                icon={ImageUploadIcon}
                strokeWidth={2}
              />
              Adicionar
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

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
