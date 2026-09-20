import "server-only";
import OpenAI from "openai";
import configData from "@/data/config.json";

/** The three endpoints that call the model, each independently configurable. */
export type Endpoint = keyof typeof configData.openai.models;

/**
 * Lazily-created, process-wide OpenAI client.
 *
 * The original constructed `new OpenAI(...)` inside each request handler. That
 * works, but it rebuilds the client and its connection pool on every request,
 * and it means three separate places would need editing to add a timeout or a
 * retry policy. One module-level instance is reused across requests on a warm
 * Lambda; construction stays lazy so importing this module does not require
 * the key to be present, which keeps `next build` working without one.
 */
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/** The model configured for an endpoint. */
export function modelFor(endpoint: Endpoint): string {
  return configData.openai.models[endpoint];
}

/**
 * Whether OpenAI should retain the response for an endpoint.
 *
 * All three are currently true, which is what the pre-refactor code did —
 * though only one of them said so. `help` passed `store: true` explicitly;
 * locate and extract omitted the field, and the Responses API defaults it to
 * true. Reading the old code, it looked as though two of the three calls did
 * not retain anything; making the value explicit is the point of moving it to
 * config. Kept per-endpoint so retention can be disabled for one call without
 * silently changing the others.
 */
export function storeFor(endpoint: Endpoint): boolean {
  return configData.openai.store[endpoint];
}
