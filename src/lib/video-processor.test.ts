import { describe, expect, it } from "vitest";
import { getStoryboardTimestamps } from "@/lib/video-processor";

describe("video storyboard sampling", () => {
  it("spreads frames across the full video duration", () => {
    const timestamps = getStoryboardTimestamps(60, 12);

    expect(timestamps).toHaveLength(12);
    expect(timestamps[0]).toBe(0);
    expect(timestamps.at(-1)).toBeCloseTo(59.75);
    expect(timestamps[6]).toBeGreaterThan(30);
  });

  it("handles very short clips", () => {
    expect(getStoryboardTimestamps(3, 12)).toHaveLength(3);
  });
});
