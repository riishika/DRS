import type { SSEEvent } from "@/types";

export function formatSseEvent(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
