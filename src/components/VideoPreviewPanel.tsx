"use client";

import React from "react";
import type { VideoMetadata } from "@/types";

export type UploadedVideoPreview = {
  url: string;
  name: string;
  type: string;
};

type VideoPreviewPanelProps = {
  preview: UploadedVideoPreview | null;
  metadata: VideoMetadata | null;
};

export function VideoPreviewPanel({ preview, metadata }: VideoPreviewPanelProps): JSX.Element {
  return (
    <section className="glass-strong rounded-2xl p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-white">Video Preview</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{metadata?.filename || preview?.name || "No upload selected"}</p>
      </div>

      <div className="aspect-[9/16] max-h-[380px] overflow-hidden rounded-xl border border-white/[0.04] bg-surface-50">
        {preview ? (
          <video className="h-full w-full object-contain" src={preview.url} controls playsInline preload="metadata" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-surface-200 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
                <line x1="17" y1="17" x2="22" y2="17" />
              </svg>
            </div>
            <p className="text-xs text-zinc-500">Disable demo mode to preview uploads</p>
          </div>
        )}
      </div>

      {metadata && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface-50/50 border border-white/[0.04] p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Duration</p>
            <p className="mt-0.5 text-sm font-medium text-white">{metadata.durationSeconds.toFixed(1)}s</p>
          </div>
          <div className="rounded-lg bg-surface-50/50 border border-white/[0.04] p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Frames</p>
            <p className="mt-0.5 text-sm font-medium text-white">{metadata.sampledFrameCount}</p>
          </div>
          <div className="rounded-lg bg-surface-50/50 border border-white/[0.04] p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Audio</p>
            <p className="mt-0.5 text-sm font-medium text-white">{metadata.hasAudio ? "Detected" : "None"}</p>
          </div>
          <div className="rounded-lg bg-surface-50/50 border border-white/[0.04] p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Coverage</p>
            <p className="mt-0.5 text-sm font-medium text-white">{metadata.visualCoverage === "full-video-storyboard" ? "Full" : "Partial"}</p>
          </div>
        </div>
      )}
    </section>
  );
}
