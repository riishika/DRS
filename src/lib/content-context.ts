import type { VideoAnalysis } from "@/types";
import { getTargetAudience } from "@/lib/target-audiences";

export function normalizeVideoAnalysis(analysis: VideoAnalysis): VideoAnalysis {
  const legacy = analysis as VideoAnalysis & {
    visualNarrative?: string;
    textOverlays?: string[];
    audioSignals?: string[];
    visualSignals?: string[];
    transcriptStatus?: VideoAnalysis["transcriptStatus"];
    targetAudience?: VideoAnalysis["targetAudience"];
    recommendations?: string[];
  };

  return {
    ...analysis,
    visualNarrative: legacy.visualNarrative || analysis.summary || "Visual analysis available.",
    textOverlays: Array.isArray(legacy.textOverlays) ? legacy.textOverlays : [],
    visualSignals: Array.isArray(legacy.visualSignals) ? legacy.visualSignals : [],
    audioSignals: Array.isArray(legacy.audioSignals) ? legacy.audioSignals : [],
    transcript: typeof analysis.transcript === "string" ? analysis.transcript : "",
    transcriptStatus: legacy.transcriptStatus || (analysis.transcript ? "spoken" : "unavailable"),
    targetAudience: legacy.targetAudience || getTargetAudience("general"),
    recommendations: Array.isArray(legacy.recommendations) ? legacy.recommendations : []
  };
}

export function hasUsableTranscript(analysis: Pick<VideoAnalysis, "transcript" | "transcriptStatus">): boolean {
  return Boolean(analysis.transcript.trim()) && ["spoken", "visual_text"].includes(analysis.transcriptStatus);
}

export function isSpeechlessVideo(analysis: Pick<VideoAnalysis, "metadata" | "transcriptStatus">): boolean {
  return analysis.metadata.durationSeconds > 0 && ["no_speech", "no_audio", "unavailable"].includes(analysis.transcriptStatus);
}

export function buildContentContext(analysis: VideoAnalysis): string {
  const safeAnalysis = normalizeVideoAnalysis(analysis);
  return [
    safeAnalysis.summary,
    safeAnalysis.contentCategory,
    safeAnalysis.visualNarrative,
    safeAnalysis.visualSignals.join(" "),
    safeAnalysis.textOverlays.join(" "),
    safeAnalysis.audioSignals.join(" "),
    safeAnalysis.transcript
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildSimulationBrief(analysis: VideoAnalysis): {
  summary: string;
  contentCategory: string;
  hookScore: number;
  scrollStoppingScore: number;
  visualNarrative: string;
  visualSignals: string[];
  textOverlays: string[];
  audioSignals: string[];
  targetAudience: VideoAnalysis["targetAudience"];
  transcriptStatus: VideoAnalysis["transcriptStatus"];
  transcript?: string;
} {
  const safeAnalysis = normalizeVideoAnalysis(analysis);
  return {
    summary: safeAnalysis.summary,
    contentCategory: safeAnalysis.contentCategory,
    hookScore: safeAnalysis.hookScore,
    scrollStoppingScore: safeAnalysis.scrollStoppingScore,
    visualNarrative: safeAnalysis.visualNarrative,
    visualSignals: safeAnalysis.visualSignals.slice(0, 8),
    textOverlays: safeAnalysis.textOverlays.slice(0, 8),
    audioSignals: safeAnalysis.audioSignals.slice(0, 8),
    targetAudience: safeAnalysis.targetAudience,
    transcriptStatus: safeAnalysis.transcriptStatus,
    transcript: hasUsableTranscript(safeAnalysis) ? safeAnalysis.transcript.slice(0, 300) : undefined
  };
}
