"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimulationStore } from "@/store/simulation-store";
import { buildContentContext } from "@/lib/content-context";
import type { AgentActionType } from "@/types";

const ACTION_COLORS: Record<AgentActionType, string> = {
  skip: "#6b7280",
  like: "#f59e0b",
  comment: "#ef4444",
  save: "#22c55e",
  share: "#06b6d4"
};

export default function StatsPage(): JSX.Element {
  const { actions, personas, waveMetrics, result, analysis } = useSimulationStore();

  const actionDistribution = useMemo(() => {
    const counts: Record<AgentActionType, number> = { skip: 0, like: 0, comment: 0, save: 0, share: 0 };
    for (const a of actions) counts[a.action]++;
    return Object.entries(counts).map(([action, count]) => ({
      name: action,
      value: count,
      color: ACTION_COLORS[action as AgentActionType]
    }));
  }, [actions]);

  const watchDurationByWave = useMemo(() => {
    const waves: Record<number, number[]> = {};
    for (const a of actions) {
      if (!waves[a.wave]) waves[a.wave] = [];
      waves[a.wave]!.push(a.watchDuration);
    }
    return Object.entries(waves).map(([wave, durations]) => ({
      wave: `Wave ${wave}`,
      avg: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length),
      max: Math.max(...durations),
      min: Math.min(...durations)
    }));
  }, [actions]);

  const personaBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; action: AgentActionType; watchDuration: number; wave: number; interests: string[] }[]>();
    for (const a of actions) {
      const persona = personas[a.personaId];
      const key = persona?.name || a.personaId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
        name: key,
        action: a.action,
        watchDuration: a.watchDuration,
        wave: a.wave,
        interests: persona?.interests || []
      });
    }
    return [...map.entries()].map(([name, acts]) => ({
      name,
      totalActions: acts.length,
      engaged: acts.filter((a) => a.action !== "skip").length,
      avgWatch: Math.round(acts.reduce((s, a) => s + a.watchDuration, 0) / acts.length),
      primaryAction: acts.filter((a) => a.action !== "skip")[0]?.action || "skip",
      interests: acts[0]?.interests || []
    })).sort((a, b) => b.avgWatch - a.avgWatch);
  }, [actions, personas]);

  const peerShareStats = useMemo(() => {
    const peerActions = actions.filter((a) => a.sharedBy);
    const engaged = peerActions.filter((a) => a.action !== "skip");
    return {
      total: peerActions.length,
      engaged: engaged.length,
      conversionRate: peerActions.length > 0 ? (engaged.length / peerActions.length * 100).toFixed(1) : "0"
    };
  }, [actions]);

  const engagementTimeline = useMemo(() => {
    return actions.map((a, i) => ({
      index: i + 1,
      watchDuration: a.watchDuration,
      isEngaged: a.action !== "skip" ? 1 : 0
    }));
  }, [actions]);

  const interestMatchRate = useMemo(() => {
    if (!analysis) return [];
    const analysisText = buildContentContext(analysis);
    const personaList = Object.values(personas);
    let matched = 0;
    let unmatched = 0;
    for (const p of personaList) {
      const hasMatch = p.interests.some((i) => analysisText.includes(i.toLowerCase()));
      if (hasMatch) matched++;
      else unmatched++;
    }
    return [
      { name: "Interest Match", value: matched, color: "#06b6d4" },
      { name: "No Match", value: unmatched, color: "#6b7280" }
    ];
  }, [analysis, personas]);

  if (actions.length === 0) {
    return (
      <main className="min-h-screen max-w-[1400px] mx-auto px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-teal to-accent-gold flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface">
                <path d="M3 3v18h18" />
                <path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Simulation Stats</h1>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back to Dashboard</Link>
        </header>
        <div className="text-center py-20">
          <p className="text-zinc-500 text-sm">No simulation data yet.</p>
          <p className="text-zinc-600 text-xs mt-2">Run a simulation first, then come here for detailed analytics.</p>
          <Link href="/" className="inline-block mt-4 text-accent-teal text-sm hover:underline">Go to Dashboard →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-teal to-accent-gold flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">Simulation Stats</h1>
          {result && (
            <span className="text-[10px] bg-accent-lime/10 text-accent-lime px-2 py-0.5 rounded-full">
              Score: {result.viralityScore}/100
            </span>
          )}
        </div>
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back to Dashboard</Link>
      </header>

      {/* Top stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8"
      >
        <StatCard label="Total Personas" value={String(actions.length)} />
        <StatCard label="Engaged" value={String(actions.filter((a) => a.action !== "skip").length)} accent />
        <StatCard label="Skip Rate" value={`${(actions.filter((a) => a.action === "skip").length / actions.length * 100).toFixed(0)}%`} />
        <StatCard label="Avg Watch" value={`${Math.round(actions.reduce((s, a) => s + a.watchDuration, 0) / actions.length)}%`} accent />
        <StatCard label="Peer Shares" value={String(peerShareStats.total)} />
        <StatCard label="Peer Conversion" value={`${peerShareStats.conversionRate}%`} accent />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Action Distribution Pie */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl p-5"
        >
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Action Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={actionDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {actionDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {actionDistribution.filter((d) => d.value > 0).map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-zinc-400">{d.name}: <span className="text-white font-mono">{d.value}</span></span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Watch Duration by Wave */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-strong rounded-2xl p-5"
        >
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Watch Duration by Wave</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={watchDurationByWave} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="wave" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="avg" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Avg %" />
                <Bar dataKey="max" fill="#22c55e" radius={[4, 4, 0, 0]} name="Max %" opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Interest Match Rate */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-5"
        >
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Interest Match vs Content</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={interestMatchRate} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {interestMatchRate.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-zinc-600 text-center mt-2">
            Personas with at least one interest matching the video content
          </p>
        </motion.section>

        {/* Engagement Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-strong rounded-2xl p-5"
        >
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Engagement Timeline</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementTimeline.slice(-60)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="wtg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="watchDuration" stroke="#06b6d4" fill="url(#wtg)" strokeWidth={1.5} dot={false} name="Watch %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      {/* Wave Comparison Table */}
      {waveMetrics.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-2xl p-5 mb-8"
        >
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Wave Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-zinc-500 border-b border-white/[0.04]">
                  <th className="text-left py-2 font-medium">Wave</th>
                  <th className="text-right py-2 font-medium">Impressions</th>
                  <th className="text-right py-2 font-medium">Likes</th>
                  <th className="text-right py-2 font-medium">Comments</th>
                  <th className="text-right py-2 font-medium">Shares</th>
                  <th className="text-right py-2 font-medium">Saves</th>
                  <th className="text-right py-2 font-medium">Skips</th>
                  <th className="text-right py-2 font-medium">Engagement</th>
                  <th className="text-right py-2 font-medium">Share Rate</th>
                  <th className="text-right py-2 font-medium">Avg Watch</th>
                </tr>
              </thead>
              <tbody>
                {waveMetrics.map((m) => (
                  <tr key={m.wave} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                    <td className="py-2.5 text-white font-medium">Wave {m.wave}</td>
                    <td className="py-2.5 text-right text-zinc-300">{m.impressions}</td>
                    <td className="py-2.5 text-right text-accent-gold">{m.likes}</td>
                    <td className="py-2.5 text-right text-accent-rose">{m.comments}</td>
                    <td className="py-2.5 text-right text-accent-teal">{m.shares}</td>
                    <td className="py-2.5 text-right text-accent-lime">{m.saves}</td>
                    <td className="py-2.5 text-right text-zinc-500">{m.skips}</td>
                    <td className="py-2.5 text-right text-white font-mono">{(m.engagementRate * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-accent-teal font-mono">{(m.shareRate * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-zinc-300">{m.avgWatchDuration}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      )}

      {/* Persona Breakdown */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-strong rounded-2xl p-5"
      >
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Persona Performance</h3>
        <p className="text-[10px] text-zinc-600 mb-3">Sorted by average watch duration — shows which personas are most engaged with your content</p>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-surface-100">
              <tr className="text-zinc-500 border-b border-white/[0.04]">
                <th className="text-left py-2 font-medium">Persona</th>
                <th className="text-left py-2 font-medium">Interests</th>
                <th className="text-right py-2 font-medium">Actions</th>
                <th className="text-right py-2 font-medium">Engaged</th>
                <th className="text-right py-2 font-medium">Avg Watch</th>
                <th className="text-right py-2 font-medium">Best Action</th>
              </tr>
            </thead>
            <tbody>
              {personaBreakdown.slice(0, 40).map((p) => (
                <tr key={p.name} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                  <td className="py-2 text-zinc-200 font-medium truncate max-w-[140px]">{p.name}</td>
                  <td className="py-2 text-zinc-500 truncate max-w-[200px]">{p.interests.slice(0, 3).join(", ")}</td>
                  <td className="py-2 text-right text-zinc-400">{p.totalActions}</td>
                  <td className="py-2 text-right text-accent-teal">{p.engaged}</td>
                  <td className="py-2 text-right font-mono text-zinc-300">{p.avgWatch}%</td>
                  <td className="py-2 text-right">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${ACTION_COLORS[p.primaryAction]}20`, color: ACTION_COLORS[p.primaryAction] }}>
                      {p.primaryAction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }): JSX.Element {
  return (
    <div className="glass-strong rounded-xl p-3">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-0.5 font-mono ${accent ? "text-accent-teal" : "text-white"}`}>{value}</p>
    </div>
  );
}
