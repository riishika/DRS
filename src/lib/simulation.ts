import type { AgentAction, AgentActionType, Persona, RedTeamFlag, SimulationResult, SSEEvent, VideoAnalysis, WaveMetrics } from "@/types";
import { getWaveAudience } from "@/lib/personas";
import { getOpenAiClient } from "@/lib/openai";
import { buildContentContext, buildSimulationBrief, hasUsableTranscript, isSpeechlessVideo } from "@/lib/content-context";
import { personaMatchesTargetAudience, targetAudienceMatchesText } from "@/lib/target-audiences";

const log = (stage: string, ...args: unknown[]) => console.log(`[Simulation] [${stage}]`, ...args);
const logErr = (stage: string, ...args: unknown[]) => console.error(`[Simulation] [${stage}] ERROR:`, ...args);

const ACTION_WEIGHTS: Record<AgentActionType, number> = {
  skip: 0,
  like: 1,
  comment: 3,
  save: 4,
  share: 10
};

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function cleanSnippet(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,!?'-]/g, "")
    .trim();
}

function transcriptHook(analysis: VideoAnalysis): string {
  if (!hasUsableTranscript(analysis)) {
    return "";
  }
  const transcript = cleanSnippet(analysis.transcript);
  if (!transcript || transcript.toLowerCase().includes("transcript unavailable")) {
    return "";
  }

  const firstSentence = transcript.split(/[.!?]/).find((part) => part.trim().length > 8)?.trim();
  return (firstSentence || transcript).slice(0, 84);
}

function matchedInterest(persona: Persona, analysis: VideoAnalysis): string {
  const analysisText = buildContentContext(analysis);
  return persona.interests.find((interest) => analysisText.includes(interest.toLowerCase())) || persona.interests[0] || analysis.contentCategory;
}

export function buildPersonaComment(persona: Persona, analysis: VideoAnalysis, affinity: number): string {
  const hook = transcriptHook(analysis);
  const summary = analysis.summary.toLowerCase();
  const category = analysis.contentCategory.replace(/-/g, " ");
  const isSpeechless = isSpeechlessVideo(analysis);

  const videoSubject = extractSubject(analysis);

  const genZComments = [
    () => `no bc this is actually so funny 😭`,
    () => `the way this just showed up on my feed at the perfect time`,
    () => `i cant stop watching this lmaooo`,
    () => `okay wait ${videoSubject} 💀💀`,
    () => `sending this to everyone i know rn`,
    () => `tag someone who needs to see this 👇`,
    () => `this is peak content ngl`,
    () => `the timing is EVERYTHING tho`
  ];

  const millennialComments = [
    () => `This made my day. ${videoSubject} is perfect.`,
    () => `The ${category} content I actually want on my feed`,
    () => hook ? `"${hook}" 😂` : isSpeechless ? `This works even with no dialogue` : `This is too good not to share`,
    () => `Sharing this with my group chat immediately`,
    () => `More of this energy please`,
    () => `This is exactly the kind of content that keeps me scrolling`
  ];

  const deepEngagerComments = [
    () => `The editing choices here really elevate ${category} content`,
    () => `${videoSubject} — this is the kind of thing that gets rewatched`,
    () => hook ? `"${hook}" — that delivery is perfect` : `The visual pacing on this is just right`,
    () => `This is going to blow up and I'm calling it now`,
    () => `Would love a part 2 of this concept`,
    () => `The way this builds from start to finish is really well done`
  ];

  const casualComments = [
    () => `😂😂😂`,
    () => `love this`,
    () => `dead 💀`,
    () => `🔥🔥`,
    () => `amazing`,
    () => `this is gold`
  ];

  const creatorComments = [
    () => `The pacing here really sells the ${category} workflow`,
    () => `This format works so well for ${category}. Smart execution.`,
    () => `The hook-to-payoff ratio for ${videoSubject} is 💯`,
    () => hook ? `Leading with "${hook}" is a smart move` : `The opening frames really lock you in`,
    () => `Taking notes on this ${category} structure. Clean.`,
    () => `The ${category} niche is underrated and this proves it`
  ];

  if (persona.age <= 22 && persona.scrollBehavior === "fast") {
    return randomFrom(genZComments)();
  }
  if (persona.engagementStyle === "commenter" && persona.attentionSpan >= 18) {
    return randomFrom(deepEngagerComments)();
  }
  if (persona.interests.includes("content strategy") || persona.interests.includes("creator tools")) {
    return randomFrom(creatorComments)();
  }
  if (persona.engagementStyle === "lurker" || persona.attentionSpan <= 10) {
    return randomFrom(casualComments)();
  }
  if (persona.age >= 28) {
    return randomFrom(millennialComments)();
  }
  if (affinity > 0.65) {
    return randomFrom(creatorComments)();
  }
  return randomFrom(millennialComments)();
}

