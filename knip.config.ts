import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreDependencies: ["@biomejs/biome", "tailwindcss"],
  ignoreIssues: {
    "src/components/kibo-ui/contribution-graph/index.tsx": ["exports", "types"],
    "src/components/ui/*": ["exports"],
    "src/features/dashboard/contracts.ts": ["types"],
    "src/features/goals/contracts.ts": ["types"],
    "src/features/goals/schema.ts": ["types"],
    "src/features/products/image-storage.ts": ["types"],
    "src/features/sales/contracts.ts": ["types"],
  },
  next: {
    entry: [
      "next.config.{js,ts,mjs}",
      "src/app/**/page.{tsx,jsx}",
      "src/app/**/layout.{tsx,jsx}",
      "src/app/**/error.{tsx,jsx}",
      "src/app/**/loading.{tsx,jsx}",
      "src/app/**/not-found.{tsx,jsx}",
      "src/app/**/route.{ts,js}",
      "src/app/api/**/*.ts",
    ],
  },
  project: ["src/**/*.{ts,tsx,js,jsx}"],
};

export default config;
