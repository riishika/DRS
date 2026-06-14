"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentActionType, Persona, PersonaAction, WaveMetrics } from "@/types";

type LiveNetworkGraphProps = {
  actions: PersonaAction[];
  personas: Record<string, Persona>;
  metrics: WaveMetrics[];
};

const ACTION_COLORS: Record<AgentActionType, string> = {
  skip: "#6b7280",
  like: "#f59e0b",
  comment: "#ef4444",
  save: "#22c55e",
  share: "#06b6d4"
};

const ACTION_LABELS: Record<AgentActionType, string> = {
  skip: "Skipped",
  like: "Liked",
  comment: "Commented",
  save: "Saved",
  share: "Shared"
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function hash(value: string): number {
  return [...value].reduce((total, char, i) => total + char.charCodeAt(0) * (i + 1), 0);
}

function nodePosition(action: PersonaAction, cx: number, cy: number): { x: number; y: number } {
  const waveRadii = [0, 100, 185, 270];
  if (action.sharedBy) {
    const seed = hash(action.personaId);
    const parentSeed = hash(action.sharedBy);
    const parentAngle = (seededRandom(parentSeed) * 360 * Math.PI) / 180;
    const baseR = (waveRadii[action.wave] || 270) + 35;
    const angleOffset = (seededRandom(seed) * 40 - 20) * (Math.PI / 180);
    const angle = parentAngle + angleOffset;
    return { x: cx + Math.cos(angle) * baseR, y: cy + Math.sin(angle) * baseR };
  }
  const baseR = waveRadii[action.wave] || 270;
  const seed = hash(action.personaId);
  const angle = (seededRandom(seed) * 360 * Math.PI) / 180;
  const jitter = seededRandom(seed + 1) * 25 - 12;
  const r = baseR + jitter;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

export function LiveNetworkGraph({ actions, personas, metrics }: LiveNetworkGraphProps): JSX.Element {
  const [selectedNode, setSelectedNode] = useState<PersonaAction | null>(null);
  const [selectedWave, setSelectedWave] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<AgentActionType | null>(null);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const latestByPersona = useMemo(() => {
    const map = new Map<string, PersonaAction>();
    for (const action of actions) map.set(action.personaId, action);
    return [...map.values()];
  }, [actions]);

  const filteredNodes = useMemo(() => {
    let nodes = latestByPersona;
    if (selectedWave !== null) nodes = nodes.filter((a) => a.wave === selectedWave);
    if (selectedAction !== null) nodes = nodes.filter((a) => a.action === selectedAction);
    return nodes;
  }, [latestByPersona, selectedWave, selectedAction]);

  const peerEdges = useMemo(() => {
    const edges: { from: PersonaAction; to: PersonaAction }[] = [];
    const actionMap = new Map<string, PersonaAction>();
    for (const a of latestByPersona) actionMap.set(a.personaId, a);
    for (const action of latestByPersona) {
      if (action.sharedBy) {
        const fromAction = actionMap.get(action.sharedBy);
        if (fromAction) edges.push({ from: fromAction, to: action });
      }
    }
    return edges;
  }, [latestByPersona]);

  useEffect(() => {
    if (animatedCount < latestByPersona.length) {
      const timer = setTimeout(() => setAnimatedCount((c) => Math.min(c + 3, latestByPersona.length)), 50);
      return () => clearTimeout(timer);
    }
  }, [animatedCount, latestByPersona.length]);

  const cx = 350, cy = 280;
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);

  const actionCounts = useMemo(() => {
    const counts: Record<AgentActionType, number> = { skip: 0, like: 0, comment: 0, save: 0, share: 0 };
    for (const a of latestByPersona) counts[a.action]++;
    return counts;
  }, [latestByPersona]);

  const waveNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const a of latestByPersona) set.add(a.wave);
    return [...set].sort();
  }, [latestByPersona]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom((z) => Math.max(0.5, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  // Native wheel listener to prevent page scroll when hovering the graph
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x) / zoom,
      y: panStart.current.panY + (e.clientY - panStart.current.y) / zoom
    });
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleNodeClick = useCallback((action: PersonaAction) => {
    setSelectedNode(selectedNode?.personaId === action.personaId ? null : action);
  }, [selectedNode]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  }, []);

  return (
    <section className="glass-strong rounded-2xl p-5 min-h-[620px] relative overflow-hidden flex flex-col">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent-teal/5 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-300">Propagation Network</h2>
          {latestByPersona.length > 0 && (
            <span className="text-[10px] text-accent-teal bg-accent-teal/10 px-2 py-0.5 rounded-full font-mono">
              {filteredNodes.length}/{latestByPersona.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {zoom !== 1 && (
            <button onClick={resetView} className="text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors" type="button">
              Reset view
            </button>
          )}
          <span className="text-[10px] text-zinc-600">{totalImpressions} imp</span>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 mb-2 relative z-10 flex-wrap">
        {/* Wave filters */}
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedWave(null)}
            className={`text-[9px] px-1.5 py-0.5 rounded-full transition-all ${selectedWave === null ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/30" : "bg-zinc-800/50 text-zinc-600 border border-zinc-700/20 hover:text-zinc-400"}`}
            type="button"
          >All</button>
          {waveNumbers.map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWave(selectedWave === w ? null : w)}
              className={`text-[9px] px-1.5 py-0.5 rounded-full transition-all ${selectedWave === w ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/30" : "bg-zinc-800/50 text-zinc-600 border border-zinc-700/20 hover:text-zinc-400"}`}
              type="button"
            >W{w}</button>
          ))}
        </div>
        <div className="h-3 w-px bg-zinc-800" />
        {/* Action filters */}
        <div className="flex gap-1">
          {(Object.keys(ACTION_COLORS) as AgentActionType[]).map((act) => (
            actionCounts[act] > 0 && (
              <button
                key={act}
                onClick={() => setSelectedAction(selectedAction === act ? null : act)}
                className={`text-[9px] px-1.5 py-0.5 rounded-full transition-all flex items-center gap-1 ${selectedAction === act ? "bg-white/10 text-white border border-white/20" : "bg-zinc-800/50 text-zinc-600 border border-zinc-700/20 hover:text-zinc-400"}`}
                type="button"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACTION_COLORS[act] }} />
                {actionCounts[act]}
              </button>
            )
          ))}
        </div>
      </div>

      {/* SVG Graph with zoom/pan */}
      <div className="flex-1 relative rounded-xl overflow-hidden" style={{ background: "rgba(8,8,12,0.6)" }}>
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${700 / zoom} ${480 / zoom}`}
          style={{ minHeight: "400px", cursor: isPanning ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
            <filter id="glow-filter"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="strong-glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* Wave rings */}
          {[100, 185, 270].map((r) => (
            <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#06b6d4" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="4 4" />
          ))}

          {/* Edges */}
          {filteredNodes.slice(0, animatedCount).map((action) => {
            const pos = nodePosition(action, cx, cy);
            const isShare = action.action === "share";
            const isSelected = selectedNode?.personaId === action.personaId;
            return (
              <line key={`e-${action.personaId}`} x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                stroke={ACTION_COLORS[action.action]}
                strokeWidth={isSelected ? 2 : isShare ? 1.5 : 0.5}
                strokeOpacity={isSelected ? 0.8 : isShare ? 0.35 : 0.1}
              />
            );
          })}

          {/* Peer edges */}
          {peerEdges.map(({ from, to }) => {
            const fromPos = nodePosition(from, cx, cy);
            const toPos = nodePosition(to, cx, cy);
            return (
              <g key={`peer-${from.personaId}-${to.personaId}`}>
                <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
                  stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 2" />
                <circle r="1.5" fill="#22c55e" opacity="0.8">
                  <animateMotion dur="1.8s" repeatCount="indefinite" path={`M${fromPos.x},${fromPos.y} L${toPos.x},${toPos.y}`} />
                </circle>
              </g>
            );
          })}

          {/* Share particles */}
          {filteredNodes.filter((a) => a.action === "share").map((action, i) => {
            const pos = nodePosition(action, cx, cy);
            return (
              <circle key={`p-${action.personaId}`} r="2" fill="#06b6d4" opacity="0.7" filter="url(#glow-filter)">
                <animateMotion dur={`${2 + i * 0.2}s`} repeatCount="indefinite" path={`M${cx},${cy} L${pos.x},${pos.y}`} />
              </circle>
            );
          })}

          {/* Center node */}
          <g filter="url(#strong-glow)">
            <circle cx={cx} cy={cy} r="22" fill="url(#core-glow)">
              <animate attributeName="r" values="20;24;20" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
          <circle cx={cx} cy={cy} r="16" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.5" />
          <text x={cx} y={cy + 4} textAnchor="middle" className="fill-white text-[9px] font-bold" opacity="0.9">▶</text>

          {/* Nodes */}
          {filteredNodes.slice(0, animatedCount).map((action) => {
            const pos = nodePosition(action, cx, cy);
            const isShare = action.action === "share";
            const isSkip = action.action === "skip";
            const isSelected = selectedNode?.personaId === action.personaId;
            const r = isSelected ? 9 : isShare ? 7 : isSkip ? 3 : 5;

            return (
              <g key={`n-${action.personaId}`} onClick={() => handleNodeClick(action)} style={{ cursor: "pointer" }}>
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="2 2">
                    <animate attributeName="stroke-dashoffset" values="0;12" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
                {isShare && !isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={12} fill="none" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.25">
                    <animate attributeName="r" values="9;14;9" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={pos.x} cy={pos.y} r={r}
                  fill={ACTION_COLORS[action.action]}
                  opacity={isSelected ? 1 : isSkip ? 0.35 : 0.8}
                  filter={isSelected || isShare ? "url(#glow-filter)" : undefined}
                />
                {(isShare || isSelected) && (
                  <text x={pos.x} y={pos.y + r + 10} textAnchor="middle" className="fill-zinc-400 text-[7px]">
                    {personas[action.personaId]?.name?.split(" ")[0] || ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20">
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.3))} className="h-6 w-6 rounded bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center text-xs border border-zinc-700/50" type="button">+</button>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.3))} className="h-6 w-6 rounded bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center text-xs border border-zinc-700/50" type="button">-</button>
        </div>
      </div>

      {/* Selected node detail panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-zinc-800/50 relative z-10"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ACTION_COLORS[selectedNode.action] }} />
                <div>
                  <p className="text-xs font-medium text-white">{personas[selectedNode.personaId]?.name || selectedNode.personaId}</p>
                  <p className="text-[10px] text-zinc-500">Wave {selectedNode.wave} · {ACTION_LABELS[selectedNode.action]} · Watched {selectedNode.watchDuration}%</p>
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-zinc-600 hover:text-zinc-300 text-xs" type="button">✕</button>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-zinc-400"><span className="text-zinc-600">Reasoning:</span> {selectedNode.reasoning}</p>
              <p className="text-[10px] text-zinc-400"><span className="text-zinc-600">Feeling:</span> {selectedNode.emotionalResponse}</p>
              {selectedNode.sharedBy && (
                <p className="text-[10px] text-accent-teal"><span className="text-zinc-600">Shared by:</span> {personas[selectedNode.sharedBy]?.name || "peer"}</p>
              )}
              {personas[selectedNode.personaId]?.interests && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {personas[selectedNode.personaId]!.interests.map((i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500">{i}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom stats */}
      {latestByPersona.length > 0 && !selectedNode && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/30 relative z-10">
          <div className="flex gap-2">
            {Object.entries(actionCounts).filter(([, c]) => c > 0).map(([action, count]) => (
              <div key={action} className="flex items-center gap-1">
                <div className="h-2.5 rounded-sm" style={{ width: `${Math.max(4, (count / latestByPersona.length) * 60)}px`, backgroundColor: ACTION_COLORS[action as AgentActionType], opacity: 0.7 }} />
                <span className="text-[9px] text-zinc-600 font-mono">{count}</span>
              </div>
            ))}
          </div>
          <span className="text-[9px] text-zinc-700">scroll to zoom · drag to pan · click nodes</span>
        </div>
      )}

      {/* Empty state */}
      {latestByPersona.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <p className="text-xs text-zinc-600">Waiting for simulation...</p>
          </div>
        </div>
      )}
    </section>
  );
}
