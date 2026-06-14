"use client";

import { create } from "zustand";
import type { AgentAction, Persona, PersonaAction, RedTeamFlag, SimulationResult, VideoAnalysis, VideoMetadata, WaveMetrics } from "@/types";

type Phase = "idle" | "uploading" | "simulating" | "complete" | "error";

type SimulationState = {
  phase: Phase;
  analysisId: string | null;
  analysis: VideoAnalysis | null;
  metadata: VideoMetadata | null;
  frames: string[];
  waveMetrics: WaveMetrics[];
  actions: PersonaAction[];
  personas: Record<string, Persona>;
  messages: string[];
  redTeamFlags: RedTeamFlag[];
  result: SimulationResult | null;
  error: string | null;
  setUploading: () => void;
  setAnalysis: (analysis: VideoAnalysis, frames?: string[]) => void;
  addAction: (action: AgentAction, persona: Persona | undefined, receivedAt: string) => void;
  addWaveMetrics: (metrics: WaveMetrics) => void;
  addMessage: (message: string) => void;
  addRedTeamFlag: (flag: RedTeamFlag) => void;
  setComplete: (result: SimulationResult) => void;
  setError: (error: string) => void;
  reset: () => void;
};

function freshState() {
  return {
    phase: "idle" as Phase,
    analysisId: null as string | null,
    analysis: null as VideoAnalysis | null,
    metadata: null as VideoMetadata | null,
    frames: [] as string[],
    waveMetrics: [] as WaveMetrics[],
    actions: [] as PersonaAction[],
    personas: {} as Record<string, Persona>,
    messages: [] as string[],
    redTeamFlags: [] as RedTeamFlag[],
    result: null as SimulationResult | null,
    error: null as string | null
  };
}

export const useSimulationStore = create<SimulationState>((set) => ({
  ...freshState(),
  setUploading: () => set({ ...freshState(), phase: "uploading" }),
  setAnalysis: (analysis, frames) => set({ phase: "simulating", analysisId: analysis.id, analysis, metadata: analysis.metadata, frames: frames || [] }),
  addAction: (action, persona, receivedAt) =>
    set((state) => ({
      actions: [...state.actions, { ...action, receivedAt }],
      personas: persona ? { ...state.personas, [persona.id]: persona } : state.personas
    })),
  addWaveMetrics: (metrics) =>
    set((state) => ({
      waveMetrics: [...state.waveMetrics.filter((item) => item.wave !== metrics.wave), metrics].sort((a, b) => a.wave - b.wave)
    })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages.slice(-20), message] })),
  addRedTeamFlag: (flag) => set((state) => ({ redTeamFlags: [...state.redTeamFlags, flag] })),
  setComplete: (result) => set({ result, phase: "complete" }),
  setError: (error) => set({ phase: "error", error }),
  reset: () => set(freshState())
}));
