"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentActionType, Persona, PersonaAction } from "@/types";

type ReasoningPanelProps = {
  actions: PersonaAction[];
  personas: Record<string, Persona>;
};

const ACTION_COLORS: Record<AgentActionType, string> = {
  skip: "#6b7280",
  like: "#f59e0b",
  comment: "#ef4444",
  save: "#22c55e",
  share: "#06b6d4"
};

export function ReasoningPanel({ actions, personas }: ReasoningPanelProps): JSX.Element {
  const [selectedFilter, setSelectedFilter] = useState<AgentActionType | "all">("all");

  const grouped = useMemo(() => {
    const groups: Record<AgentActionType, { action: PersonaAction; persona: Persona | undefined }[]> = {
      share: [], comment: [], save: [], like: [], skip: []
    };
    for (const a of actions) {
      groups[a.action].push({ action: a, persona: personas[a.personaId] });
    }
    return groups;
  }, [actions, personas]);

  const insights = useMemo(() => {
    const results: string[] = [];

    const shareReasons = grouped.share.slice(0, 3).map((s) => s.action.reasoning).filter(Boolean);
    if (shareReasons.length > 0) {
      results.push(`Sharers loved it because: "${shareReasons[0]}"`);
    }

    const skipCount = grouped.skip.length;
    const totalCount = actions.length;
    if (skipCount > totalCount * 0.6) {
      const topSkipReason = grouped.skip[0]?.action.reasoning;
      results.push(`${Math.round(skipCount / totalCount * 100)}% skipped — "${topSkipReason}"`);
    }

    const engagedPersonas = actions.filter((a) => a.action !== "skip");
    if (engagedPersonas.length > 0) {
      const interests = engagedPersonas.flatMap((a) => personas[a.personaId]?.interests || []);
      const countMap = new Map<string, number>();
      for (const i of interests) countMap.set(i, (countMap.get(i) || 0) + 1);
      const top = [...countMap.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) results.push(`Strongest interest alignment: "${top[0]}" (${top[1]} engaged personas)`);
    }

    return results;
  }, [grouped, actions, personas]);

  const filteredActions = useMemo(() => {
    if (selectedFilter === "all") {
      return [...grouped.share, ...grouped.comment, ...grouped.save, ...grouped.like, ...grouped.skip.slice(0, 5)];
    }
    return grouped[selectedFilter];
  }, [grouped, selectedFilter]);

  if (actions.length === 0) return <></>;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-teal">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <h3 className="text-sm font-medium text-zinc-300">Agent Reasoning</h3>
        </div>
        <span className="text-[10px] text-zinc-600">{actions.filter((a) => a.reasoning).length} traces</span>
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg bg-accent-teal/5 border border-accent-teal/10 px-3 py-2"
            >
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                <span className="text-accent-teal font-medium mr-1">Insight:</span>
                {insight}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(["all", "share", "comment", "like", "save", "skip"] as const).map((filter) => {
          const count = filter === "all" ? actions.length : grouped[filter].length;
          if (count === 0 && filter !== "all") return null;
          return (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                selectedFilter === filter
                  ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/30"
                  : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300"
              }`}
              type="button"
            >
              {filter} ({count})
            </button>
          );
        })}
      </div>

      {/* Reasoning traces */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {filteredActions.slice(0, 15).map(({ action, persona }, i) => (
            <motion.div
              key={`${action.personaId}-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-lg bg-surface-50/30 border border-white/[0.03] p-2.5"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ACTION_COLORS[action.action] }} />
                <span className="text-[11px] font-medium text-zinc-200">{persona?.name || "Persona"}</span>
                <span className="text-[9px] text-zinc-600 ml-auto">{action.action} · {action.watchDuration}% watched</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed pl-4 italic">
                &ldquo;{action.reasoning}&rdquo;
              </p>
              {action.emotionalResponse && (
                <p className="text-[9px] text-zinc-600 pl-4 mt-0.5">
                  Feeling: {action.emotionalResponse}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
