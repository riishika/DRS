import type { SimulationResult, VideoAnalysis } from "@/types";

const analyses = new Map<string, VideoAnalysis>();
const simulationResults = new Map<string, SimulationResult>();

// Persist across hot reloads in development
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as {
    __virality_analyses?: Map<string, VideoAnalysis>;
    __virality_results?: Map<string, SimulationResult>;
  };
  if (!g.__virality_analyses) g.__virality_analyses = analyses;
  if (!g.__virality_results) g.__virality_results = simulationResults;
}

function getAnalysesMap(): Map<string, VideoAnalysis> {
  const g = globalThis as unknown as { __virality_analyses?: Map<string, VideoAnalysis> };
  return g.__virality_analyses || analyses;
}

function getResultsMap(): Map<string, SimulationResult> {
  const g = globalThis as unknown as { __virality_results?: Map<string, SimulationResult> };
  return g.__virality_results || simulationResults;
}

export function setAnalysis(analysis: VideoAnalysis): void {
  getAnalysesMap().set(analysis.id, analysis);
}

export function getAnalysis(id: string): VideoAnalysis | undefined {
  return getAnalysesMap().get(id);
}

export function setSimulationResult(result: SimulationResult): void {
  getResultsMap().set(result.analysisId, result);
}

export function getSimulationResult(analysisId: string): SimulationResult | undefined {
  return getResultsMap().get(analysisId);
}
