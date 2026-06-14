import { getAnalysis } from "@/lib/cache";
import { computeWaveMetrics } from "@/lib/simulation";
import { getWaveAudience } from "@/lib/personas";
import { getOpenAiClient } from "@/lib/openai";
import { buildSimulationBrief } from "@/lib/content-context";
import type { AgentAction, AgentActionType, VideoAnalysis } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json() as {
    analysisId: string;
    hookScore?: number;
    category?: string;
  };

  const original = getAnalysis(body.analysisId);
  if (!original) {
    return Response.json({ error: "Analysis not found" }, { status: 404 });
  }

  const tweaked: VideoAnalysis = {
    ...original,
    hookScore: body.hookScore ?? original.hookScore,
    contentCategory: body.category ?? original.contentCategory,
    scrollStoppingScore: Math.round(((body.hookScore ?? original.hookScore) * 0.55) + 18)
  };

  const audience = getWaveAudience(1, tweaked.contentCategory, tweaked.targetAudience)
    .slice(0, 10)
    .map((p, i) => ({ ...p, id: `whatif-${p.id}-${i}` }));

  const client = getOpenAiClient();
  const actions: AgentAction[] = [];

  for (const persona of audience) {
    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You simulate ONE Instagram user scrolling. This persona is niche-focused. Return JSON: {action, watchDuration, reasoning}. action: skip|like|comment|share|save. watchDuration: 0-100. If content doesn't match interests, skip with watchDuration under 15.`
            },
            {
              role: "user",
              content: JSON.stringify({
                persona: { name: persona.name, interests: persona.interests, engagementStyle: persona.engagementStyle },
                videoAnalysis: buildSimulationBrief(tweaked)
              })
            }
          ]
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as Partial<AgentAction>;
        const action = ["skip", "like", "comment", "share", "save"].includes(String(parsed.action))
          ? (parsed.action as AgentActionType) : "skip";
        actions.push({
          personaId: persona.id,
          wave: 1,
          action,
          watchDuration: typeof parsed.watchDuration === "number" ? Math.max(0, Math.min(100, parsed.watchDuration)) : 10,
          reasoning: parsed.reasoning || "No reasoning provided",
          emotionalResponse: "",
          source: "llm"
        });
      } catch {
        actions.push({
          personaId: persona.id, wave: 1, action: "skip",
          watchDuration: 10, reasoning: "LLM call failed", emotionalResponse: "", source: "deterministic"
        });
      }
    }
  }

  const metrics = computeWaveMetrics(1, actions);
  const engagementScore = metrics.engagementScore;
  const shareBoost = metrics.shares * 10;
  const watchBoost = metrics.avgWatchDuration * 0.3;
  const estimatedBreakoutScore = Math.min(100, Math.max(0, Math.round(
    (engagementScore * 2) + shareBoost + watchBoost
  )));

  return Response.json({
    breakoutScore: estimatedBreakoutScore,
    metrics,
    actions: actions.map((a) => ({ personaId: a.personaId, action: a.action, reasoning: a.reasoning, watchDuration: a.watchDuration })),
    tweaks: { hookScore: tweaked.hookScore, category: tweaked.contentCategory }
  });
}
