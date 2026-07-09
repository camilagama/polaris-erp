import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreDependencies: ["@biomejs/biome", "tailwindcss"],
  ignoreIssues: {
    "apps/web/src/components/kibo-ui/contribution-graph/index.tsx": [
      "exports",
      "types",
    ],
    "apps/web/src/components/ui/*": ["exports"],
    "apps/web/src/features/dashboard/contracts.ts": ["types"],
    "apps/web/src/features/goals/contracts.ts": ["types"],
    "apps/web/src/features/goals/schema.ts": ["types"],
    "apps/web/src/features/products/image-storage.ts": ["types"],
    "apps/web/src/features/sales/contracts.ts": ["types"],
    "apps/web/src/lib/postgres-plan.ts": ["types"],
  },
  workspaces: {
    "apps/web": {
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
    },
  },
};

export default config;
