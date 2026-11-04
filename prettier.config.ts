import type { Config } from "prettier";

const config = {
  useTabs: false,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss", "prettier-plugin-packagejson"],
  overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
  tailwindStylesheet: "./src/routes/layout.css",
} satisfies Config;

export default config;
