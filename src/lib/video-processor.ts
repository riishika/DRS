import { randomUUID } from "crypto";
import { mkdtemp, readdir, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { MAX_VIDEO_BYTES } from "@/lib/env";
import type { VideoMetadata } from "@/types";

const execFileAsync = promisify(execFile);

const log = (stage: string, ...args: unknown[]) => console.log(`[VideoProcessor] [${stage}]`, ...args);
const logErr = (stage: string, ...args: unknown[]) => console.error(`[VideoProcessor] [${stage}] ERROR:`, ...args);

export type ProcessedVideo = {
  workingDir: string;
  videoPath: string;
  framePaths: string[];
  audioPath?: string;
  metadata: VideoMetadata;
};

function parseDuration(value?: string): number {
  const parsed = Number(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ffprobeMetadata(videoPath: string): Promise<Pick<VideoMetadata, "durationSeconds" | "width" | "height" | "hasAudio">> {
  log("ffprobe", "Probing video:", videoPath);
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,width,height",
      "-of",
      "json",
      videoPath
    ]);
    const parsed = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    };
    const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
    const hasAudio = Boolean(parsed.streams?.find((stream) => stream.codec_type === "audio"));
    const result = {
      durationSeconds: parseDuration(parsed.format?.duration),
      width: Number(videoStream?.width || 0),
      height: Number(videoStream?.height || 0),
      hasAudio
    };
    log("ffprobe", `Duration: ${result.durationSeconds}s, Resolution: ${result.width}x${result.height}, Audio: ${result.hasAudio}`);
    return result;
  } catch (e) {
    logErr("ffprobe", "Failed to probe video, using defaults:", e);
    return {
      durationSeconds: 15,
      width: 1080,
      height: 1920,
      hasAudio: true
    };
  }
}

export function getStoryboardTimestamps(durationSeconds: number, frameCount: number): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [0];
  }

  const count = Math.max(1, Math.min(frameCount, Math.ceil(durationSeconds)));
  if (count === 1) {
    return [Math.max(0, durationSeconds / 2)];
  }

  const safeEnd = Math.max(0, durationSeconds - 0.25);
  return Array.from({ length: count }, (_, index) => Number(((safeEnd * index) / (count - 1)).toFixed(2)));
}

async function extractFrames(videoPath: string, outputDir: string, durationSeconds: number): Promise<string[]> {
  const timestamps = getStoryboardTimestamps(durationSeconds, 12);
  log("frames", `Extracting ${timestamps.length} frames from ${durationSeconds}s video`);
  const framePaths: string[] = [];

  try {
    for (const [index, timestamp] of timestamps.entries()) {
      const outputPath = path.join(outputDir, `frame-${String(index + 1).padStart(3, "0")}.jpg`);
      await execFileAsync("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(timestamp),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        outputPath
      ]);
      framePaths.push(outputPath);
    }
    log("frames", `Successfully extracted ${framePaths.length} frames`);
    return framePaths;
  } catch (e) {
    logErr("frames", "Frame extraction partially failed:", e);
    const files = (await readdir(outputDir).catch(() => []))
      .filter((file) => file.startsWith("frame-") && file.endsWith(".jpg"))
      .sort()
      .map((file) => path.join(outputDir, file));
    log("frames", `Recovered ${files.length} frames from output dir`);
    return files;
  }
}

async function extractAudio(videoPath: string, outputPath: string, hasAudio: boolean): Promise<string | undefined> {
  if (!hasAudio) {
    log("audio", "No audio track detected, skipping extraction");
    return undefined;
  }

  log("audio", "Extracting audio to WAV...");
  try {
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      outputPath
    ]);
    const audioStat = await stat(outputPath);
    log("audio", `Audio extracted: ${(audioStat.size / 1024).toFixed(1)} KB`);
    return outputPath;
  } catch (e) {
    logErr("audio", "Audio extraction failed:", e);
    return undefined;
  }
}

export async function processVideoUpload(file: File): Promise<ProcessedVideo> {
  log("upload", `Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB, ${file.type})`);

  if (!file.type.match(/^video\/(mp4|quicktime|webm)$/)) {
    throw new Error("Unsupported file type. Please upload MP4, MOV, or WebM.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video is too large. Max size is 100MB.");
  }

  const workingDir = await mkdtemp(path.join(os.tmpdir(), "virality-"));
  log("upload", `Working directory: ${workingDir}`);

  const videoPath = path.join(workingDir, `${randomUUID()}-${file.name}`);
  const audioPath = path.join(workingDir, "audio.wav");

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(videoPath, bytes);
  log("upload", `Video saved to disk (${bytes.length} bytes)`);

  const probe = await ffprobeMetadata(videoPath);
  const framePaths = await extractFrames(videoPath, workingDir, probe.durationSeconds);
  const extractedAudioPath = await extractAudio(videoPath, audioPath, probe.hasAudio);

  const audioStats = extractedAudioPath ? await stat(extractedAudioPath).catch(() => null) : null;

  const metadata: VideoMetadata = {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    durationSeconds: probe.durationSeconds,
    width: probe.width,
    height: probe.height,
    hasAudio: Boolean(audioStats && audioStats.size > 44),
    sampledFrameCount: framePaths.length,
    visualCoverage: framePaths.length > 0 ? "full-video-storyboard" : "fallback"
  };

  log("upload", `Processing complete: ${framePaths.length} frames, audio: ${metadata.hasAudio}, coverage: ${metadata.visualCoverage}`);

  return {
    workingDir,
    videoPath,
    framePaths,
    audioPath: extractedAudioPath,
    metadata
  };
}
