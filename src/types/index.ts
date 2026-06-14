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

export type VideoAnalysis = {
  id: string;
  summary: string;
  contentCategory: string;
  hookScore: number;
  scrollStoppingScore: number;
  visualSignals: string[];
  audioSignals: string[];
  transcript: string;
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
  viralityScore: number;
  riskScore: number;
  riskFlags: RedTeamFlag[];
  strongestDemographic: string;
  totalMetrics: WaveMetrics;
  waves: WaveMetrics[];
  topRecommendations: string[];
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
