import { defineConfig } from "drizzle-kit";
import dotenvExpand from "dotenv-expand";

dotenvExpand.expand({
  parsed: Object.entries(process.env).reduce<Record<string, string>>((prev, [env, value]) => {
    if (value === undefined) return prev;
    prev[env] = value;
    return prev;
  }, {}),
});

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL"] },
  verbose: true,
  strict: true,
});
