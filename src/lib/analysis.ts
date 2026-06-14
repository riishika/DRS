import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { getOpenAiClient } from "@/lib/openai";
import { processVideoUpload } from "@/lib/video-processor";
import type { VideoAnalysis, VideoMetadata } from "@/types";

const log = (stage: string, ...args: unknown[]) => console.log(`[Analysis] [${stage}]`, ...args);
const logErr = (stage: string, ...args: unknown[]) => console.error(`[Analysis] [${stage}] ERROR:`, ...args);

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseVisionJson(raw: string): { summary: string; contentCategory: string; hookScore: number; visualSignals: string[] } {
  const jsonText = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as {
      summary?: string;
      contentCategory?: string;
      hookScore?: number;
      visualSignals?: string[];
    };
    return {
      summary: parsed.summary || "Short-form content with clear creator intent.",
      contentCategory: parsed.contentCategory || "general",
      hookScore: clampScore(Number(parsed.hookScore || 60)),
      visualSignals: parsed.visualSignals?.slice(0, 8) || ["Clear framing", "Consistent visual style"]
    };
  } catch {
    logErr("vision", "Failed to parse vision JSON, using defaults. Raw:", raw.slice(0, 200));
    return {
      summary: "Short-form content with clear creator intent.",
      contentCategory: "general",
      hookScore: 60,
      visualSignals: ["Clear framing", "Consistent visual style"]
    };
  }
}

async function runVision(framePaths: string[]): Promise<{ summary: string; contentCategory: string; hookScore: number; visualSignals: string[] }> {
  const client = getOpenAiClient();
  if (!client || framePaths.length === 0) {
    log("vision", `Skipping vision API — client: ${!!client}, frames: ${framePaths.length}. Using fallback.`);
    return {
      summary: "Visual scan suggests social-first editing and a clear message.",
      contentCategory: "creator-education",
      hookScore: 72,
      visualSignals: ["Strong first frame contrast", "Readable on-screen text", "Stable composition"]
    };
  }

  log("vision", `Calling GPT-4o vision with ${framePaths.length} frames...`);
  const startTime = Date.now();

  const imageParts = await Promise.all(
    framePaths.slice(0, 12).map(async (framePath) => {
      const bytes = await readFile(framePath);
      return {
        type: "image_url" as const,
        image_url: {
          url: `data:image/jpeg;base64,${bytes.toString("base64")}`,
          detail: "low" as const
        }
      };
    })
  );
  log("vision", `Encoded ${imageParts.length} frames as base64`);

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You analyze a storyboard sampled evenly across an entire short video. Return strict JSON with keys: summary, contentCategory, hookScore(0-100), visualSignals(array of short strings)."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "These frames are ordered from start to finish across the whole clip. Analyze the full visual arc, not just the opening. Mention hook, mid-video retention, ending/payoff, visual quality, captions/text, and share potential."
          },
          ...imageParts
        ]
      }
    ]
  });

  const elapsed = Date.now() - startTime;
  const rawContent = completion.choices[0]?.message?.content || "{}";
  log("vision", `GPT-4o responded in ${elapsed}ms. Tokens: ${completion.usage?.total_tokens || "unknown"}`);
  log("vision", `Raw response (first 300 chars): ${rawContent.slice(0, 300)}`);

  return parseVisionJson(rawContent);
}

