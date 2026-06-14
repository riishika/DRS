import type { Persona, TargetAudience, TargetAudienceId } from "@/types";

export const TARGET_AUDIENCES: TargetAudience[] = [
  {
    id: "general",
    label: "Broad Instagram",
    description: "Mixed casual scrollers across interests.",
    interests: ["memes", "trends", "lifestyle", "humor", "friends"],
    contentPreferences: ["short hooks", "clear payoff", "shareable moments"],
    recommendationAngles: ["universal emotional payoff", "simple caption", "clear share reason"]
  },
  {
    id: "gen_z",
    label: "Gen Z Trend Crowd",
    description: "Fast scrollers who share memes, trends, fashion, and internet culture.",
    interests: ["fashion", "memes", "trends", "internet culture", "pop culture"],
    contentPreferences: ["high energy", "short hooks", "trending audio", "unexpected edits"],
    recommendationAngles: ["trend-native opening", "fast visual punchline", "comment bait"]
  },
  {
    id: "creators",
    label: "Creators & Growth Nerds",
    description: "Creators, strategists, and social media operators looking for formats that work.",
    interests: ["content strategy", "algorithm hacks", "analytics", "growth", "creator tools"],
    contentPreferences: ["breakout breakdowns", "growth frameworks", "engagement tactics", "clear examples"],
    recommendationAngles: ["format breakdown", "save-worthy framework", "repeatable tactic"]
  },
  {
    id: "founders",
    label: "Founders & Startup People",
    description: "Builders, side-hustlers, founders, investors, and ecommerce operators.",
    interests: ["startup", "side hustle", "making money", "venture capital", "ecommerce"],
    contentPreferences: ["income proof", "market insight", "founder stories", "revenue screenshots"],
    recommendationAngles: ["business outcome", "proof point", "contrarian founder lesson"]
  },
  {
    id: "developers",
    label: "Developers & AI Builders",
    description: "Coders, open source developers, AI-tool fans, and technical builders.",
    interests: ["coding", "open source", "github", "ai tools", "ai automation"],
    contentPreferences: ["code demos", "dev tools", "ai demos", "prompt engineering"],
    recommendationAngles: ["technical payoff", "before-after workflow", "tool demo clarity"]
  },
  {
    id: "fitness",
    label: "Fitness Crowd",
    description: "Gym, nutrition, workout, and body-transformation audiences.",
    interests: ["gym", "lifting", "protein", "nutrition", "fitness"],
    contentPreferences: ["workout clips", "transformation", "gym memes", "form tips"],
    recommendationAngles: ["visible transformation", "specific workout promise", "saveable routine"]
  },
  {
    id: "food",
    label: "Foodies",
    description: "Restaurant, recipe, cooking, and food close-up audiences.",
    interests: ["food", "restaurants", "cooking", "recipes"],
    contentPreferences: ["food close-ups", "recipe videos", "restaurant reviews", "ingredient reveals"],
    recommendationAngles: ["sensory close-up", "recipe payoff", "craveable first frame"]
  },
  {
    id: "travel",
    label: "Travel People",
    description: "Travel, backpacking, budget travel, and hotel discovery audiences.",
    interests: ["travel", "budget travel", "backpacking", "hostels", "luxury hotels"],
    contentPreferences: ["destination reveals", "packing tips", "cheap flights", "travel budgets"],
    recommendationAngles: ["destination reveal", "cost or itinerary detail", "save-for-later framing"]
  },
  {
    id: "gamers",
    label: "Gamers",
    description: "Gaming clip, streamer, esports, and game-announcement audiences.",
    interests: ["gaming", "fps games", "game clips", "esports"],
    contentPreferences: ["clutch moments", "rage clips", "game announcements", "stream highlights"],
    recommendationAngles: ["clutch payoff", "setup-to-reaction pacing", "loopable moment"]
  },
  {
    id: "parents",
    label: "Parents",
    description: "Parents looking for family, kids activities, and relatable home-life content.",
    interests: ["parenting", "kids activities", "mom hacks", "family content"],
    contentPreferences: ["relatable parenting", "kid-safe", "family content", "practical tips"],
    recommendationAngles: ["relatable parent problem", "practical takeaway", "family-safe framing"]
  },
  {
    id: "designers",
    label: "Designers & Visual Creatives",
    description: "UI/UX, photography, editing, typography, and visual-craft audiences.",
    interests: ["ui design", "figma", "design systems", "photography", "editing"],
    contentPreferences: ["design breakdowns", "before-after UI", "cinematic shots", "typography"],
    recommendationAngles: ["before-after contrast", "visual craft detail", "saveable teardown"]
  }
];

export function getTargetAudience(id?: FormDataEntryValue | TargetAudienceId | string | null): TargetAudience {
  const normalized = typeof id === "string" ? id : "general";
  return TARGET_AUDIENCES.find((audience) => audience.id === normalized) || TARGET_AUDIENCES[0]!;
}

export function targetAudienceMatchesText(targetAudience: TargetAudience, text: string): boolean {
  const haystack = text.toLowerCase();
  return [...targetAudience.interests, ...targetAudience.contentPreferences].some((term) => haystack.includes(term.toLowerCase()));
}

export function personaMatchesTargetAudience(targetAudience: TargetAudience, persona: Persona): boolean {
  if (targetAudience.id === "general") return true;
  const personaText = [...persona.interests, ...persona.contentPreferences].join(" ").toLowerCase();
  return [...targetAudience.interests, ...targetAudience.contentPreferences].some((term) => {
    const normalized = term.toLowerCase();
    if (personaText.includes(normalized)) return true;
    const importantWords = normalized.split(/\s+/).filter((word) => word.length > 3);
    return importantWords.some((word) => personaText.includes(word));
  });
}

export function buildTargetAudienceText(targetAudience: TargetAudience): string {
  return [...targetAudience.interests, ...targetAudience.contentPreferences, ...targetAudience.recommendationAngles].join(" ");
}
