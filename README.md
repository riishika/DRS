# Virality Prediction Simulator

A pre-flight content evaluator that uses 260 AI persona agents to simulate how a short-form video would spread on Instagram before you post it.

Upload a video. GPT-4o analyzes the frames. Whisper transcribes the audio. Then 260 niche-focused personas independently decide to skip, like, comment, share, or save — propagating in 3 waves with real-time visualization.

---

## How It Works

1. **Video Upload** — User uploads a short video (MP4, MOV, WebM, max 60s)
2. **Multimodal Analysis** — GPT-4o vision analyzes 12 sampled frames; Whisper-1 transcribes audio
3. **Wave Simulation** — 260 personas evaluate the content in 3 waves:
   - Wave 1: 10 LLM-powered personas (targeted audience)
   - Wave 2: 50 personas (20 LLM + 30 deterministic) — requires 10% engagement threshold
   - Wave 3: 200 personas (40 LLM + 160 deterministic) — requires 6% engagement + 2% share rate
4. **Peer-to-Peer Sharing** — Personas who share forward the video to 1-3 friends who make independent decisions
5. **Red Team Guardian** — An adversarial agent identifies content risks and brand safety issues
6. **What-If Mode** — Re-run with modified parameters to see how changes affect the score

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| AI Models | GPT-4o (vision), GPT-4.1 (persona agents), Whisper-1 (audio) |
| Streaming | Server-Sent Events (SSE) |
| State | Zustand |
| Visualization | Custom SVG network graph, Recharts |
| Styling | Tailwind CSS, Framer Motion |
| Video Processing | ffmpeg/ffprobe (server-side) |
| Validation | Zod |

---

## Prerequisites

- **Node.js** 18+ 
- **ffmpeg** and **ffprobe** installed and available in PATH
- **OpenAI API key** with access to GPT-4o, GPT-4.1, and Whisper-1

### Install ffmpeg (macOS)

```bash
brew install ffmpeg
```

### Install ffmpeg (Ubuntu/Debian)

```bash
sudo apt-get install ffmpeg
```

---

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd virality-prediction-simulator

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

Edit `.env.local` with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

---

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
  app/
    page.tsx                    # Main dashboard (upload, graph, results)
    stats/page.tsx              # Detailed analytics page
    api/
      analyze/route.ts          # POST — video upload + AI analysis
      simulate/stream/route.ts  # GET — SSE simulation stream
      simulate/whatif/route.ts  # POST — what-if re-run with tweaks
  components/
    VideoUpload.tsx             # Drag-drop upload
    LiveNetworkGraph.tsx        # Interactive propagation visualization (zoom/pan/click)
    AnalysisPanel.tsx           # AI analysis display (frames, transcript, signals)
    ActionFeed.tsx              # Real-time persona decisions feed
    ReasoningPanel.tsx          # Agent reasoning traces (why they decided)
    RedTeamPanel.tsx            # Risk assessment from guardian agents
    ResultsPanel.tsx            # Final virality + risk scores
    WhatIfPanel.tsx             # Parameter tweaking for re-runs
    SimulationView.tsx          # Wave metrics charts
    CommentFeed.tsx             # Generated persona comments
    AIPipelineStatus.tsx        # Pipeline progress indicator
  lib/
    analysis.ts                 # GPT-4o vision + Whisper transcription
    simulation.ts               # Core simulation engine (waves, agents, red team)
    personas.ts                 # 24 niche-focused persona archetypes
    video-processor.ts          # ffmpeg frame/audio extraction
    cache.ts                    # In-memory analysis cache (survives hot reloads)
    openai.ts                   # OpenAI client configuration
    sse.ts                      # SSE formatting utilities
  store/
    simulation-store.ts         # Zustand state management
  types/
    index.ts                    # All shared TypeScript types
```

---

## Key Design Decisions

**1-dimensional personas**: Each persona cares exclusively about their niche interests. A "Gym Bro" will skip anything not related to fitness. This creates realistic engagement distributions where only relevant audiences engage.

**Wave threshold gating**: Content must earn its way to broader distribution, mirroring how real platform algorithms promote content based on early engagement signals.

**Structured JSON outputs**: All LLM agent responses use `response_format: { type: "json_object" }` for reliable parsing.

**In-memory cache**: Analysis results persist on `globalThis` to survive Next.js hot reloads during development. No database required for demo purposes.

---

## API Endpoints

### `POST /api/analyze`

Accepts a video file via multipart form data. Returns analysis ID, metadata, frame previews, and AI analysis.

### `GET /api/simulate/stream?analysisId=<id>`

Opens an SSE stream that emits events as 260 personas make decisions in real-time.

Event types: `analysis.ready`, `wave.started`, `agent.action`, `peer.share`, `redTeam.flag`, `wave.summary`, `simulation.complete`

### `POST /api/simulate/whatif`

Accepts tweaked parameters (hook score, category) and re-runs Wave 1 to show score impact.

---

## Cost Per Simulation

- Video analysis (12 frames via GPT-4o): ~$0.03
- Audio transcription (Whisper): ~$0.01
- Wave 1 (10 LLM agents): ~$0.02
- Wave 2 (20 LLM agents): ~$0.04
- Wave 3 (40 LLM agents): ~$0.08
- Red Team (1 LLM call): ~$0.01
- **Total**: ~$0.19 per full simulation

---

## License

MIT
