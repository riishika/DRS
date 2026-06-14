"use client";

import React from "react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { UploadedVideoPreview } from "@/components/VideoPreviewPanel";

type VideoUploadProps = {
  onSubmit: (input: { file?: File; demoMode: boolean }) => Promise<void>;
  onVideoPreviewChange: (preview: UploadedVideoPreview | null) => void;
  busy: boolean;
};

export function VideoUpload({ onSubmit, onVideoPreviewChange, busy }: VideoUploadProps): JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      onVideoPreviewChange(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    onVideoPreviewChange({ url, name: selectedFile.name, type: selectedFile.type });
    return () => { URL.revokeObjectURL(url); };
  }, [onVideoPreviewChange, selectedFile]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] || null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) setSelectedFile(file);
  }

  async function handleSubmit() {
    await onSubmit({ file: selectedFile || undefined, demoMode: false });
  }

  return (
    <section className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-300">Upload Video</h2>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={`rounded-xl border border-dashed p-4 text-center cursor-pointer transition-all mb-4 ${
          isDragOver ? "border-accent-teal bg-accent-teal/5" : "border-zinc-800 hover:border-zinc-600"
        }`}
      >
        <p className="text-xs text-zinc-400">
          {selectedFile ? selectedFile.name : "Drop video or click to browse"}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">MP4, MOV, WebM · max 60s</p>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={onFileChange}
          disabled={busy}
        />
      </div>

      <motion.button
        whileHover={{ scale: busy ? 1 : 1.01 }}
        whileTap={{ scale: busy ? 1 : 0.98 }}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
          busy
            ? "bg-surface-200 text-zinc-500"
            : "bg-white text-surface hover:bg-zinc-100"
        } disabled:opacity-40`}
        onClick={handleSubmit}
        disabled={busy || !selectedFile}
        type="button"
      >
        {busy ? "Processing..." : "Start Prediction"}
      </motion.button>
    </section>
  );
}
