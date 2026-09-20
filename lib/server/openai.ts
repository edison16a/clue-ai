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
 * Whether OpenAI should retain the conversation for an endpoint.
 *
 * Only `help` set this. It is kept per-endpoint rather than collapsed to one
 * flag because turning it on for extract and locate would start retaining
 * students' submitted work on calls that never did before.
 */
export function storeFor(endpoint: Endpoint): boolean {
  return configData.openai.store[endpoint];
}
