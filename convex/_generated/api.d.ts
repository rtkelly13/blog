/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as hello from "../hello.js";
import type * as http from "../http.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_profanity from "../lib/profanity.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as polls from "../polls.js";
import type * as presence from "../presence.js";
import type * as questions from "../questions.js";
import type * as reactions from "../reactions.js";
import type * as sessions from "../sessions.js";
import type * as talkConfig from "../talkConfig.js";
import type * as talks from "../talks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  auth: typeof auth;
  crons: typeof crons;
  documents: typeof documents;
  hello: typeof hello;
  http: typeof http;
  "lib/admin": typeof lib_admin;
  "lib/profanity": typeof lib_profanity;
  "lib/rateLimit": typeof lib_rateLimit;
  polls: typeof polls;
  presence: typeof presence;
  questions: typeof questions;
  reactions: typeof reactions;
  sessions: typeof sessions;
  talkConfig: typeof talkConfig;
  talks: typeof talks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
