export const MAX_VIDEO_SECONDS = 60;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function getOpenAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export function getOpenAiOrgId(): string | undefined {
  return process.env.OPENAI_ORG_ID;
}

export function hasOpenAiKey(): boolean {
  return Boolean(getOpenAiApiKey());
}
