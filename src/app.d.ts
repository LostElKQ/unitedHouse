/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { Session } from "#lib/server/auth.js";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user?: Session["user"];
      session?: Session["session"];
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
