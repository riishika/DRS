"use client";

import React from "react";
import { motion } from "framer-motion";
import { getTargetAudience } from "@/lib/target-audiences";
import type { SimulationResult } from "@/types";

type ResultsPanelProps = {
  result: SimulationResult | null;
};

export function ResultsPanel({ result }: ResultsPanelProps): JSX.Element {
  if (!result) return <></>;

  const scoreColor = result.breakoutScore >= 70 ? "text-accent-lime" : result.breakoutScore >= 40 ? "text-accent-gold" : "text-accent-rose";
  const riskColor = result.riskScore >= 50 ? "text-red-400" : result.riskScore >= 25 ? "text-amber-400" : "text-accent-lime";
  const targetAudience = result.targetAudience || getTargetAudience("general");
  const targetAudienceScore = typeof result.targetAudienceScore === "number" ? result.targetAudienceScore : result.breakoutScore;
  const targetAudienceRecommendations = result.targetAudienceRecommendations?.length
    ? result.targetAudienceRecommendations
    : result.topRecommendations;
  const targetColor = targetAudienceScore >= 70 ? "text-accent-lime" : targetAudienceScore >= 40 ? "text-accent-gold" : "text-accent-rose";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300">Final Assessment</h3>
        <span className="text-[10px] text-accent-lime bg-accent-lime/10 px-2 py-0.5 rounded-full">Complete</span>
      </div>

      {/* Dual Scores */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={`text-4xl font-bold ${scoreColor}`}
          >
            {result.breakoutScore}
          </motion.p>
          <p className="text-[10px] text-zinc-600 mt-1">Breakout /100</p>
        </div>
        <div className="text-center">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.25 }}
            className={`text-4xl font-bold ${targetColor}`}
          >
            {targetAudienceScore}
          </motion.p>
          <p className="text-[10px] text-zinc-600 mt-1">Target /100</p>
        </div>
        <div className="text-center">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className={`text-4xl font-bold ${riskColor}`}
          >
            {result.riskScore}
          </motion.p>
          <p className="text-[10px] text-zinc-600 mt-1">Risk /100</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-surface-50/40 p-2.5">
          <p className="text-[10px] text-zinc-600">Target</p>
          <p className="text-xs text-zinc-200 mt-0.5">{targetAudience.label}</p>
        </div>
        <div className="rounded-lg bg-surface-50/40 p-2.5">
          <p className="text-[10px] text-zinc-600">Engagement</p>
          <p className="text-xs text-accent-teal mt-0.5">{(result.totalMetrics.engagementRate * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-surface-50/40 p-2.5">
          <p className="text-[10px] text-zinc-600">Share Rate</p>
          <p className="text-xs text-accent-teal mt-0.5">{(result.totalMetrics.shareRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mb-4">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Target Group Recommendations</p>
        <div className="space-y-1.5">
          {targetAudienceRecommendations.map((item, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.1 }}
              className="text-[11px] text-zinc-300 leading-relaxed pl-3 border-l border-accent-teal/25"
            >
              {item}
            </motion.p>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Recommendations</p>
        <div className="space-y-1.5">
          {result.topRecommendations.map((item, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-[11px] text-zinc-400 leading-relaxed pl-3 border-l border-white/[0.06]"
            >
              {item}
            </motion.p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
