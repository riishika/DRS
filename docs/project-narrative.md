# Breakout Prediction Simulator - Project Narrative

## Problem
Creators publish short-form videos with little predictive feedback before posting. They need a fast pre-publish signal for potential reach and audience reaction.

## Approach
We built a multimodal simulator that combines video/audio analysis with an Instagram-style distribution model. Instead of a static score, it shows wave-by-wave behavior from synthetic personas in real time.

## System
1. Video upload and media extraction (frames + audio + metadata)
2. Multimodal analysis using GPT-4o and Whisper
3. Tiered simulation engine:
   - Wave 1: 10 LLM personas
   - Wave 2: 20 LLM + 30 deterministic
   - Wave 3: 40 LLM + 160 deterministic
4. Streaming dashboard via SSE with per-wave metrics and final report

## Differentiators
- Multimodal input (vision + speech), not title-only scoring
- Dynamic spread simulation with progression thresholds
- Real-time judge-friendly visualization
- Actionable output: recommendations tied to observed bottlenecks

## Limitations
- Not connected to real social platform telemetry
- Persona behavior is synthetic and heuristic in deterministic mode
- Session cache is temporary (no historical learning)

## Roadmap
- Add persistent storage and experiment history
- Fine-tune persona calibration on real campaign datasets
- Support A/B variant comparisons and automatic hook rewriting