function extractSubject(analysis: VideoAnalysis): string {
  const summary = analysis.visualNarrative || analysis.summary;
  const firstSentence = summary.split(/[.!]/).find((s) => s.trim().length > 10)?.trim();
  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence.toLowerCase().replace(/^the video (features|shows|is about)\s*/i, "");
  }
  return analysis.contentCategory.replace(/-/g, " ");
}

function similarityScore(persona: Persona, analysis: VideoAnalysis): number {
  const text = buildContentContext(analysis);
  const interestHits = persona.interests.filter((interest) => text.includes(interest.toLowerCase())).length;
  const prefHits = persona.contentPreferences.filter((pref) => {
    const words = pref.toLowerCase().split(/\s+/);
    return words.some((w) => w.length > 3 && text.includes(w));
  }).length;

  // Also check if the content category broadly relates to persona interests
  const categoryRelated = isCategoryRelated(persona, analysis.contentCategory);

  if (interestHits === 0 && prefHits === 0 && !categoryRelated) {
    return Math.min(0.15, analysis.hookScore / 600);
  }

  const base = categoryRelated ? 0.3 : 0;
  return Math.min(1, base + (interestHits * 0.3) + (prefHits * 0.15) + (analysis.hookScore / 250));
}

function isCategoryRelated(persona: Persona, category: string): boolean {
  const catLower = category.toLowerCase();
  const personaText = [...persona.interests, ...persona.contentPreferences].join(" ").toLowerCase();

  const CATEGORY_MAP: Record<string, string[]> = {
    comedy: ["humor", "memes", "meme", "funny", "shitpost", "pop culture", "internet culture", "absurd", "unexpected"],
    humor: ["humor", "memes", "funny", "comedy", "shitpost"],
    fitness: ["gym", "lifting", "workout", "protein", "nutrition"],
    tech: ["coding", "ai", "gadgets", "apps", "smartphones", "github"],
    travel: ["travel", "backpack", "hostel", "hotel", "destination", "budget travel"],
    food: ["food", "recipe", "restaurant", "cooking", "close-up"],
    gaming: ["gaming", "fps", "game", "esport", "clutch", "stream"],
    music: ["kpop", "music", "dance", "beat", "performance"],
    education: ["content strategy", "growth", "analytics", "algorithm"],
    "creator-education": ["content strategy", "growth", "analytics", "algorithm", "breakout"],
    lifestyle: ["fashion", "trend", "aesthetic", "minimalism"],
    business: ["startup", "venture", "ecommerce", "marketing", "invest"],
    pets: ["dog", "puppy", "pet", "cute"],
    design: ["ui", "figma", "design", "typography", "composition"],
    books: ["book", "reading", "novel", "writing"]
  };

  for (const [key, terms] of Object.entries(CATEGORY_MAP)) {
    if (catLower.includes(key) || key.includes(catLower)) {
      return terms.some((t) => personaText.includes(t));
    }
  }
  return false;
}

