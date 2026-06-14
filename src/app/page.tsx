"use client";

import React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { VideoUpload } from "@/components/VideoUpload";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { AIPipelineStatus } from "@/components/AIPipelineStatus";
import { SimulationView } from "@/components/SimulationView";
import { ResultsPanel } from "@/components/ResultsPanel";
import { RecommendationCard } from "@/components/RecommendationCard";
import { RedTeamPanel } from "@/components/RedTeamPanel";
import { ReasoningPanel } from "@/components/ReasoningPanel";
import { WhatIfPanel } from "@/components/WhatIfPanel";
import { CommentFeed } from "@/components/CommentFeed";
import { ActionFeed } from "@/components/ActionFeed";
import { LiveNetworkGraph } from "@/components/LiveNetworkGraph";
import { UploadedVideoPreview, VideoPreviewPanel } from "@/components/VideoPreviewPanel";
import { useSimulationStore } from "@/store/simulation-store";
import type { AnalyzeResponse, SSEEvent, TargetAudienceId } from "@/types";

export default function HomePage(): JSX.Element {
  const {
    phase,
    analysis,
    metadata,
    frames,
    waveMetrics,
    actions,
    personas,
    messages,
    redTeamFlags,
    result,
    error,
    setUploading,
    setAnalysis,
    addAction,
    addWaveMetrics,
    addMessage,
    addRedTeamFlag,
    setComplete,
    setError,
    reset
  } = useSimulationStore();
  const [videoPreview, setVideoPreview] = useState<UploadedVideoPreview | null>(null);
  const [whatIfRunning, setWhatIfRunning] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleVideoPreviewChange = useCallback((preview: UploadedVideoPreview | null) => {
    setVideoPreview(preview);
  }, []);

  function closeStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  async function handleSubmit(input: { file?: File; demoMode: boolean; targetAudienceId: TargetAudienceId }) {
    try {
      closeStream();
      setUploading();
      const body = new FormData();
      body.set("demoMode", String(input.demoMode));
      body.set("targetAudienceId", input.targetAudienceId);
      if (input.file) {
        body.set("video", input.file);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Analyze request failed.");
      }

      const payload = (await response.json()) as AnalyzeResponse;
      setAnalysis(payload.analysis, payload.frames);
      connectStream(payload.analysisId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error while starting simulation.");
    }
  }

  function connectStream(analysisId: string) {
    closeStream();
    const source = new EventSource(`/api/simulate/stream?analysisId=${analysisId}`);
    eventSourceRef.current = source;

    const eventTypes: SSEEvent["type"][] = [
      "analysis.ready",
      "wave.started",
      "agent.action",
      "peer.share",
      "redTeam.flag",
      "wave.summary",
      "simulation.complete",
      "simulation.error"
    ];

    eventTypes.forEach((eventName) => {
      source.addEventListener(eventName, (event) => {
        const parsed = JSON.parse((event as MessageEvent).data) as SSEEvent;
        if (parsed.message) {
          addMessage(parsed.message);
        }
        if (parsed.action) {
          addAction(parsed.action, parsed.persona, parsed.ts);
        }
        if (parsed.metrics) {
          addWaveMetrics(parsed.metrics);
        }
        if (parsed.type === "redTeam.flag" && parsed.redTeamFlag) {
          addRedTeamFlag(parsed.redTeamFlag);
        }
        if (parsed.type === "simulation.complete" && parsed.result) {
          setComplete(parsed.result);
          source.close();
        }
        if (parsed.type === "simulation.error") {
          setError(parsed.message || "Simulation stream failed.");
          source.close();
        }
      });
    });

    source.onerror = () => {
      setError("Stream disconnected unexpectedly.");
      source.close();
    };
  }

  function handleReset() {
    closeStream();
    setPreviousScore(null);
    reset();
  }

  async function handleWhatIf(tweaks: { hookScore?: number; category?: string }) {
    if (!analysis || !result) return;
    setWhatIfRunning(true);
    setPreviousScore(result.breakoutScore);
    try {
      const res = await fetch("/api/simulate/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id, ...tweaks })
      });
      if (res.ok) {
        const data = await res.json() as { breakoutScore: number };
        setComplete({ ...result, breakoutScore: data.breakoutScore });
      }
    } finally {
      setWhatIfRunning(false);
    }
  }

  const comments = useMemo(
    () => actions.map((action) => action.comment).filter((value): value is string => Boolean(value)).slice(-12),
    [actions]
  );
  const busy = phase === "uploading" || phase === "simulating";
  const isActive = phase !== "idle";

  return (
    <main className="min-h-screen max-w-[1800px] mx-auto px-6 py-8 md:px-10 lg:px-12">
      {/* Minimal Header */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-10 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-teal to-accent-gold flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Breakout Simulator
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-xs text-zinc-400"
            >
              <div className={`h-1.5 w-1.5 rounded-full ${
                phase === "complete" ? "bg-accent-lime" :
                phase === "error" ? "bg-accent-rose" :
                "bg-accent-teal animate-pulse"
              }`} />
              <span>{phase === "uploading" ? "Analyzing" : phase === "simulating" ? `${actions.length} events` : phase}</span>
            </motion.div>
          )}
          {isActive && (
            <Link
              href="/stats"
              className="text-xs text-zinc-500 hover:text-accent-teal transition-colors"
            >
              Stats ↗
            </Link>
          )}
          {isActive && (
            <button
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={handleReset}
              type="button"
            >
              Reset
            </button>
          )}
        </div>
      </motion.header>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-8 rounded-lg border border-accent-rose/20 bg-accent-rose/5 px-4 py-3 text-sm text-zinc-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle State — Clean centered upload */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto mt-16"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2">Pre-Flight Content Evaluator</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Upload a short video and 260 AI personas will stress-test how it spreads — showing exactly who will share it, who will skip it, and why.
              </p>
            </div>
            <VideoUpload onSubmit={handleSubmit} onVideoPreviewChange={handleVideoPreviewChange} busy={busy} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active State — Dashboard */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Top row: Pipeline + Upload (compact) + Preview */}
            <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px] mb-6">
              {/* Left: Pipeline + compact upload */}
              <div className="space-y-4">
                <AIPipelineStatus phase={phase} analysis={analysis} metadata={metadata} frames={frames} messages={messages} actionCount={actions.length} />
                {phase !== "complete" && (
                  <VideoUpload onSubmit={handleSubmit} onVideoPreviewChange={handleVideoPreviewChange} busy={busy} />
                )}
                {/* Red Team Panel — shows as soon as flags arrive */}
                <RedTeamPanel flags={redTeamFlags} result={result} />
              </div>

              {/* Center: The main show — Network Graph */}
              <LiveNetworkGraph actions={actions} personas={personas} metrics={waveMetrics} />

              {/* Right: Action Feed */}
              <ActionFeed actions={actions} personas={personas} targetAudience={analysis?.targetAudience} />
            </div>

            {/* Middle row: Analysis + Reasoning */}
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid gap-6 lg:grid-cols-[1fr_1fr] mb-6"
              >
                <AnalysisPanel analysis={analysis} metadata={metadata} messages={messages} frames={frames} />
                <div className="space-y-6">
                  <RecommendationCard analysis={analysis} result={result} />
                  <SimulationView metrics={waveMetrics} />
                  {result && <ResultsPanel result={result} />}
                  {result && analysis && (
                    <WhatIfPanel
                      analysis={analysis}
                      result={result}
                      onRerun={handleWhatIf}
                      isRunning={whatIfRunning}
                      previousScore={previousScore}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Bottom: Reasoning + Comments */}
            {(actions.length > 0 || result) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-6 lg:grid-cols-[1fr_1fr]"
              >
                <ReasoningPanel actions={actions} personas={personas} />
                <CommentFeed comments={comments} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
