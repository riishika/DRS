import { personaMatchesTargetAudience } from "@/lib/target-audiences";
import type { Persona, TargetAudience } from "@/types";

const ARCHETYPES: Omit<Persona, "id">[] = [
  { name: "Gen Z Trend Surfer", age: 19, interests: ["fashion", "memes", "trends"], scrollBehavior: "fast", engagementStyle: "sharer", attentionSpan: 6, contentPreferences: ["high energy", "short hooks", "trending audio"], followerCount: 620 },
  { name: "Student Side-Hustler", age: 22, interests: ["startup", "side hustle", "making money"], scrollBehavior: "moderate", engagementStyle: "commenter", attentionSpan: 12, contentPreferences: ["how-to", "income proof", "hustle motivation"], followerCount: 430 },
  { name: "Millennial Corporate", age: 31, interests: ["career advice", "corporate life", "LinkedIn culture"], scrollBehavior: "moderate", engagementStyle: "liker", attentionSpan: 14, contentPreferences: ["professional growth", "workplace humor"], followerCount: 780 },
  { name: "Open Source Dev", age: 27, interests: ["coding", "open source", "github"], scrollBehavior: "deep", engagementStyle: "commenter", attentionSpan: 20, contentPreferences: ["code demos", "tech talks", "dev tools"], followerCount: 980 },
  { name: "Photography Nerd", age: 34, interests: ["photography", "camera gear", "editing"], scrollBehavior: "deep", engagementStyle: "liker", attentionSpan: 16, contentPreferences: ["cinematic shots", "gear reviews", "editing tutorials"], followerCount: 510 },
  { name: "Gym Bro", age: 24, interests: ["gym", "lifting", "protein"], scrollBehavior: "fast", engagementStyle: "sharer", attentionSpan: 8, contentPreferences: ["workout clips", "transformation", "gym memes"], followerCount: 1250 },
  { name: "Mom Scroller", age: 39, interests: ["parenting", "kids activities", "mom hacks"], scrollBehavior: "moderate", engagementStyle: "lurker", attentionSpan: 10, contentPreferences: ["family content", "kid-safe", "relatable parenting"], followerCount: 360 },
  { name: "Ecommerce Hustler", age: 36, interests: ["dropshipping", "ecommerce", "marketing funnels"], scrollBehavior: "deep", engagementStyle: "sharer", attentionSpan: 22, contentPreferences: ["revenue screenshots", "ad strategy", "store teardowns"], followerCount: 890 },
  { name: "Meme Lord", age: 20, interests: ["memes", "shitposting", "internet culture"], scrollBehavior: "fast", engagementStyle: "sharer", attentionSpan: 5, contentPreferences: ["absurd humor", "unexpected edits", "ironic content"], followerCount: 2100 },
  { name: "UI/UX Designer", age: 29, interests: ["ui design", "figma", "design systems"], scrollBehavior: "deep", engagementStyle: "commenter", attentionSpan: 18, contentPreferences: ["design breakdowns", "before-after UI", "typography"], followerCount: 740 },
  { name: "AI Hype Beast", age: 26, interests: ["ai tools", "chatgpt", "ai automation"], scrollBehavior: "moderate", engagementStyle: "sharer", attentionSpan: 15, contentPreferences: ["ai demos", "prompt engineering", "new ai tools"], followerCount: 1400 },
  { name: "Travel Influencer", age: 28, interests: ["travel", "luxury hotels", "travel hacks"], scrollBehavior: "moderate", engagementStyle: "sharer", attentionSpan: 12, contentPreferences: ["travel vlogs", "destination reveals", "packing tips"], followerCount: 5500 },
  { name: "Boomer News Reader", age: 55, interests: ["news", "politics", "weather"], scrollBehavior: "fast", engagementStyle: "lurker", attentionSpan: 6, contentPreferences: ["news clips", "informational", "no nonsense"], followerCount: 210 },
  { name: "Foodie", age: 30, interests: ["food", "restaurants", "cooking"], scrollBehavior: "moderate", engagementStyle: "liker", attentionSpan: 11, contentPreferences: ["food close-ups", "recipe videos", "restaurant reviews"], followerCount: 1020 },
  { name: "VC / Angel Investor", age: 42, interests: ["venture capital", "startups", "fundraising"], scrollBehavior: "deep", engagementStyle: "commenter", attentionSpan: 22, contentPreferences: ["pitch decks", "market analysis", "founder stories"], followerCount: 2400 },
  { name: "Gamer", age: 21, interests: ["gaming", "fps games", "game clips"], scrollBehavior: "fast", engagementStyle: "sharer", attentionSpan: 7, contentPreferences: ["clutch moments", "rage clips", "game announcements"], followerCount: 1880 },
  { name: "Budget Traveler", age: 33, interests: ["budget travel", "backpacking", "hostels"], scrollBehavior: "moderate", engagementStyle: "commenter", attentionSpan: 14, contentPreferences: ["cheap flights", "hostel reviews", "travel budgets"], followerCount: 870 },
  { name: "BookTok Reader", age: 25, interests: ["books", "reading", "romance novels"], scrollBehavior: "deep", engagementStyle: "commenter", attentionSpan: 19, contentPreferences: ["book reviews", "reading vlogs", "book hauls"], followerCount: 420 },
  { name: "Tech Reviewer", age: 32, interests: ["smartphones", "laptops", "tech specs"], scrollBehavior: "deep", engagementStyle: "commenter", attentionSpan: 20, contentPreferences: ["unboxing", "spec comparisons", "benchmark tests"], followerCount: 3200 },
  { name: "K-Pop Stan", age: 23, interests: ["kpop", "dance covers", "idol content"], scrollBehavior: "fast", engagementStyle: "sharer", attentionSpan: 9, contentPreferences: ["fan edits", "dance challenges", "concert clips"], followerCount: 980 },
  { name: "Minimalist", age: 37, interests: ["minimalism", "decluttering", "capsule wardrobe"], scrollBehavior: "moderate", engagementStyle: "lurker", attentionSpan: 12, contentPreferences: ["clean aesthetics", "organization", "less is more"], followerCount: 460 },
  { name: "Dog Parent", age: 27, interests: ["dogs", "puppy training", "dog breeds"], scrollBehavior: "fast", engagementStyle: "sharer", attentionSpan: 7, contentPreferences: ["cute dogs", "training tips", "dog fails"], followerCount: 1320 },
  { name: "Local Activist", age: 40, interests: ["social justice", "local politics", "community organizing"], scrollBehavior: "moderate", engagementStyle: "commenter", attentionSpan: 16, contentPreferences: ["awareness posts", "petition content", "community stories"], followerCount: 690 },
  { name: "Content Strategist", age: 35, interests: ["content strategy", "algorithm hacks", "analytics"], scrollBehavior: "deep", engagementStyle: "sharer", attentionSpan: 25, contentPreferences: ["growth frameworks", "viral breakdowns", "engagement tactics"], followerCount: 4600 }
];