function deterministicAction(persona: Persona, analysis: VideoAnalysis, wave: number): AgentAction {
  const affinity = similarityScore(persona, analysis);
  const watchDuration = affinity < 0.2
    ? Math.max(3, Math.round(5 + Math.random() * 10))
    : Math.max(15, Math.min(100, Math.round((analysis.scrollStoppingScore * 0.5) + (affinity * 40) + (Math.random() * 15))));

  let action: AgentActionType = "skip";
  if (affinity < 0.2) {
    action = "skip";
  } else if (affinity >= 0.7 && persona.engagementStyle === "sharer") {
    action = "share";
  } else if (affinity >= 0.55 && persona.engagementStyle === "commenter") {
    action = "comment";
  } else if (affinity >= 0.5) {
    action = "save";
  } else if (affinity >= 0.3) {
    action = "like";
  } else {
    action = "skip";
  }

  const emotionalResponse =
    action === "skip" && affinity < 0.2
      ? `Not my thing at all. I only care about ${persona.interests[0]}.`
      : action === "share"
        ? `This is exactly the ${persona.interests[0]} content I love forwarding.`
        : action === "comment"
          ? `Had to say something — this relates to ${persona.interests[0]}.`
          : action === "save"
            ? `Saving for later — relevant to my interest in ${persona.interests[0]}.`
            : action === "like"
              ? `Decent enough, gave it a quick like.`
              : `Scrolled past — doesn't match my vibe.`;

  return {
    personaId: persona.id,
    wave,
    action,
    watchDuration,
    reasoning: affinity < 0.2
      ? `No overlap with my interests (${persona.interests.join(", ")}). Scrolled immediately.`
      : `Affinity ${affinity.toFixed(2)} — content touches on ${matchedInterest(persona, analysis)}.`,
    comment: action === "comment" ? buildPersonaComment(persona, analysis, affinity) : undefined,
    emotionalResponse,
    source: "deterministic"
  };
}

