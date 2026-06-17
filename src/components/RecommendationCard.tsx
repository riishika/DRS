"use client";

import React from "react";
import { motion } from "framer-motion";
import { normalizeVideoAnalysis } from "@/lib/content-context";
import { getTargetAudience } from "@/lib/target-audiences";
import type { SimulationResult, VideoAnalysis } from "@/types";

type RecommendationCardProps = {
  analysis: VideoAnalysis | null;
  result: SimulationResult | null;
};

function buildPreliminaryTargetRecommendations(analysis: VideoAnalysis): string[] {
  const target = analysis.targetAudience || getTargetAudience("general");
  const firstInterest = target.interests[0] || target.label.toLowerCase();
  const firstAngle = target.recommendationAngles[0] || "a clear audience-specific payoff";
  const recs = [
    `Make the first frame unmistakably for ${target.label}: show or name ${firstInterest}.`,
    `Edit the opening around ${firstAngle}, then reveal the payoff before second 3.`
  ];

  if (!analysis.transcript.trim() && analysis.textOverlays.length === 0) {
    recs.push(`Add on-screen text so ${target.label} understands the hook without sound.`);
  }

  return [...recs, ...analysis.recommendations].slice(0, 5);
}

export function RecommendationCard({ analysis, result }: RecommendationCardProps): JSX.Element {
  if (!analysis && !result) return <></>;

  const safeAnalysis = analysis ? normalizeVideoAnalysis(analysis) : null;
  const targetAudience = result?.targetAudience || safeAnalysis?.targetAudience || getTargetAudience("general");
  const recommendations = result?.targetAudienceRecommendations?.length
    ? result.targetAudienceRecommendations
    : safeAnalysis
      ? buildPreliminaryTargetRecommendations(safeAnalysis)
      : result?.topRecommendations || [];
  const isFinal = Boolean(result?.targetAudienceRecommendations?.length);

  if (recommendations.length === 0) return <></>;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-300">Edit Recommendations</h3>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            {isFinal ? "Based on target-group simulation behavior" : "Preliminary edits before the full simulation finishes"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent-teal/10 px-2 py-0.5 text-[10px] font-medium text-accent-teal">
          {targetAudience.label}
        </span>
      </div>

      <div className="space-y-2">
        {recommendations.map((item, index) => (
          <motion.div
            key={`${item}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="rounded-lg border border-accent-teal/10 bg-accent-teal/[0.04] px-3 py-2"
          >
            <p className="text-[11px] leading-relaxed text-zinc-300">
              <span className="mr-2 font-mono text-[10px] text-accent-teal">{index + 1}</span>
              {item}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