export function getPersonaPool(): Persona[] {
  return ARCHETYPES.map((persona, index) => ({
    ...persona,
    id: `persona-${index + 1}`
  }));
}

function interestMatch(persona: Persona, category: string): boolean {
  const categoryLower = category.toLowerCase().replace(/-/g, " ");
  const categoryWords = categoryLower.split(/\s+/).filter((w) => w.length > 3);

  return persona.interests.some((interest) => {
    const interestLower = interest.toLowerCase();
    if (categoryLower.includes(interestLower) || interestLower.includes(categoryLower)) return true;
    return categoryWords.some((w) => interestLower.includes(w));
  }) || persona.contentPreferences.some((pref) => {
    const prefLower = pref.toLowerCase();
    return categoryWords.some((w) => prefLower.includes(w));
  });
}

const CATEGORY_AFFINITY: Record<string, string[]> = {
  comedy: ["humor", "memes", "trends", "pop culture", "internet culture", "shitposting"],
  humor: ["humor", "memes", "trends", "pop culture", "internet culture"],
  memes: ["humor", "memes", "internet culture", "trends"],
  fitness: ["gym", "lifting", "protein", "nutrition", "fitness"],
  tech: ["coding", "ai tools", "smartphones", "gadgets", "apps"],
  travel: ["travel", "budget travel", "backpacking", "luxury hotels"],
  food: ["food", "restaurants", "cooking", "recipes"],
  gaming: ["gaming", "fps games", "game clips", "esports"],
  music: ["kpop", "dance covers", "music"],
  education: ["content strategy", "analytics", "growth", "startup", "side hustle"],
  "creator-education": ["content strategy", "algorithm hacks", "analytics", "growth"],
  lifestyle: ["fashion", "trends", "minimalism", "lifestyle"],
  business: ["startup", "venture capital", "ecommerce", "marketing funnels"],
  pets: ["dogs", "puppy training", "pets"],
  design: ["ui design", "figma", "design systems", "photography"],
  books: ["books", "reading", "romance novels"]
};