async function llmAction(persona: Persona, analysis: VideoAnalysis, wave: number): Promise<AgentAction> {
  const client = getOpenAiClient();
  if (!client) {
    log("llm", `No OpenAI client — using deterministic for ${persona.name}`);
    return deterministicAction(persona, analysis, wave);
  }

  const startTime = Date.now();
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You simulate ONE Instagram user scrolling their feed. This persona is EXTREMELY niche-focused and 1-dimensional — they ONLY engage with content directly related to their specific interests. If the content doesn't match their interests, they WILL skip within 2-3 seconds.\n\nReturn strict JSON: {action, watchDuration, reasoning, emotionalResponse, comment?}\n- action: skip|like|comment|share|save\n- watchDuration: 0-100 (% of video watched). If not relevant to their interests, this should be 5-15%.\n- reasoning: 1 sentence explaining why, referencing their specific interests\n- emotionalResponse: 1 sentence feeling from their niche perspective\n- comment (ONLY if action=comment): SHORT realistic Instagram comment (5-20 words). Must sound like someone obsessed with their niche.\n\nCRITICAL: If the video content has ZERO overlap with the persona's interests, the action MUST be "skip" with watchDuration under 15. These personas are not general browsers — they are niche-obsessed.`
        },
        {
          role: "user",
          content: JSON.stringify({
            persona: { name: persona.name, age: persona.age, interests: persona.interests, scrollBehavior: persona.scrollBehavior, engagementStyle: persona.engagementStyle, contentPreferences: persona.contentPreferences },
            wave,
            videoAnalysis: buildSimulationBrief(analysis)
          })
        }
      ]
    });

    const elapsed = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content || "{}";
    log("llm", `GPT-4.1 responded for "${persona.name}" in ${elapsed}ms — raw: ${rawContent.slice(0, 120)}`);

    const parsed = JSON.parse(rawContent) as Partial<AgentAction>;
    const fallback = deterministicAction(persona, analysis, wave);
    const action = ["skip", "like", "comment", "share", "save"].includes(String(parsed.action))
      ? (parsed.action as AgentActionType)
      : fallback.action;

    return {
      personaId: persona.id,
      wave,
      action,
      watchDuration: typeof parsed.watchDuration === "number" ? Math.max(0, Math.min(100, Math.round(parsed.watchDuration))) : fallback.watchDuration,
      reasoning: parsed.reasoning || fallback.reasoning,
      emotionalResponse: parsed.emotionalResponse || fallback.emotionalResponse,
      comment: action === "comment" ? parsed.comment || fallback.comment : undefined,
      source: "llm"
    };
  } catch (e) {
    const elapsed = Date.now() - startTime;
    logErr("llm", `Failed for "${persona.name}" after ${elapsed}ms:`, e);
    return deterministicAction(persona, analysis, wave);
  }
}

export function computeWaveMetrics(wave: number, actions: AgentAction[]): WaveMetrics {
  const impressions = actions.length;
  const likes = actions.filter((action) => action.action === "like").length;
  const comments = actions.filter((action) => action.action === "comment").length;
  const shares = actions.filter((action) => action.action === "share").length;
  const saves = actions.filter((action) => action.action === "save").length;
  const skips = actions.filter((action) => action.action === "skip").length;
  const totalWatch = actions.reduce((sum, action) => sum + action.watchDuration, 0);
  const engagementScore =
    (likes * ACTION_WEIGHTS.like) +
    (comments * ACTION_WEIGHTS.comment) +
    (saves * ACTION_WEIGHTS.save) +
    (shares * ACTION_WEIGHTS.share);

  return {
    wave,
    impressions,
    likes,
    comments,
    shares,
    saves,
    skips,
    avgWatchDuration: impressions === 0 ? 0 : Number((totalWatch / impressions).toFixed(2)),
    engagementScore,
    engagementRate: impressions === 0 ? 0 : Number((engagementScore / impressions).toFixed(3)),
    shareRate: impressions === 0 ? 0 : Number((shares / impressions).toFixed(3))
  };
}

function computeBreakoutScore(waves: WaveMetrics[]): number {
  const totalImpressions = waves.reduce((sum, wave) => sum + wave.impressions, 0);
  const weightedShareRate = waves.reduce((sum, wave) => sum + (wave.shareRate * (wave.wave + 1)), 0) / 9;
  const weightedWatch = waves.reduce((sum, wave) => sum + wave.avgWatchDuration, 0) / (waves.length * 100);
  const velocity = waves.length > 1 ? (waves[waves.length - 1]!.engagementRate - waves[0]!.engagementRate) : waves[0]!.engagementRate;
  const consistency = Math.max(0, 1 - Math.abs(waves[0]!.engagementRate - waves[waves.length - 1]!.engagementRate));
  const raw = (weightedShareRate * 40) + (weightedWatch * 25) + (Math.max(0, velocity) * 20) + (consistency * 15);
  const scaled = raw * Math.min(1.15, Math.max(0.9, totalImpressions / 180));
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function strongestDemographic(actions: AgentAction[], personas: Persona[]): string {
  const map = new Map<string, number>();
  const personaById = new Map(personas.map((persona) => [persona.id, persona]));
  for (const action of actions) {
    if (action.action === "skip") {
      continue;
    }
    const persona = personaById.get(action.personaId);
    if (!persona) {
      continue;
    }
    const bucket = `${Math.floor(persona.age / 10) * 10}s`;
    map.set(bucket, (map.get(bucket) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "20s";
}

function personaIsInSelectedTarget(persona: Persona, analysis: VideoAnalysis): boolean {
  if (analysis.targetAudience.id === "general") return true;
  return personaMatchesTargetAudience(analysis.targetAudience, persona);
}

function getTargetAudienceActions(actions: AgentAction[], personas: Persona[], analysis: VideoAnalysis): AgentAction[] {
  const personaById = new Map(personas.map((persona) => [persona.id, persona]));
  return actions.filter((action) => {
    const persona = personaById.get(action.personaId);
    return persona ? personaIsInSelectedTarget(persona, analysis) : false;
  });
}

function computeTargetAudienceScore(actions: AgentAction[], personas: Persona[], analysis: VideoAnalysis): number {
  const targetActions = getTargetAudienceActions(actions, personas, analysis);
  const measuredActions = targetActions.length > 0 || analysis.targetAudience.id !== "general" ? targetActions : actions;
  const metrics = computeWaveMetrics(0, measuredActions);
  const engagement = Math.min(1, metrics.engagementRate / 0.22);
  const share = Math.min(1, metrics.shareRate / 0.08);
  const watch = Math.min(1, metrics.avgWatchDuration / 85);
  return Math.max(0, Math.min(100, Math.round((engagement * 45) + (share * 35) + (watch * 20))));
}

function summarizeSkipReason(actions: AgentAction[]): string | undefined {
  const skipReason = actions.find((action) => action.action === "skip" && action.reasoning)?.reasoning;
  if (!skipReason) return undefined;
  return skipReason.replace(/\s+/g, " ").slice(0, 110);
}

function buildTargetAudienceRecommendations(
  analysis: VideoAnalysis,
  targetMetrics: WaveMetrics,
  targetAudienceScore: number,
  targetActions: AgentAction[]
): string[] {
  const target = analysis.targetAudience;
  const angles = target.recommendationAngles;
  const firstAngle = angles[0] || "audience-specific payoff";
  const secondAngle = angles[1] || "saveable takeaway";
  const context = buildContentContext(analysis);
  const hasTargetLanguage = targetAudienceMatchesText(target, context);
  const skipRate = targetMetrics.impressions > 0 ? targetMetrics.skips / targetMetrics.impressions : 0;
  const skipReason = summarizeSkipReason(targetActions);
  const recs: string[] = [];

  if (targetMetrics.impressions === 0) {
    recs.push(`Broaden the target sample by adding clearer ${target.label} signals: ${target.interests.slice(0, 3).join(", ")}.`);
    recs.push(`Rewrite the first frame around ${firstAngle} so the simulator can classify the post for this group.`);
    return recs;
  }

  if (targetAudienceScore < 45) {
    recs.push(`Edit the first 2 seconds for ${target.label}: show the problem, then promise ${firstAngle}.`);
  } else {
    recs.push(`Keep the ${target.label} positioning, but make the edit more explicit around ${firstAngle}.`);
  }

  if (!hasTargetLanguage && target.id !== "general") {
    recs.push(`Add on-screen words this group instantly recognizes: ${target.interests.slice(0, 3).join(", ")}.`);
  } else if (targetMetrics.shareRate < 0.03) {
    recs.push(`Add a share/save moment for ${target.label} by framing the payoff as ${secondAngle}.`);
  }

  if (!hasUsableTranscript(analysis) && analysis.textOverlays.length === 0) {
    recs.push(`Add an on-screen caption or label so ${target.label} understands the hook without audio.`);
  } else if (targetMetrics.avgWatchDuration < 55) {
    recs.push(`Move the strongest ${target.label} payoff before second 3 to reduce early skips.`);
  }

  if (skipRate > 0.45 && skipReason) {
    recs.push(`Address the main target-skip reason in the edit: "${skipReason}".`);
  }

  recs.push(`Test one variant written only for ${target.label}, using ${target.recommendationAngles.slice(0, 2).join(" + ")}.`);
  return recs.slice(0, 4);
}

function generatePeerRecipients(
  sharers: { persona: Persona; action: AgentAction }[],
  analysis: VideoAnalysis,
  wave: number
): { recipient: Persona; sharer: Persona; recipientAction: AgentAction }[] {
  const results: { recipient: Persona; sharer: Persona; recipientAction: AgentAction }[] = [];

  for (const { persona: sharer } of sharers) {
    const recipientCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < recipientCount; i++) {
      const recipient: Persona = {
        id: `peer-${sharer.id}-${i}`,
        name: generatePeerName(sharer, i),
        age: sharer.age + Math.floor(Math.random() * 10) - 5,
        interests: [...sharer.interests.slice(0, 2), randomFrom(["memes", "trending", "friends", "lifestyle", "humor"])],
        scrollBehavior: randomFrom(["fast", "moderate", "deep"]),
        engagementStyle: randomFrom(["lurker", "liker", "commenter", "sharer"]),
        attentionSpan: 8 + Math.floor(Math.random() * 15),
        contentPreferences: sharer.contentPreferences.slice(0, 2),
        followerCount: Math.floor(Math.random() * 2000) + 100
      };

      const affinityBoost = 0.15;
      const affinity = Math.min(1, similarityScore(recipient, analysis) + affinityBoost);
      const watchDuration = Math.max(20, Math.min(100, Math.round(
        (analysis.scrollStoppingScore * 0.5) + (affinity * 30) + (Math.random() * 20) + 10
      )));

      let action: AgentActionType;
      if (affinity > 0.7 && recipient.engagementStyle === "sharer") {
        action = "share";
      } else if (affinity > 0.55) {
        action = randomFrom(["like", "comment", "save"]);
      } else if (affinity > 0.3) {
        action = "like";
      } else {
        action = "skip";
      }

      const recipientAction: AgentAction = {
        personaId: recipient.id,
        wave,
        action,
        watchDuration,
        reasoning: `Received from ${sharer.name}. ${action === "skip" ? "Not my thing even from a friend." : "Trusted source made me watch longer."}`,
        comment: action === "comment" ? buildPersonaComment(recipient, analysis, affinity) : undefined,
        emotionalResponse: action === "share"
          ? "My friend sent this — I need to pass it on too!"
          : action === "comment"
            ? "Friend showed me this, had to react"
            : action === "skip"
              ? "Even my friend's rec didn't hook me"
              : "Friend sent it, gave it a like",
        source: "deterministic",
        sharedBy: sharer.id
      };

      results.push({ recipient, sharer, recipientAction });
    }
  }

  return results;
}

function generatePeerName(sharer: Persona, index: number): string {
  const suffixes = ["'s friend", "'s mutual", "'s follower", "'s groupchat"];
  return `${sharer.name.split(" ")[0]}${suffixes[index % suffixes.length]}`;
}

async function runRedTeam(analysis: VideoAnalysis): Promise<RedTeamFlag[]> {
  const client = getOpenAiClient();
  if (!client) {
    return deterministicRedTeam(analysis);
  }

  const startTime = Date.now();
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a Content Safety Red Team agent. Your job is to identify ALL potential risks, controversies, or weaknesses in video content before it goes live. You are adversarial — find problems others would miss.

Return JSON: { "flags": [{ "severity": "low"|"medium"|"high", "category": string, "description": string }] }

Categories: "brand_risk", "audience_alienation", "cultural_sensitivity", "engagement_risk", "platform_violation", "accessibility", "fatigue_factor"

Find 2-5 flags. Be specific and actionable. Even safe content has weaknesses (e.g., "too niche", "no CTA", "poor retention risk after second 5").`
        },
        {
          role: "user",
          content: JSON.stringify({
            summary: analysis.summary,
            category: analysis.contentCategory,
            hookScore: analysis.hookScore,
            visualNarrative: analysis.visualNarrative,
            visualSignals: analysis.visualSignals,
            textOverlays: analysis.textOverlays,
            audioSignals: analysis.audioSignals,
            transcriptStatus: analysis.transcriptStatus,
            transcript: hasUsableTranscript(analysis) ? analysis.transcript.slice(0, 400) : undefined
          })
        }
      ]
    });

    const elapsed = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content || "{}";
    log("redTeam", `GPT-4.1 Red Team responded in ${elapsed}ms`);

    const parsed = JSON.parse(rawContent) as { flags?: Array<{ severity?: string; category?: string; description?: string }> };
    const flags: RedTeamFlag[] = (parsed.flags || []).slice(0, 5).map((f) => ({
      severity: (["low", "medium", "high"].includes(f.severity || "") ? f.severity : "medium") as "low" | "medium" | "high",
      category: f.category || "general",
      description: f.description || "Unspecified risk",
      agent: "Red Team Guardian"
    }));

    return flags.length > 0 ? flags : deterministicRedTeam(analysis);
  } catch (e) {
    logErr("redTeam", "Red Team LLM failed, using deterministic:", e);
    return deterministicRedTeam(analysis);
  }
}

