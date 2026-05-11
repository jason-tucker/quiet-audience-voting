import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Pre-Phase-1 component code uses raw <img> tags by design (full-screen
    // poster grid on a single-domain iPad app — next/image adds little here
    // and complicates the local-uploads flow). Phase 2 will revisit when
    // these components are rewritten.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
      "prefer-const": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "next-env.d.ts",
      "src/generated/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
    ],
  },
];

export default config;
