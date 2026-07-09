import "server-only";

import type { z } from "zod";

export const encodeOpaqueCursor = (payload: object) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

export const decodeOpaqueCursor = <T>(
  cursor: string,
  schema: z.ZodType<T>,
  invalidMessage: string
) => {
  try {
    const decodedPayload = Buffer.from(cursor, "base64url").toString("utf8");
    return schema.parse(JSON.parse(decodedPayload));
  } catch {
    throw new Error(invalidMessage);
  }
};
