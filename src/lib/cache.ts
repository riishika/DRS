import type { SimulationResult, VideoAnalysis } from "@/types";
import { normalizeVideoAnalysis } from "@/lib/content-context";

const analyses = new Map<string, VideoAnalysis>();
const simulationResults = new Map<string, SimulationResult>();

// Persist across hot reloads in development
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as {
    __breakout_analyses?: Map<string, VideoAnalysis>;
    __breakout_results?: Map<string, SimulationResult>;
  };
  if (!g.__breakout_analyses) g.__breakout_analyses = analyses;
  if (!g.__breakout_results) g.__breakout_results = simulationResults;
}

function getAnalysesMap(): Map<string, VideoAnalysis> {
  const g = globalThis as unknown as { __breakout_analyses?: Map<string, VideoAnalysis> };
  return g.__breakout_analyses || analyses;
}

function getResultsMap(): Map<string, SimulationResult> {
  const g = globalThis as unknown as { __breakout_results?: Map<string, SimulationResult> };
  return g.__breakout_results || simulationResults;
}

export function setAnalysis(analysis: VideoAnalysis): void {
  getAnalysesMap().set(analysis.id, normalizeVideoAnalysis(analysis));
}

export function getAnalysis(id: string): VideoAnalysis | undefined {
  const analysis = getAnalysesMap().get(id);
  return analysis ? normalizeVideoAnalysis(analysis) : undefined;
}

export function setSimulationResult(result: SimulationResult): void {
  getResultsMap().set(result.analysisId, result);
}

export function getSimulationResult(analysisId: string): SimulationResult | undefined {
  return getResultsMap().get(analysisId);
}
