import { describe, expect, it } from "vitest";
import { getPersonaPool, getWaveAudience } from "@/lib/personas";

describe("persona generation", () => {
  it("returns exactly 24 persona archetypes", () => {
    const pool = getPersonaPool();
    expect(pool).toHaveLength(24);
  });

  it("builds wave audiences at expected sizes", () => {
    expect(getWaveAudience(1, "creator-education")).toHaveLength(10);
    expect(getWaveAudience(2, "creator-education")).toHaveLength(50);
    expect(getWaveAudience(3, "creator-education")).toHaveLength(200);
  });
});
