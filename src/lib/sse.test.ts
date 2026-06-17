import { describe, expect, it } from "vitest";
import { formatSseEvent } from "@/lib/sse";

describe("sse formatting", () => {
  it("formats compliant event packets", () => {
    const encoded = formatSseEvent({
      type: "wave.started",
      ts: "2026-06-14T11:00:00.000Z",
      wave: 1,
      message: "started"
    });

    expect(encoded).toContain("event: wave.started");
    expect(encoded).toContain('"wave":1');
    expect(encoded.endsWith("\n\n")).toBe(true);
  });
});
