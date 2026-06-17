import OpenAI from "openai";
import { getOpenAiApiKey, getOpenAiOrgId } from "@/lib/env";

let singleton: OpenAI | null = null;

export function getOpenAiClient(): OpenAI | null {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return null;
  }
  if (!singleton) {
    singleton = new OpenAI({
      apiKey,
      organization: getOpenAiOrgId(),
      timeout: 90000,
      maxRetries: 2
    });
  }
  return singleton;
}
