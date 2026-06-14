import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { analyzeUploadedVideo } from "@/lib/analysis";
import { setAnalysis } from "@/lib/cache";
import { MAX_VIDEO_SECONDS } from "@/lib/env";
import type { AnalyzeResponse } from "@/types";

const log = (...args: unknown[]) => console.log(`[API /analyze]`, ...args);
const logErr = (...args: unknown[]) => console.error(`[API /analyze] ERROR:`, ...args);

export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();
  try {
    const formData = await request.formData();
    const video = formData.get("video");

    if (!(video instanceof File)) {
      return NextResponse.json({ error: "No video file received. Please upload a video." }, { status: 400 });
    }

    log(`Request received — file: ${video.name} (${(video.size / 1024 / 1024).toFixed(2)} MB)`);

    const analysis = await analyzeUploadedVideo(video);

    if (analysis.metadata.durationSeconds > MAX_VIDEO_SECONDS) {
      log(`Rejected: duration ${analysis.metadata.durationSeconds}s exceeds max ${MAX_VIDEO_SECONDS}s`);
      return NextResponse.json({ error: "Video duration exceeds 60 seconds." }, { status: 400 });
    }

    setAnalysis(analysis);

    const elapsed = Date.now() - startTime;
    log(`Analysis complete in ${elapsed}ms — id: ${analysis.id}, source: ${analysis.source}, category: ${analysis.contentCategory}, hookScore: ${analysis.hookScore}`);

    let frames: string[] = [];
    if (analysis._framePaths && analysis._framePaths.length > 0) {
      log(`Encoding ${analysis._framePaths.length} frames as base64 for UI...`);
      frames = await Promise.all(
        analysis._framePaths.slice(0, 12).map(async (framePath) => {
          try {
            const bytes = await readFile(framePath);
            return `data:image/jpeg;base64,${bytes.toString("base64")}`;
          } catch {
            return "";
          }
        })
      );
      frames = frames.filter(Boolean);
      log(`Encoded ${frames.length} frames for UI`);
    }

    const response: AnalyzeResponse = {
      analysisId: analysis.id,
      metadata: analysis.metadata,
      analysis,
      analysisStatus: "ready",
      frames
    };

    return NextResponse.json(response);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Failed to analyze video.";
    logErr(`Failed after ${elapsed}ms:`, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
