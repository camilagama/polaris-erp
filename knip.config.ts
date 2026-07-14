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
    ".": {
      entry: ["scripts/**/*.{ts,js,mjs,cjs}"],
      project: ["scripts/**/*.{ts,js,mjs,cjs}"],
    },
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
    "apps/admin": {
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
    "packages/auth": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/billing": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/db": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/events": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/emails": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/platform": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/platform-auth": {
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
    "packages/ui": {
      entry: [
        "src/components/shared/*.tsx",
        "src/components/ui/*.tsx",
        "src/components/ui/svgs/*.tsx",
        "src/hooks/*.ts",
        "src/lib/*.ts",
      ],
      project: ["src/**/*.{ts,tsx,js,jsx}"],
    },
  },
};

export default config;
