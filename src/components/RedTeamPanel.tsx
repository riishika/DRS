"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RedTeamFlag, SimulationResult } from "@/types";

type RedTeamPanelProps = {
  flags: RedTeamFlag[];
  result: SimulationResult | null;
};

const SEVERITY_STYLES = {
  high: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-500" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-500" },
  low: { bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500" }
};

export function RedTeamPanel({ flags, result }: RedTeamPanelProps): JSX.Element {
  if (flags.length === 0) return <></>;

  const riskScore = result?.riskScore ?? flags.reduce((s, f) => s + (f.severity === "high" ? 30 : f.severity === "medium" ? 18 : 8), 0);
  const riskLevel = riskScore >= 50 ? "High" : riskScore >= 25 ? "Medium" : "Low";
  const riskColor = riskScore >= 50 ? "text-red-400" : riskScore >= 25 ? "text-amber-400" : "text-accent-lime";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-red-500/10 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-zinc-300">Red Team Guardian</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-mono ${riskColor}`}>{riskScore}</span>
          <span className="text-[10px] text-zinc-500">/100 risk</span>
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 ${
        riskScore >= 50 ? "bg-red-500/10" : riskScore >= 25 ? "bg-amber-500/10" : "bg-accent-lime/10"
      }`}>
        <div className={`h-1.5 w-1.5 rounded-full ${
          riskScore >= 50 ? "bg-red-500 animate-pulse" : riskScore >= 25 ? "bg-amber-500" : "bg-accent-lime"
        }`} />
        <span className={`text-[10px] font-medium ${riskColor}`}>{riskLevel} Risk</span>
      </div>

      {/* Flags */}
      <div className="space-y-2">
        <AnimatePresence>
          {flags.map((flag, i) => {
            const style = SEVERITY_STYLES[flag.severity];
            return (
              <motion.div
                key={`${flag.category}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-lg ${style.bg} border ${style.border} p-3`}
              >
                <div className="flex items-start gap-2">
                  <div className={`h-2 w-2 rounded-full ${style.dot} mt-1.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${style.text}`}>
                        {flag.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-[9px] text-zinc-600">— {flag.agent}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{flag.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
