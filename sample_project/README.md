# Rental Voice Agent — AI-Powered Voice Rental Assistant

An AI-powered voice sales agent that sits between property listings and prospective tenants, handling the full inquiry-to-viewing pipeline automatically. Built on Agora's Conversational AI Engine.

## Overview

Solo and small-scale residential landlords in the Philippines (managing 1-10 units) lose prospective tenants every day because they cannot respond to inquiries fast enough. This system solves that with a **voice-first, bilingual (Taglish), 24/7 AI agent**.

## Features

- **Voice-first calls** — Real-time phone/voice experience powered by Agora RTC
- **Bilingual Taglish** — Natural Filipino/English code-switching
- **5-stage pipeline** — Inquiry → Qualification → Scheduling → Requirements → Follow-up
- **Landlord dashboard** — Unit knowledge base editor, viewing schedule, lead pipeline, call transcripts
- **24/7 availability** — Never miss an inquiry with graceful human handoff
- **Live transcript** — Real-time conversation transcription via RTM

## Architecture

```
[Tenant Phone/App] → [Agora Conversational AI Engine] → [Business Server] → [Landlord Dashboard]
                          ├── ASR: Deepgram STT
                          ├── LLM: OpenAI GPT-4o-mini
                          └── TTS: MiniMax TTS
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| RTC | `agora-rtc-react` |
| RTM | `agora-rtm` |
| AI Toolkit | `agora-agent-client-toolkit`, `agora-agent-server-sdk` |
| UI Kit | `agora-agent-uikit` |
| Styling | Tailwind CSS, shadcn/ui |
| LLM | OpenAI GPT-4o-mini |
| STT | Deepgram Nova-3 |
| TTS | MiniMax Speech 2.6 Turbo |

## Project Structure

```
app/
├── api/
│   ├── generate-agora-token/   — RTC + RTM token generation
│   ├── invite-agent/           — Agent session startup with landlord prompts
│   ├── stop-conversation/      — Agent shutdown
│   ├── update-agent/           — Mid-session context injection
│   ├── webhooks/               — Agent event receiver
│   ├── landlords/[id]/         — Landlord profile CRUD
│   └── bookings/               — Booking records CRUD
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── LandlordDashboard.tsx         — Dashboard with tab navigation
├── UnitKnowledgeBaseEditor.tsx   — Unit setup, rules, FAQs
├── ViewingScheduleManager.tsx    — Viewing slot management
├── LeadPipelineView.tsx          — Lead pipeline visualization
├── TranscriptViewer.tsx          — Call transcript viewer
├── CallNotificationPanel.tsx     — Live call notifications & handoff
├── CallInterface.tsx             — Tenant-facing voice call entry
├── ConversationComponent.tsx     — RTC join, transcript, visualizer
└── ui/                           — shadcn UI primitives

lib/
├── prompts.ts    — Taglish system prompt builders
├── webhooks.ts   — Webhook event dispatcher
├── utils.ts      — Shared utilities
└── agora.ts      — Agent UID defaults

types/
└── index.ts      — TypeScript data models
```

## Getting Started

### Prerequisites

- Node.js >= 22
- [Agora account](https://console.agora.io/) with Conversational AI activated
- OpenAI API key

### Environment Setup

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_AGORA_APP_ID` | Agora App ID from Console |
| `NEXT_AGORA_APP_CERTIFICATE` | Agora App Certificate |
| `NEXT_LLM_API_KEY` | OpenAI API key |

### Install & Run

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landlord dashboard.

### Docker (other devices)

The app runs in Docker with a persistent SQLite volume. Agora, OpenAI, and other cloud APIs are still configured via your `.env` file (they are not bundled in the image).

From `sample_project/`:

```bash
cp .env.docker.example .env
# Edit .env with your Agora and optional API keys

docker compose up --build
```

From the repo root (`agora_test/`):

```bash
cp sample_project/.env.docker.example sample_project/.env
# Edit sample_project/.env

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Demo logins: `admin` / `admin123`, `user` / `user123`.

| Item | Notes |
|------|--------|
| Port | Override with `APP_PORT=3001` if 3000 is taken |
| Database | Stored in Docker volume `rental-voice-agent-sqlite` |
| First start | Runs `prisma db push` and seed automatically |

### Deploy to Vercel

**Option A (dashboard):** Settings → **Build and Deployment** (not General) → scroll to **Root Directory** → set `sample_project` → Save.

**Option B (no UI field):** Use the repo-root `vercel.json`, which runs install/build inside `sample_project` (works when deploying `main`).

1. **Production Branch**: `hana` or `main`.
2. **Node.js**: 22. Add env vars from `.env.local.example` (including Neon `DATABASE_URL`).
3. Redeploy after changing env vars or `NEXT_PUBLIC_*` values.

## Agent Pipeline

The voice agent handles five stages:

1. **Inquiry** — Greets tenant, answers FAQs from the knowledge base
2. **Qualification** — Asks screening questions (occupants, pets, move-in timeline)
3. **Scheduling** — Books a viewing appointment
4. **Requirements** — Recites move-in requirements
5. **Follow-up** — Outbound calls for reminders and re-engagement

Human handoff is triggered when the tenant asks for the owner, a question is outside the knowledge base, or price negotiation is requested.

## License

MIT
