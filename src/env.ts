import { defineEnvVars } from "@sveltejs/kit/env";
import z from "zod";

export const variables = defineEnvVars({
  BETTER_AUTH_SECRET: {
    description: "Better Auth secret, not shorter than 32 symbols (openssl rand -base64 32)",
    schema: z
      .string()
      .min(32, { error: "BETTER_AUTH_SECRET: string must be not shorter than 32 symbols" }),
  },
  DATABASE_URL: {
    description: "PostgreSQL connection string: postgres://user:password@host:5432/db",
    schema: z.url({ protocol: /postgres/, error: "DATABASE_URL not set" }),
  },
  ORIGIN: {
    description: "Application address, for example `http://localhost:5173`.",
  },
});
