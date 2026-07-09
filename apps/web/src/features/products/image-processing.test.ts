import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("processProductImage", () => {
  it("creates exactly the detail and table variants in webp", async () => {
    const { processProductImage } = await import(
      "@/features/products/image-processing"
    );
    const source = await sharp({
      create: {
        background: { alpha: 1, b: 90, g: 120, r: 240 },
        channels: 4,
        height: 1800,
        width: 2400,
      },
    })
      .png()
      .toBuffer();

    const result = await processProductImage(source);
    const [detailMetadata, tableMetadata] = await Promise.all([
      sharp(result.detail.buffer).metadata(),
      sharp(result.table.buffer).metadata(),
    ]);

    expect(result.blurDataURL.startsWith("data:image/webp;base64,")).toBe(true);
    expect(detailMetadata.format).toBe("webp");
    expect(tableMetadata.format).toBe("webp");
    expect(result.detail.width).toBe(1600);
    expect(result.detail.height).toBe(1200);
    expect(result.table.width).toBe(160);
    expect(result.table.height).toBe(160);
  });

  it("rejects unsupported image formats", async () => {
    const { processProductImage } = await import(
      "@/features/products/image-processing"
    );
    const svgBuffer = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="#ff6600" /></svg>'
    );

    await expect(processProductImage(svgBuffer)).rejects.toThrowError(
      "Formato de imagem nao suportado."
    );
  });
});
