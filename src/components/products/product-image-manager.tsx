"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  removeProductImageAction,
  replaceProductImageAction,
} from "@/app/(app)/produtos/actions";
import { ProductImageInput } from "@/components/products/product-image-input";
import { uploadProductImageToStaging } from "@/components/products/product-image-upload";
import { Button } from "@/components/ui/button";
import type { ProductImageAsset } from "@/features/products/contracts";

export function ProductImageManager({
  image,
  productId,
  productName,
}: {
  image: ProductImageAsset | null;
  productId: string;
  productName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingLabel, setPendingLabel] = useState("Salvar imagem");
  const saveButtonLabel = (() => {
    if (pending) {
      return pendingLabel;
    }

    return image ? "Salvar nova imagem" : "Salvar imagem";
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/15">
        {image ? (
          <div className="relative aspect-[4/3] w-full">
            <Image
              alt={`Imagem do produto ${productName}`}
              blurDataURL={image.blurDataURL}
              className="object-contain"
              fill
              placeholder="blur"
              preload
              sizes="(max-width: 1024px) 100vw, 50vw"
              src={image.detailUrl}
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-muted-foreground text-sm">
            Este produto ainda nao possui imagem.
          </div>
        )}
      </div>

      <ProductImageInput
        description="A imagem final sera normalizada em duas versoes: detalhe e miniatura."
        disabled={pending}
        id="product-detail-image"
        label={image ? "Trocar imagem" : "Adicionar imagem"}
        onFileChange={setSelectedFile}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={pending || !selectedFile}
          onClick={() => {
            if (!selectedFile) {
              return;
            }

            startTransition(async () => {
              try {
                setPendingLabel("Enviando imagem...");
                const stagedImage =
                  await uploadProductImageToStaging(selectedFile);

                setPendingLabel("Salvando imagem...");
                await replaceProductImageAction(productId, stagedImage);
                setSelectedFile(null);
                toast.success(
                  image ? "Imagem atualizada." : "Imagem adicionada."
                );
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Nao foi possivel salvar a imagem."
                );
              } finally {
                setPendingLabel("Salvar imagem");
              }
            });
          }}
          type="button"
        >
          {saveButtonLabel}
        </Button>

        {image ? (
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await removeProductImageAction(productId);
                  setSelectedFile(null);
                  toast.success("Imagem removida.");
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Nao foi possivel remover a imagem."
                  );
                }
              });
            }}
            type="button"
            variant="outline"
          >
            Remover imagem
          </Button>
        ) : null}
      </div>
    </div>
  );
}
