"use client";

import React from "react";
import { motion } from "framer-motion";
import type { VideoAnalysis, VideoMetadata } from "@/types";

type AIPipelineStatusProps = {
  phase: string;
  analysis: VideoAnalysis | null;
  metadata: VideoMetadata | null;
  frames: string[];
  messages: string[];
  actionCount: number;
};

type StepStatus = "pending" | "active" | "done" | "skipped";

export function AIPipelineStatus({ phase, analysis, metadata, frames, actionCount }: AIPipelineStatusProps): JSX.Element {
  const steps: { label: string; status: StepStatus; detail?: string }[] = [];

  if (phase === "idle") return <></>;

  const isAnalyzing = phase === "uploading";
  const isSimulating = phase === "simulating";
  const isDone = phase === "complete";

  steps.push({
    label: "Video Processing",
    status: metadata ? "done" : isAnalyzing ? "active" : "pending",
    detail: metadata ? `${metadata.sampledFrameCount} frames · ${metadata.durationSeconds.toFixed(0)}s` : undefined
  });
  steps.push({
    label: "GPT-4o Vision",
    status: analysis ? "done" : (metadata && isAnalyzing) ? "active" : "pending",
    detail: analysis ? `${analysis.contentCategory} · ${analysis.hookScore}/100` : undefined
  });
  steps.push({
    label: "Whisper Audio",
    status: analysis ? (analysis.transcript && analysis.transcript.length > 5 ? "done" : "skipped") : (metadata && isAnalyzing) ? "active" : "pending",
    detail: analysis?.transcript && analysis.transcript.length > 5 ? `${analysis.transcript.split(/\s+/).length} words` : undefined
  });
  steps.push({
    label: "260 Persona Agents",
    status: isDone ? "done" : isSimulating ? "active" : "pending",
    detail: actionCount > 0 ? `${actionCount} decisions` : undefined
  });

  return (
    <section className="glass-strong rounded-2xl p-5">
      <h2 className="text-sm font-medium text-zinc-300 mb-3">AI Pipeline</h2>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            {/* Status indicator */}
            <div className="relative flex-shrink-0">
              {step.status === "done" && (
                <div className="h-4 w-4 rounded-full bg-accent-lime/15 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-accent-lime"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              )}
              {step.status === "active" && (
                <div className="h-4 w-4 rounded-full bg-accent-teal/15 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse" />
                </div>
              )}
              {step.status === "pending" && (
                <div className="h-4 w-4 rounded-full bg-surface-300/30 flex items-center justify-center">
                  <div className="h-1 w-1 rounded-full bg-zinc-700" />
                </div>
              )}
              {step.status === "skipped" && (
                <div className="h-4 w-4 rounded-full bg-surface-300/30 flex items-center justify-center">
                  <div className="h-[1px] w-2 bg-zinc-700" />
                </div>
              )}
            </div>

            {/* Label + detail */}
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] ${
                step.status === "active" ? "text-accent-teal font-medium" :
                step.status === "done" ? "text-zinc-300" :
                "text-zinc-600"
              }`}>
                {step.label}
              </p>
            </div>
            {step.detail && (
              <span className="text-[10px] text-zinc-600 flex-shrink-0">{step.detail}</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Models */}
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-wrap gap-1.5">
        <span className="text-[9px] text-zinc-600 px-2 py-0.5 rounded-full bg-surface-200/50">GPT-4o</span>
        <span className="text-[9px] text-zinc-600 px-2 py-0.5 rounded-full bg-surface-200/50">Whisper</span>
        <span className="text-[9px] text-zinc-600 px-2 py-0.5 rounded-full bg-surface-200/50">GPT-4.1</span>
      </div>
    </section>
  );
}
