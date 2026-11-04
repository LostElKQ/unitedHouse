import { defineEnvVars } from "@sveltejs/kit/env";
import z from "zod";

export const variables = defineEnvVars({
  BETTER_AUTH_SECRET: {
    description: "Секрет Better Auth, не короче 32 символов (openssl rand -base64 32)",
    schema: z.string().min(32, { error: "BETTER_AUTH_SECRET: нужна строка не короче 32 символов" }),
  },
  DATABASE_URL: {
    description: "Строка подключения к PostgreSQL: postgres://user:password@host:5432/db",
    schema: z.url({ protocol: /postgres/, error: "DATABASE_URL не выставлена" }),
  },
  ORIGIN: {
    description: "Адрес приложения, например `http://localhost:5173`.",
  },
});
