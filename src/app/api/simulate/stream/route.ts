import { getAnalysis, setSimulationResult } from "@/lib/cache";
import { simulateBreakout } from "@/lib/simulation";
import { formatSseEvent } from "@/lib/sse";

export const dynamic = "force-dynamic";

const log = (...args: unknown[]) => console.log(`[API /simulate/stream]`, ...args);
const logErr = (...args: unknown[]) => console.error(`[API /simulate/stream] ERROR:`, ...args);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");

  if (!analysisId) {
    return new Response("analysisId is required", { status: 400 });
  }

  log(`Stream requested for analysisId: ${analysisId}`);
  const analysis = getAnalysis(analysisId);
  if (!analysis) {
    logErr(`Analysis not found in cache for ${analysisId}. Server may have restarted.`);
    return new Response("Analysis not found. Please re-upload your video.", { status: 404 });
  }
  log(`Using analysis: source=${analysis.source}, category=${analysis.contentCategory}, target=${analysis.targetAudience.label}`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const startTime = Date.now();
      let eventCount = 0;

      try {
        controller.enqueue(encoder.encode(formatSseEvent({
          type: "analysis.ready",
          ts: new Date().toISOString(),
          message: `Analysis ready for ${analysis.metadata.filename} — targeting ${analysis.targetAudience.label}`
        })));
        eventCount++;

        const runner = simulateBreakout(analysis);
        while (true) {
          const { value, done } = await runner.next();
          if (done) {
            setSimulationResult(value);
            controller.enqueue(encoder.encode(formatSseEvent({
              type: "simulation.complete",
              ts: new Date().toISOString(),
              result: value,
              message: "Simulation complete."
            })));
            eventCount++;
            const elapsed = Date.now() - startTime;
            log(`Simulation complete — ${eventCount} events in ${elapsed}ms, breakoutScore: ${value.breakoutScore}`);
            break;
          }
          controller.enqueue(encoder.encode(formatSseEvent(value)));
          eventCount++;

          if (value.type === "wave.started") {
            log(`Wave ${value.wave} started`);
          }
          if (value.type === "wave.summary" && value.metrics) {
            log(`Wave ${value.wave} summary — engagement: ${(value.metrics.engagementRate * 100).toFixed(1)}%, shares: ${value.metrics.shares}, impressions: ${value.metrics.impressions}`);
          }

          await delay(90);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Simulation failed.";
        logErr(`Stream error after ${eventCount} events:`, message);
        controller.enqueue(encoder.encode(formatSseEvent({
          type: "simulation.error",
          ts: new Date().toISOString(),
          message
        })));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