function getCategoryAffinityTerms(category: string): string[] {
  const lower = category.toLowerCase();
  for (const [key, terms] of Object.entries(CATEGORY_AFFINITY)) {
    if (lower.includes(key) || key.includes(lower)) return terms;
  }
  return [lower];
}

function hasAffinityWithCategory(persona: Persona, category: string): boolean {
  const terms = getCategoryAffinityTerms(category);
  const personaText = [...persona.interests, ...persona.contentPreferences].join(" ").toLowerCase();
  return terms.some((term) => personaText.includes(term));
}

function hasAffinityWithTargetAudience(persona: Persona, targetAudience?: TargetAudience): boolean {
  if (!targetAudience || targetAudience.id === "general") return false;
  return personaMatchesTargetAudience(targetAudience, persona);
}

function pickWeighted(pool: Persona[], count: number, emphasize?: string, targetAudience?: TargetAudience): Persona[] {
  const selected: Persona[] = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  if (targetAudience && targetAudience.id !== "general") {
    const targetMatched = shuffled.filter((p) => hasAffinityWithTargetAudience(p, targetAudience));
    const categoryMatched = shuffled.filter((p) => !hasAffinityWithTargetAudience(p, targetAudience) && emphasize && hasAffinityWithCategory(p, emphasize));
    const unmatched = shuffled.filter((p) => !targetMatched.includes(p) && !categoryMatched.includes(p));

    for (const p of targetMatched) {
      if (selected.length >= count) break;
      selected.push(p);
    }
    for (const p of categoryMatched) {
      if (selected.length >= count) break;
      selected.push(p);
    }
    for (const p of unmatched) {
      if (selected.length >= count) break;
      selected.push(p);
    }
  } else if (emphasize) {
    const matched = shuffled.filter((p) => hasAffinityWithCategory(p, emphasize));
    const unmatched = shuffled.filter((p) => !hasAffinityWithCategory(p, emphasize));

    for (const p of matched) {
      if (selected.length >= count) break;
      selected.push(p);
    }
    for (const p of unmatched) {
      if (selected.length >= count) break;
      selected.push(p);
    }
  } else {
    for (const p of shuffled) {
      if (selected.length >= count) break;
      selected.push(p);
    }
  }

  while (selected.length < count) {
    selected.push(pool[selected.length % pool.length]!);
  }
  return selected;
}

export function getWaveAudience(wave: 1 | 2 | 3, category: string, targetAudience?: TargetAudience): Persona[] {
  const pool = getPersonaPool();
  if (wave === 1) {
    return pickWeighted(pool, 10, category, targetAudience);
  }
  if (wave === 2) {
    return pickWeighted(pool, 50, category, targetAudience);
  }
  return pickWeighted(pool, 200, undefined, targetAudience);
}
