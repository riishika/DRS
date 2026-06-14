"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type CommentFeedProps = {
  comments: string[];
};

export function CommentFeed({ comments }: CommentFeedProps): JSX.Element {
  if (comments.length === 0) return <></>;

  return (
    <section className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-300">Comments</h3>
        <span className="text-[10px] text-zinc-600">{comments.length}</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-auto">
        <AnimatePresence initial={false}>
          {comments.map((comment, i) => (
            <motion.div
              key={`${comment}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 py-1.5"
            >
              <div className="h-5 w-5 rounded-full bg-surface-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[8px] font-bold text-zinc-500">{comment[0]?.toUpperCase()}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{comment}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
