import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { analyzeUploadedVideo, analyzeUploadedImage } from "@/lib/analysis";
import { setAnalysis } from "@/lib/cache";
import { MAX_VIDEO_SECONDS } from "@/lib/env";
import { getTargetAudience } from "@/lib/target-audiences";
import type { AnalyzeResponse, TargetAudienceId } from "@/types";

const log = (...args: unknown[]) => console.log(`[API /analyze]`, ...args);
const logErr = (...args: unknown[]) => console.error(`[API /analyze] ERROR:`, ...args);

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/mov"];

function isImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
}

function isVideo(file: File): boolean {
  return VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);
}

export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();
  try {
    const formData = await request.formData();
    const media = formData.get("video");
    const targetAudience = getTargetAudience(formData.get("targetAudienceId"));
    const targetAudienceId = targetAudience.id as TargetAudienceId;

    if (!(media instanceof File)) {
      return NextResponse.json({ error: "No file received. Please upload a video or image." }, { status: 400 });
    }

    log(`Request received — file: ${media.name} (${(media.size / 1024 / 1024).toFixed(2)} MB, type: ${media.type}), target: ${targetAudience.label}`);

    let analysis;
    let frames: string[] = [];

    if (isImage(media)) {
      log(`Detected IMAGE format — using GPT-4o vision directly`);
      analysis = await analyzeUploadedImage(media, targetAudienceId);

      const buffer = Buffer.from(await media.arrayBuffer());
      const dataUrl = `data:${media.type};base64,${buffer.toString("base64")}`;
      frames = [dataUrl];
    } else if (isVideo(media)) {
      log(`Detected VIDEO format — processing with ffmpeg`);
      analysis = await analyzeUploadedVideo(media, targetAudienceId);

      if (analysis.metadata.durationSeconds > MAX_VIDEO_SECONDS) {
        log(`Rejected: duration ${analysis.metadata.durationSeconds}s exceeds max ${MAX_VIDEO_SECONDS}s`);
        return NextResponse.json({ error: "Video duration exceeds 60 seconds." }, { status: 400 });
      }

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
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${media.type}. Upload a video (MP4, MOV, WebM) or image (JPEG, PNG, WebP).` }, { status: 400 });
    }

    setAnalysis(analysis);

    const elapsed = Date.now() - startTime;
    log(`Analysis complete in ${elapsed}ms — id: ${analysis.id}, source: ${analysis.source}, category: ${analysis.contentCategory}, hookScore: ${analysis.hookScore}`);

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
    const message = error instanceof Error ? error.message : "Failed to analyze media.";
    logErr(`Failed after ${elapsed}ms:`, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
