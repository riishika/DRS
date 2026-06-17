"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { SimulationResult, VideoAnalysis } from "@/types";

type WhatIfPanelProps = {
  analysis: VideoAnalysis;
  result: SimulationResult;
  onRerun: (tweaks: { hookScore?: number; category?: string; summary?: string }) => void;
  isRunning: boolean;
  previousScore: number | null;
};

const CATEGORY_OPTIONS = [
  "Comedy", "Fitness", "Tech", "Travel", "Food",
  "Gaming", "Music", "Education", "Lifestyle", "Business"
];

export function WhatIfPanel({ analysis, result, onRerun, isRunning, previousScore }: WhatIfPanelProps): JSX.Element {
  const [hookScore, setHookScore] = useState(analysis.hookScore);
  const [category, setCategory] = useState(analysis.contentCategory);

  const hasChanges = hookScore !== analysis.hookScore || category !== analysis.contentCategory;
  const delta = previousScore !== null ? result.breakoutScore - previousScore : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-gold">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
          <h3 className="text-sm font-medium text-zinc-300">What-If Stress Test</h3>
        </div>
        {delta !== null && (
          <span className={`text-xs font-mono font-bold ${delta >= 0 ? "text-accent-lime" : "text-accent-rose"}`}>
            {delta >= 0 ? "+" : ""}{delta} pts
          </span>
        )}
      </div>

      <p className="text-[10px] text-zinc-600 mb-4">
        Tweak parameters and re-run Wave 1 (10 agents) to see how changes affect your score.
      </p>

      {/* Hook Score Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Hook Strength</label>
          <span className="text-xs font-mono text-accent-gold">{hookScore}/100</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={hookScore}
          onChange={(e) => setHookScore(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-surface-300/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-gold [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-zinc-700 mt-1">
          <span>Weak</span>
          <span>Original: {analysis.hookScore}</span>
          <span>Strong</span>
        </div>
      </div>

      {/* Category selector */}
      <div className="mb-4">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Content Category</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                category.toLowerCase() === cat.toLowerCase()
                  ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/30"
                  : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300"
              }`}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Re-run button */}
      <motion.button
        whileHover={{ scale: isRunning ? 1 : 1.01 }}
        whileTap={{ scale: isRunning ? 1 : 0.98 }}
        onClick={() => onRerun({ hookScore, category })}
        disabled={!hasChanges || isRunning}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
          hasChanges && !isRunning
            ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/30 hover:bg-accent-gold/30"
            : "bg-surface-200 text-zinc-600 border border-zinc-800"
        } disabled:opacity-40`}
        type="button"
      >
        {isRunning ? "Re-running Wave 1..." : hasChanges ? "Re-run Simulation" : "Adjust parameters above"}
      </motion.button>

      {/* Previous comparison */}
      {previousScore !== null && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">Previous score</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">{previousScore}</span>
            <span className="text-[10px] text-zinc-700">→</span>
            <span className={`text-xs font-mono font-bold ${result.breakoutScore > previousScore ? "text-accent-lime" : "text-accent-rose"}`}>
              {result.breakoutScore}
            </span>
          </div>
        </div>
      )}
    </motion.section>
  );
}
