"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { WaveMetrics } from "@/types";

type SimulationViewProps = {
  metrics: WaveMetrics[];
};

export function SimulationView({ metrics }: SimulationViewProps): JSX.Element {
  if (metrics.length === 0) return <></>;

  const chartData = metrics.map((m) => ({
    wave: `W${m.wave}`,
    engagement: +(m.engagementRate * 100).toFixed(1),
    shareRate: +(m.shareRate * 100).toFixed(1),
    impressions: m.impressions
  }));

  return (
    <section className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300">Metrics</h3>
        <div className="flex items-center gap-3 text-[9px] text-zinc-500">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-accent-gold" />engagement</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />shares</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f2c14e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f2c14e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ec4b6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2ec4b6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="wave" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Area type="monotone" dataKey="engagement" stroke="#f2c14e" strokeWidth={1.5} fill="url(#eg)" dot={false} />
            <Area type="monotone" dataKey="shareRate" stroke="#2ec4b6" strokeWidth={1.5} fill="url(#sg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Wave numbers */}
      <div className="mt-3 flex gap-2">
        {metrics.map((m) => (
          <div key={m.wave} className="flex-1 rounded-lg bg-surface-50/30 p-2 text-center">
            <p className="text-sm font-semibold text-white">{m.impressions}</p>
            <p className="text-[9px] text-zinc-600">W{m.wave} views</p>
          </div>
        ))}
      </div>
    </section>
  );
}
