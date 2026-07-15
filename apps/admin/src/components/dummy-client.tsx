"use client";

import { useEffect } from "react";

export function DummyClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Intentional empty block to force client boundary
  }, []);
  return <>{children}</>;
}
