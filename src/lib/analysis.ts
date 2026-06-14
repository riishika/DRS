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
          detail: "auto" as const
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
          `You analyze frames sampled from a short-form social media video (TikTok/Reels/Shorts style). Your job is to identify what the video IS ABOUT and who would enjoy it.

Return strict JSON:
{
  "summary": "2-3 sentences describing what happens in the video, the tone/vibe, and who the target audience is",
  "contentCategory": "one of: Comedy, Meme, Fitness, Tech, Travel, Food, Gaming, Music, Education, Lifestyle, Fashion, Business, Motivation, Art, Pets, Dance, Reaction, Compilation, Prank, Other",
  "hookScore": 0-100 (how scroll-stopping is the first frame and overall energy),
  "visualSignals": ["array of 4-6 short strings describing what you SEE"]
}

IMPORTANT: Focus on WHAT the content is about and its VIBE/TONE, not just technical video quality. If it's funny, say it's comedy. If it's a compilation, identify the theme. Read any visible text/captions in the frames.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "These frames are sampled across the full video. What is this video about? What's the genre/category? Who would watch this? Is it funny, educational, inspirational, or something else? Read any text overlays visible in the frames."
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

export async function analyzeUploadedImage(file: File): Promise<VideoAnalysis> {
  log("image", `=== Starting IMAGE analysis for: ${file.name} ===`);
  const totalStart = Date.now();

  const client = getOpenAiClient();
  if (!client) throw new Error("OpenAI API key not configured.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  log("image", `Image encoded: ${(buffer.length / 1024).toFixed(1)} KB, type: ${mimeType}`);

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You analyze a social media image/post. Return strict JSON with keys:
- summary: describe what the image shows and its social media potential (2-3 sentences)
- contentCategory: one word category (e.g., Comedy, Meme, Motivational, Educational, Lifestyle, Art, Fashion, Food, Tech)
- hookScore: 0-100 (how scroll-stopping is this image)
- visualSignals: array of 4-6 short strings describing visual elements
- extractedText: any text/captions visible in the image (empty string if none)`
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this image as if it were posted on Instagram. Focus on engagement potential, visual quality, text overlays, and shareability." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
        ]
      }
    ]
  });

  const elapsed = Date.now() - totalStart;
  const rawContent = completion.choices[0]?.message?.content || "{}";
  log("image", `GPT-4o responded in ${elapsed}ms. Tokens: ${completion.usage?.total_tokens || "unknown"}`);
  log("image", `Raw response (first 300 chars): ${rawContent.slice(0, 300)}`);

  const jsonText = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  let parsed: { summary?: string; contentCategory?: string; hookScore?: number; visualSignals?: string[]; extractedText?: string } = {};
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    logErr("image", "Failed to parse vision JSON:", jsonText.slice(0, 200));
  }

  const extractedText = parsed.extractedText || "";
  const summary = parsed.summary || "Image content with social media potential.";
  const contentCategory = parsed.contentCategory || "general";
  const hookScore = clampScore(Number(parsed.hookScore || 60));
  const visualSignals = parsed.visualSignals?.slice(0, 8) || ["Clear composition"];

  const transcript = extractedText;
  const audioSignals = extractedText
    ? ["Text overlay detected", `${extractedText.split(/\s+/).length} words in image`, "Static content — no audio"]
    : ["No text detected", "Visual-only content", "Static image — no audio"];

  const scrollStoppingScore = clampScore((hookScore * 0.6) + 20);

  const metadata: VideoMetadata = {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    durationSeconds: 0,
    width: 1080,
    height: 1080,
    hasAudio: false,
    sampledFrameCount: 1,
    visualCoverage: "full-video-storyboard"
  };

  log("image", `=== Image analysis complete in ${elapsed}ms — category: ${contentCategory}, hook: ${hookScore}, text: ${extractedText.length} chars ===`);

  return {
    id: randomUUID(),
    summary,
    contentCategory,
    hookScore,
    scrollStoppingScore,
    visualSignals,
    audioSignals,
    transcript,
    recommendations: buildRecommendations(hookScore, transcript),
    metadata,
    createdAt: new Date().toISOString(),
    source: "live",
    _framePaths: []
  };
}
