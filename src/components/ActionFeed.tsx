"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentActionType, Persona, PersonaAction } from "@/types";

type ActionFeedProps = {
  actions: PersonaAction[];
  personas: Record<string, Persona>;
};

const ACTION_DOT: Record<AgentActionType, string> = {
  skip: "bg-zinc-600",
  like: "bg-accent-gold",
  comment: "bg-accent-rose",
  save: "bg-accent-lime",
  share: "bg-accent-teal"
};

export function ActionFeed({ actions, personas }: ActionFeedProps): JSX.Element {
  const latest = actions.slice(-24).reverse();

  return (
    <section className="glass-strong rounded-2xl p-5 max-h-[660px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-300">Live Feed</h2>
        {actions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse" />
            <span className="text-[10px] text-zinc-500">{actions.length}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-1 min-h-0">
        {latest.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Events stream here</p>
        ) : (
          <AnimatePresence initial={false}>
            {latest.map((action) => {
              const persona = personas[action.personaId];
              const isPeerShare = Boolean(action.sharedBy);
              const sharerName = action.sharedBy ? personas[action.sharedBy]?.name : null;
              return (
                <motion.div
                  key={`${action.personaId}-${action.receivedAt}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${
                    isPeerShare ? "bg-accent-teal/[0.03] hover:bg-accent-teal/[0.06]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${ACTION_DOT[action.action]}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-zinc-300 truncate block">
                      {isPeerShare && (
                        <span className="text-accent-teal text-[9px] mr-1">↗</span>
                      )}
                      <span className="font-medium text-zinc-200">{persona?.name || "Persona"}</span>
                      {" "}
                      <span className="text-zinc-500">{action.action === "skip" ? "skipped" : action.action === "share" ? "shared" : action.action === "comment" ? "commented" : action.action === "save" ? "saved" : "liked"}</span>
                      {isPeerShare && sharerName && (
                        <span className="text-zinc-600 text-[10px]"> via {sharerName.split(" ")[0]}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0">{action.watchDuration}%</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Action distribution */}
      {actions.length > 5 && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-3">
          {(["like", "comment", "share", "save", "skip"] as AgentActionType[]).map((type) => {
            const count = actions.filter((a) => a.action === type).length;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full ${ACTION_DOT[type]}`} />
                <span className="text-[10px] text-zinc-500">{count}</span>
              </div>
            );
          })}
          {actions.filter((a) => a.sharedBy).length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-accent-teal text-[9px]">↗</span>
              <span className="text-[10px] text-accent-teal/70">{actions.filter((a) => a.sharedBy).length} peer</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
