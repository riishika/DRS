export type ScrollBehavior = "fast" | "moderate" | "deep";
export type EngagementStyle = "lurker" | "liker" | "commenter" | "sharer";

export type Persona = {
  id: string;
  name: string;
  age: number;
  interests: string[];
  scrollBehavior: ScrollBehavior;
  engagementStyle: EngagementStyle;
  attentionSpan: number;
  contentPreferences: string[];
  followerCount: number;
};

export type VideoMetadata = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
  sampledFrameCount: number;
  visualCoverage: "full-video-storyboard" | "fallback";
};

export type TranscriptStatus = "spoken" | "visual_text" | "no_speech" | "no_audio" | "unavailable";

export type TargetAudienceId =
  | "general"
  | "gen_z"
  | "creators"
  | "founders"
  | "developers"
  | "fitness"
  | "food"
  | "travel"
  | "gamers"
  | "parents"
  | "designers";

export type TargetAudience = {
  id: TargetAudienceId;
  label: string;
  description: string;
  interests: string[];
  contentPreferences: string[];
  recommendationAngles: string[];
};

export type VideoAnalysis = {
  id: string;
  summary: string;
  contentCategory: string;
  hookScore: number;
  scrollStoppingScore: number;
  visualSignals: string[];
  visualNarrative: string;
  textOverlays: string[];
  audioSignals: string[];
  transcript: string;
  transcriptStatus: TranscriptStatus;
  targetAudience: TargetAudience;
  recommendations: string[];
  metadata: VideoMetadata;
  createdAt: string;
  source: "demo" | "live" | "fallback";
  _framePaths?: string[];
};

export type AgentActionType = "skip" | "like" | "comment" | "share" | "save";

export type AgentAction = {
  personaId: string;
  wave: number;
  action: AgentActionType;
  watchDuration: number;
  reasoning: string;
  comment?: string;
  emotionalResponse: string;
  source: "llm" | "deterministic";
  sharedBy?: string;
};

export type PersonaAction = AgentAction & {
  receivedAt: string;
};

export type WaveMetrics = {
  wave: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  skips: number;
  avgWatchDuration: number;
  engagementScore: number;
  engagementRate: number;
  shareRate: number;
};

export type SimulationResult = {
  analysisId: string;
  promotedToWave2: boolean;
  promotedToWave3: boolean;
  breakoutScore: number;
  riskScore: number;
  riskFlags: RedTeamFlag[];
  strongestDemographic: string;
  targetAudience: TargetAudience;
  targetAudienceScore: number;
  totalMetrics: WaveMetrics;
  waves: WaveMetrics[];
  topRecommendations: string[];
  targetAudienceRecommendations: string[];
  comments: string[];
};

export type RedTeamFlag = {
  severity: "low" | "medium" | "high";
  category: string;
  description: string;
  agent: string;
};

export type SimulationEventType =
  | "analysis.ready"
  | "wave.started"
  | "agent.action"
  | "peer.share"
  | "redTeam.flag"
  | "wave.summary"
  | "simulation.complete"
  | "simulation.error";

export type SSEEvent = {
  type: SimulationEventType;
  ts: string;
  wave?: number;
  personaId?: string;
  persona?: Persona;
  action?: AgentAction;
  metrics?: WaveMetrics;
  result?: SimulationResult;
  message?: string;
  redTeamFlag?: RedTeamFlag;
};

export type AnalyzeResponse = {
  analysisId: string;
  metadata: VideoMetadata;
  analysis: VideoAnalysis;
  analysisStatus: "ready";
  frames?: string[];
};