function deterministicRedTeam(analysis: VideoAnalysis): RedTeamFlag[] {
  const flags: RedTeamFlag[] = [];

  if (analysis.hookScore < 70) {
    flags.push({ severity: "high", category: "engagement_risk", description: "Weak opening hook — most viewers will scroll past within 2 seconds", agent: "Hook Analyzer" });
  }
  if (!hasUsableTranscript(analysis)) {
    flags.push({
      severity: analysis.visualNarrative || analysis.textOverlays.length > 0 ? "low" : "medium",
      category: "accessibility",
      description: analysis.visualNarrative || analysis.textOverlays.length > 0
        ? "No spoken transcript detected, but frame/storyboard signals are strong enough for visual-first evaluation"
        : "No spoken transcript detected — add captions or visible context for viewers watching silently",
      agent: "Accessibility Scanner"
    });
  }
  if (analysis.scrollStoppingScore < 60) {
    flags.push({ severity: "medium", category: "engagement_risk", description: "Low scroll-stopping power — content blends into feed noise", agent: "Retention Analyzer" });
  }

  const niche = analysis.contentCategory.toLowerCase();
  if (!["comedy", "humor", "memes", "trending"].some((t) => niche.includes(t))) {
    flags.push({ severity: "low", category: "audience_alienation", description: `Niche content (${analysis.contentCategory}) limits breakout ceiling — broad audiences may not engage`, agent: "Audience Scope Analyzer" });
  }

  if (hasUsableTranscript(analysis) && analysis.transcript.length > 50) {
    const lower = analysis.transcript.toLowerCase();
    if (lower.includes("buy") || lower.includes("subscribe") || lower.includes("link in bio")) {
      flags.push({ severity: "low", category: "fatigue_factor", description: "Promotional language detected — may trigger ad fatigue in organic feeds", agent: "Authenticity Scanner" });
    }
  }

  if (flags.length === 0) {
    flags.push({ severity: "low", category: "engagement_risk", description: "No major risks detected, but all content has a ceiling — consider A/B testing hook variants", agent: "General Advisor" });
  }

  return flags;
}

