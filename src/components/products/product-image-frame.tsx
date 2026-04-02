"use client";

import { Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ProductImageAsset } from "@/features/products/contracts";
import { cn } from "@/lib/utils";

export function ProductImageFrame({
  alt,
  className,
  image,
  priority = false,
  shape = "square",
  sizes,
}: {
  alt: string;
  className?: string;
  image: ProductImageAsset | null;
  priority?: boolean;
  shape?: "square" | "wide";
  sizes?: string;
}) {
  const roundedClassName = shape === "wide" ? "rounded-xl" : "rounded-lg";

  if (!image) {
    return (
      <Avatar
        className={cn(
          "size-full border border-border/60 bg-muted/20 text-muted-foreground",
          roundedClassName,
          className
        )}
      >
        <AvatarFallback
          className={cn("bg-muted/20 text-muted-foreground", roundedClassName)}
        >
          <HugeiconsIcon icon={Image01Icon} strokeWidth={1.8} />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden border border-border/60 bg-muted/20",
        roundedClassName,
        className
      )}
    >
      <Image
        alt={alt}
        blurDataURL={image.blurDataURL}
        className="object-cover"
        fill
        placeholder="blur"
        priority={priority}
        sizes={sizes}
        src={shape === "wide" ? image.detailUrl : image.tableUrl}
        unoptimized
      />
    </div>
  );
}
