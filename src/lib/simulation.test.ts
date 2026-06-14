import { describe, expect, it } from "vitest";
import { buildPersonaComment, computeWaveMetrics } from "@/lib/simulation";
import { getTargetAudience } from "@/lib/target-audiences";
import type { AgentAction, Persona, VideoAnalysis } from "@/types";

describe("simulation scoring", () => {
  it("calculates engagement score with weighted actions", () => {
    const actions: AgentAction[] = [
      { personaId: "p1", wave: 1, action: "like", watchDuration: 70, reasoning: "", emotionalResponse: "", source: "deterministic" },
      { personaId: "p2", wave: 1, action: "comment", watchDuration: 80, reasoning: "", emotionalResponse: "", source: "deterministic" },
      { personaId: "p3", wave: 1, action: "save", watchDuration: 65, reasoning: "", emotionalResponse: "", source: "deterministic" },
      { personaId: "p4", wave: 1, action: "share", watchDuration: 90, reasoning: "", emotionalResponse: "", source: "deterministic" }
    ];

    const metrics = computeWaveMetrics(1, actions);
    expect(metrics.engagementScore).toBe(18);
    expect(metrics.engagementRate).toBe(4.5);
    expect(metrics.shareRate).toBe(0.25);
  });

  it("handles empty wave safely", () => {
    const metrics = computeWaveMetrics(2, []);
    expect(metrics.engagementRate).toBe(0);
    expect(metrics.avgWatchDuration).toBe(0);
  });

  it("builds content-aware deterministic comments", () => {
    const persona: Persona = {
      id: "persona-test",
      name: "AI Explorer",
      age: 26,
      interests: ["ai", "automation"],
      scrollBehavior: "moderate",
      engagementStyle: "commenter",
      attentionSpan: 17,
      contentPreferences: ["live demos"],
      followerCount: 1400
    };
    const analysis: VideoAnalysis = {
      id: "analysis-test",
      summary: "AI launch demo with a bold first frame and clear workflow payoff.",
      contentCategory: "creator-education",
      hookScore: 82,
      scrollStoppingScore: 84,
      visualSignals: ["Bold title card"],
      visualNarrative: "AI launch demo with a bold title card and workflow payoff.",
      textOverlays: ["AI workflow"],
      audioSignals: ["Clear spoken narrative"],
      transcript: "This AI workflow saves creators an hour before posting.",
      transcriptStatus: "spoken",
      targetAudience: getTargetAudience("developers"),
      recommendations: [],
      metadata: {
        filename: "demo.mp4",
        mimeType: "video/mp4",
        sizeBytes: 100,
        durationSeconds: 12,
        width: 1080,
        height: 1920,
        hasAudio: true,
        sampledFrameCount: 12,
        visualCoverage: "full-video-storyboard"
      },
      createdAt: "2026-06-14T00:00:00.000Z",
      source: "live"
    };

    const comment = buildPersonaComment(persona, analysis, 0.8);

    expect(["Super clear breakdown.", "This is actually useful.", "Would watch a part two."]).not.toContain(comment);
    expect(comment).toMatch(/ai|creator education|bold title card|workflow/i);
  });
});