function computeRiskScore(flags: RedTeamFlag[]): number {
  let score = 0;
  for (const flag of flags) {
    if (flag.severity === "high") score += 30;
    else if (flag.severity === "medium") score += 18;
    else score += 8;
  }
  return Math.min(100, score);
}

export async function* simulateBreakout(analysis: VideoAnalysis): AsyncGenerator<SSEEvent, SimulationResult> {
  log("engine", `=== Starting simulation for analysis: ${analysis.id} (${analysis.source}) ===`);
  log("engine", `Content: "${analysis.contentCategory}" | Hook: ${analysis.hookScore} | Transcript: ${analysis.transcript.length} chars (${analysis.transcriptStatus})`);

  // Run Red Team in parallel with Wave 1 setup
  const redTeamPromise = runRedTeam(analysis);

  const waveConfigs = [
    { wave: 1 as const, impressions: 10, llm: 10 },
    { wave: 2 as const, impressions: 50, llm: 20 },
    { wave: 3 as const, impressions: 200, llm: 40 }
  ];

  const allActions: AgentAction[] = [];
  const allPersonas: Persona[] = [];
  const waveMetrics: WaveMetrics[] = [];

  let canProceed = true;

  for (const config of waveConfigs) {
    if (!canProceed) {
      log("engine", `Wave ${config.wave} skipped — did not meet promotion threshold`);
      break;
    }

    const waveStart = Date.now();
    const audience = getWaveAudience(config.wave, analysis.contentCategory, analysis.targetAudience)
      .slice(0, config.impressions)
      .map((persona, index) => ({
        ...persona,
        id: `${persona.id}-w${config.wave}-${index + 1}`
      }));
    allPersonas.push(...audience);

    log("engine", `Wave ${config.wave}: ${audience.length} personas (${config.llm} LLM, ${audience.length - config.llm} deterministic)`);
    const targetPersonaCount = audience.filter((persona) => personaIsInSelectedTarget(persona, analysis)).length;

    yield {
      type: "wave.started",
      ts: new Date().toISOString(),
      wave: config.wave,
      message: `Wave ${config.wave} started: ${targetPersonaCount}/${config.impressions} personas match ${analysis.targetAudience.label}.`
    };

    const actions: AgentAction[] = [];
    let llmCount = 0;
    let detCount = 0;
    const sharers: { persona: Persona; action: AgentAction }[] = [];

    for (let index = 0; index < audience.length; index += 1) {
      const persona = audience[index]!;
      const action = index < config.llm ? await llmAction(persona, analysis, config.wave) : deterministicAction(persona, analysis, config.wave);
      if (action.source === "llm") llmCount++;
      else detCount++;
      actions.push(action);
      allActions.push(action);

      if (action.action === "share") {
        sharers.push({ persona, action });
      }

      yield {
        type: "agent.action",
        ts: new Date().toISOString(),
        wave: config.wave,
        personaId: persona.id,
        persona,
        action
      };
    }

    // Peer-to-peer sharing: sharers forward to 1-3 "followers"
    if (sharers.length > 0) {
      const peerRecipients = generatePeerRecipients(sharers, analysis, config.wave);
      for (const { recipient, sharer, recipientAction } of peerRecipients) {
        allPersonas.push(recipient);
        actions.push(recipientAction);
        allActions.push(recipientAction);

        yield {
          type: "peer.share",
          ts: new Date().toISOString(),
          wave: config.wave,
          personaId: recipient.id,
          persona: recipient,
          action: recipientAction,
          message: `${sharer.name} shared → ${recipient.name} ${recipientAction.action === "skip" ? "ignored it" : recipientAction.action + "d"}`
        };
      }
      log("engine", `Wave ${config.wave} peer shares: ${sharers.length} sharers → ${peerRecipients.length} recipients`);
    }

    const waveElapsed = Date.now() - waveStart;
    log("engine", `Wave ${config.wave} processed in ${waveElapsed}ms (${llmCount} LLM / ${detCount} deterministic)`);


    const metrics = computeWaveMetrics(config.wave, actions);
    waveMetrics.push(metrics);

    log("engine", `Wave ${config.wave} metrics — engagement: ${(metrics.engagementRate * 100).toFixed(1)}%, shares: ${metrics.shares}/${metrics.impressions}, shareRate: ${(metrics.shareRate * 100).toFixed(1)}%`);

    yield {
      type: "wave.summary",
      ts: new Date().toISOString(),
      wave: config.wave,
      metrics,
      message: `Wave ${config.wave} ended at ${(metrics.engagementRate * 100).toFixed(1)}% engagement.`
    };

    if (config.wave === 1) {
      // Emit Red Team flags after Wave 1
      const redTeamFlags = await redTeamPromise;
      for (const flag of redTeamFlags) {
        yield {
          type: "redTeam.flag",
          ts: new Date().toISOString(),
          wave: 1,
          redTeamFlag: flag,
          message: `⚠️ ${flag.agent}: ${flag.description}`
        };
      }
      log("engine", `Red Team: ${redTeamFlags.length} flags emitted (risk score: ${computeRiskScore(redTeamFlags)})`);

      canProceed = metrics.engagementRate >= 0.10;
      log("engine", `Wave 1 → Wave 2 promotion: ${canProceed ? "YES" : "NO"} (need ≥10% engagement, got ${(metrics.engagementRate * 100).toFixed(1)}%)`);
    }
    if (config.wave === 2) {
      canProceed = metrics.engagementRate >= 0.06 && metrics.shareRate >= 0.02;
      log("engine", `Wave 2 → Wave 3 promotion: ${canProceed ? "YES" : "NO"} (need ≥6% eng + ≥2% share, got ${(metrics.engagementRate * 100).toFixed(1)}% / ${(metrics.shareRate * 100).toFixed(1)}%)`);
    }
  }

  const totalMetrics = computeWaveMetrics(0, allActions);
  const breakoutScore = computeBreakoutScore(waveMetrics.length > 0 ? waveMetrics : [totalMetrics]);
  const targetAudienceActions = getTargetAudienceActions(allActions, allPersonas, analysis);
  const targetMetrics = computeWaveMetrics(0, targetAudienceActions);
  const targetAudienceScore = computeTargetAudienceScore(allActions, allPersonas, analysis);
  const targetAudienceRecommendations = buildTargetAudienceRecommendations(analysis, targetMetrics, targetAudienceScore, targetAudienceActions);
  const comments = allActions.map((action) => action.comment).filter((value): value is string => Boolean(value));
  const redTeamFlags = await redTeamPromise;
  const riskScore = computeRiskScore(redTeamFlags);

  log("engine", `=== Simulation complete — Score: ${breakoutScore}/100, Risk: ${riskScore}/100, Total actions: ${allActions.length}, Comments: ${comments.length} ===`);

  const result: SimulationResult = {
    analysisId: analysis.id,
    promotedToWave2: waveMetrics[0]?.engagementRate >= 0.10,
    promotedToWave3: (waveMetrics[1]?.engagementRate || 0) >= 0.06 && (waveMetrics[1]?.shareRate || 0) >= 0.02,
    breakoutScore,
    riskScore,
    riskFlags: redTeamFlags,
    strongestDemographic: strongestDemographic(allActions, allPersonas),
    targetAudience: analysis.targetAudience,
    targetAudienceScore,
    totalMetrics,
    waves: waveMetrics,
    topRecommendations: [
      analysis.hookScore < 75
        ? "Improve first-frame curiosity gap to boost wave-1 retention."
        : "Preserve your strong opening and test tighter cuts after second 5.",
      totalMetrics.shareRate < 0.03
        ? "Add a social CTA that gives viewers a reason to tag or share."
        : "Double down on shareable phrasing in captions and overlays.",
      "A/B test two variants targeted at your strongest demographic cluster."
    ],
    targetAudienceRecommendations,
    comments: comments.slice(0, 25)
  };

  return result;
}
