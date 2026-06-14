"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hasUsableTranscript, isSpeechlessVideo, normalizeVideoAnalysis } from "@/lib/content-context";
import type { VideoAnalysis, VideoMetadata } from "@/types";

type AnalysisPanelProps = {
  analysis: VideoAnalysis | null;
  metadata: VideoMetadata | null;
  messages: string[];
  frames: string[];
};

export function AnalysisPanel({ analysis, metadata, messages, frames }: AnalysisPanelProps): JSX.Element {
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null);
  const safeAnalysis = analysis ? normalizeVideoAnalysis(analysis) : null;
  const transcript = safeAnalysis?.transcript.trim();
  const hasTranscript = safeAnalysis ? hasUsableTranscript(safeAnalysis) : false;
  const isVisualFallback = safeAnalysis ? isSpeechlessVideo(safeAnalysis) : false;

  return (
    <section className="glass-strong rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Content Analysis</h3>
        {safeAnalysis && (
          <span className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-[10px] font-medium text-accent-gold">
            Live AI
          </span>
        )}
      </div>

      {/* Primary: AI Summary + Scores (most important info first) */}
      {safeAnalysis && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed">{safeAnalysis.summary}</p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-zinc-600">Category</span>
              <span className="text-[11px] text-white font-medium bg-surface-200/60 px-2 py-0.5 rounded">{safeAnalysis.contentCategory}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Hook</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-surface-300/50 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-gold/60 to-accent-gold" style={{ width: `${safeAnalysis.hookScore}%` }} />
                </div>
                <span className="text-[11px] font-mono text-accent-gold">{safeAnalysis.hookScore}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storyboard — horizontal scroll strip */}
      {frames.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
            Storyboard · {frames.length} frames
          </p>

          {/* Expanded frame */}
          <AnimatePresence>
            {expandedFrame !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2"
              >
                <div className="relative aspect-video max-h-[200px] rounded-lg overflow-hidden border border-accent-teal/30">
                  <img
                    src={frames[expandedFrame]}
                    alt={`Frame ${expandedFrame + 1}`}
                    className="h-full w-full object-contain bg-black"
                  />
                  <button
                    onClick={() => setExpandedFrame(null)}
                    className="absolute top-2 right-2 h-5 w-5 rounded bg-black/60 text-white text-[10px] flex items-center justify-center hover:bg-black/80"
                    type="button"
                  >✕</button>
                  <div className="absolute bottom-2 left-2 text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                    Frame {expandedFrame + 1} of {frames.length}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Horizontal scrollable strip */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {frames.map((frame, index) => (
              <button
                key={index}
                onClick={() => setExpandedFrame(expandedFrame === index ? null : index)}
                className={`relative flex-shrink-0 w-12 h-16 rounded-md overflow-hidden border transition-all ${
                  expandedFrame === index
                    ? "border-accent-teal ring-1 ring-accent-teal/30"
                    : "border-white/[0.06] hover:border-white/20"
                }`}
                type="button"
              >
                <img src={frame} alt={`Frame ${index + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-0.5 left-0.5 text-[7px] text-white/70 font-mono">{index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata compact row */}
      {metadata && (
        <div className="flex items-center gap-4 text-[10px] text-zinc-500">
          <span>{metadata.durationSeconds.toFixed(1)}s</span>
          <span>{metadata.width}×{metadata.height}</span>
          <span>{metadata.sampledFrameCount} frames</span>
          <span>{metadata.hasAudio ? "Audio ✓" : "No audio"}</span>
        </div>
      )}

      {/* Transcript */}
      {safeAnalysis && (
        <div className="space-y-3 border-t border-white/[0.04] pt-3">
          {/* Transcript / visual fallback */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-teal">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
              <p className="text-[10px] text-zinc-500">
                {safeAnalysis.transcriptStatus === "visual_text" ? "Detected Text" : isVisualFallback ? "Visual Narrative" : "Transcript"}
              </p>
              {hasTranscript && (
                <span className="text-[9px] text-accent-teal ml-auto">{transcript!.split(/\s+/).length} words</span>
              )}
            </div>
            {hasTranscript ? (
              <p className="text-[11px] text-zinc-400 leading-relaxed italic bg-surface-50/30 rounded-lg px-3 py-2 max-h-20 overflow-auto">
                &ldquo;{transcript}&rdquo;
              </p>
            ) : isVisualFallback && safeAnalysis.visualNarrative ? (
              <p className="text-[11px] text-zinc-400 leading-relaxed bg-surface-50/30 rounded-lg px-3 py-2 max-h-24 overflow-auto">
                {safeAnalysis.visualNarrative}
              </p>
            ) : (
              <p className="text-[10px] text-zinc-600">No spoken transcript detected</p>
            )}
            {safeAnalysis.textOverlays.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {safeAnalysis.textOverlays.map((text) => (
                  <span key={text} className="rounded bg-surface-200/60 px-2 py-0.5 text-[9px] text-zinc-400">
                    {text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Signals as compact pills */}
          <div className="flex flex-wrap gap-1.5">
            {safeAnalysis.visualSignals.map((signal) => (
              <span key={signal} className="rounded-full bg-accent-teal/8 border border-accent-teal/15 px-2 py-0.5 text-[9px] text-accent-teal/80">
                {signal}
              </span>
            ))}
            {safeAnalysis.audioSignals.map((signal) => (
              <span key={signal} className="rounded-full bg-accent-gold/8 border border-accent-gold/15 px-2 py-0.5 text-[9px] text-accent-gold/80">
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live Event Stream */}
      {messages.length > 0 && (
        <div className="border-t border-white/[0.04] pt-3 flex-1 min-h-0">
          <div className="max-h-[200px] overflow-auto space-y-0.5">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.p
                  key={`${message}-${index}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] text-zinc-600 font-mono leading-relaxed"
                >
                  <span className="text-zinc-700 mr-1">›</span> {message}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}