async function runTranscription(audioPath?: string): Promise<string> {
  if (!audioPath) {
    log("whisper", "No audio path provided, skipping transcription");
    return "";
  }

  const client = getOpenAiClient();
  if (!client) {
    log("whisper", "No OpenAI client available, using demo transcript");
    return "Demo transcript: quick hook, problem statement, and clear call to action.";
  }

  const fs = await import("fs");
  const stat = fs.statSync(audioPath);
  log("whisper", `Calling Whisper API for: ${audioPath} (${(stat.size / 1024).toFixed(1)} KB)`);

  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const fileStream = fs.createReadStream(audioPath);
      const result = await client.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: "en"
      });
      const elapsed = Date.now() - startTime;
      log("whisper", `Transcription complete in ${elapsed}ms (attempt ${attempt}). Length: ${result.text.length} chars`);
      log("whisper", `Transcript preview: "${result.text.slice(0, 150)}${result.text.length > 150 ? "..." : ""}"`);
      return result.text || "";
    } catch (e) {
      const elapsed = Date.now() - startTime;
      const errorMessage = e instanceof Error ? e.message : String(e);
      logErr("whisper", `Transcription FAILED (attempt ${attempt}/${MAX_RETRIES}) after ${elapsed}ms:`, errorMessage);
      if (e && typeof e === "object" && "status" in e) {
        logErr("whisper", `HTTP status: ${(e as { status: number }).status}`);
      }
      if (attempt < MAX_RETRIES) {
        log("whisper", `Retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  log("whisper", "All transcription attempts failed, returning empty transcript");
  return "";
}

function buildAudioSignals(transcript: string, durationSeconds = 15): string[] {
  if (!transcript.trim()) {
    return ["No audio track detected", "Vision-only analysis", "No speech transcript available"];
  }

  const words = transcript.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = Math.round((words / Math.max(1, durationSeconds)) * 60);
  return [
    wordsPerMinute > 160 ? "High-energy pacing" : "Moderate pacing",
    transcript.length > 110 ? "Clear spoken narrative" : "Sparse verbal content",
    transcript.toLowerCase().includes("you") ? "Direct audience address" : "General broadcast tone"
  ];
}

function buildRecommendations(hookScore: number, transcript: string): string[] {
  const recs: string[] = [];
  if (hookScore < 70) {
    recs.push("Strengthen the first 2 seconds with a bolder visual contrast or explicit promise.");
  }
  if (!transcript.toLowerCase().includes("comment") && !transcript.toLowerCase().includes("share")) {
    recs.push("Add a direct CTA for comments or shares in the final third of the video.");
  }
  recs.push("Test two alternate openings with faster motion cuts for wave-1 retention gains.");
  return recs.slice(0, 3);
}

export function createDemoAnalysis(): VideoAnalysis {
  log("demo", "Creating demo analysis (no API calls)");
  const metadata: VideoMetadata = {
    filename: "demo-video.mp4",
    mimeType: "video/mp4",
    sizeBytes: 6_200_000,
    durationSeconds: 15,
    width: 1080,
    height: 1920,
    hasAudio: true,
    sampledFrameCount: 12,
    visualCoverage: "full-video-storyboard"
  };
  const transcript = "Build in public, ship fast, and comment your biggest growth bottleneck.";
  return {
    id: randomUUID(),
    summary: "High-clarity short-form explainer with an energetic hook and direct audience framing.",
    contentCategory: "creator-education",
    hookScore: 78,
    scrollStoppingScore: 80,
    visualSignals: ["Immediate title card", "Face-to-camera credibility", "Consistent branding palette"],
    audioSignals: buildAudioSignals(transcript, metadata.durationSeconds),
    transcript,
    recommendations: buildRecommendations(78, transcript),
    metadata,
    createdAt: new Date().toISOString(),
    source: "demo"
  };
}

export async function analyzeUploadedVideo(file: File): Promise<VideoAnalysis> {
  log("live", `=== Starting LIVE analysis for: ${file.name} ===`);
  const totalStart = Date.now();

  const processed = await processVideoUpload(file);
  log("live", `Video processed. Running vision + transcription in parallel...`);

  const [vision, transcript] = await Promise.all([runVision(processed.framePaths), runTranscription(processed.audioPath)]);

  log("live", `Vision result: category="${vision.contentCategory}", hookScore=${vision.hookScore}`);
  log("live", `Transcript: ${transcript ? `${transcript.length} chars` : "empty"}`);

  const audioSignals = buildAudioSignals(transcript, processed.metadata.durationSeconds);
  const scrollStoppingScore = clampScore((vision.hookScore * 0.55) + (audioSignals[0].includes("High") ? 25 : 18));

  const totalElapsed = Date.now() - totalStart;
  log("live", `=== Analysis complete in ${totalElapsed}ms ===`);

  return {
    id: randomUUID(),
    summary: vision.summary,
    contentCategory: vision.contentCategory,
    hookScore: vision.hookScore,
    scrollStoppingScore,
    visualSignals: vision.visualSignals,
    audioSignals,
    transcript,
    recommendations: buildRecommendations(vision.hookScore, transcript),
    metadata: processed.metadata,
    createdAt: new Date().toISOString(),
    source: getOpenAiClient() ? "live" : "fallback",
    _framePaths: processed.framePaths
  };
}
