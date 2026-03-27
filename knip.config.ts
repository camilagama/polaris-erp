import type { KnipConfig } from "knip";

const config: KnipConfig = {
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
