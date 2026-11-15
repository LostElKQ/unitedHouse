import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit/hooks";
import { building } from "$app/env";
import { auth } from "#lib/server/auth.js";
import { svelteKitHandler } from "better-auth/svelte-kit";
import z from "zod";
import { ru } from "zod/locales";

const handleBetterAuth: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;

export const handleError: HandleServerError = async ({ error, kind }) => {
  if (kind === "unknown") {
    if (error instanceof z.ZodError)
      return { status: 422, message: "Validation error", errors: z.flattenError(error) };
    console.error(error);
    return {};
  }
  return error;
};

export const init: ServerInit = () => {
  z.config(ru());
};
