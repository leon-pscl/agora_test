# Agent Guide — Rental Voice Agent

Use this file as the primary agent-facing guide for the `rental-voice-agent` project.
Keep it up to date whenever architecture, workflow, or feature scope changes.

---

## Project Overview

An AI-powered voice rental agent for Philippine small landlords, built on Agora's
Conversational AI Engine. Tenants call in via browser; an AI agent handles the
conversation using a landlord-specific knowledge base. Landlords manage their units,
availability, and leads via a dashboard.

**Status:** Active development — not yet deployed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Voice (RTC) | `agora-rtc-react` |
| Transcripts (RTM) | `agora-rtm` |
| Agent helpers | `agora-agent-client-toolkit` |
| UI primitives | `agora-agent-uikit` |
| AI pipeline | Classic ASR → LLM → TTS via Agora Conversational AI Engine |
| Package manager | `pnpm` |

---

## AI Conversation Pipeline

Agora's classic cascading pipeline is used:

```
Tenant voice
    ↓
ASR  (speech → text)
    ↓
LLM  (text → text, using landlord system prompt)
    ↓
TTS  (text → speech)
    ↓
Tenant hears response
```

**Agent lifecycle (server side):**

1. Client calls `POST /api/generate-agora-token` to get RTC + RTM tokens.
2. Client calls `POST /api/invite-agent` to start the managed agent session with a
   landlord-specific system prompt.
3. Agent joins the RTC channel and begins conversing with the tenant.
4. Mid-session context can be injected via `POST /api/update-agent`.
5. Session ends via `POST /api/stop-conversation` or an agent-initiated handoff.
6. Agent events (joined, left, handoff, booking) are received at `POST /api/webhooks`.

**System prompts** are built in `lib/prompts.ts` and are written in **Taglish**
(Filipino/English mix) for natural conversation. Each pipeline stage (greeting,
qualification, FAQ, booking, handoff) has its own prompt builder.

**Agora region:** `Area.AP` (Asia-Pacific, for Philippine proximity).

---

## Key Files

### API Routes (`app/api/`)

| Route | Purpose |
|---|---|---|
| `generate-agora-token/route.ts` | RTC + RTM token generation via `RtcTokenBuilder.buildTokenWithRtm` |
| `invite-agent/route.ts` | Start managed agent session with landlord-specific prompt |
| `stop-conversation/route.ts` | Shut down agent session |
| `update-agent/route.ts` | Mid-session context injection |
| `webhooks/route.ts` | Receive and dispatch agent events (joined, left, handoff, booking) |
| `landlords/[landlord_id]/route.ts` | Landlord profile CRUD |
| `bookings/route.ts` | Booking records CRUD |
| `transcripts/route.ts` | Save and retrieve call transcripts (in-memory) |
| `diagnostics/route.ts` | Environment config health check endpoint |

### Components

| Component | Purpose |
|---|---|
| `LandlordDashboard.tsx` | Main dashboard with tab navigation |
| `UnitKnowledgeBaseEditor.tsx` | Unit setup, rules, FAQs per landlord |
| `ViewingScheduleManager.tsx` | Viewing slot management |
| `LeadPipelineView.tsx` | Lead pipeline visualization |
| `TranscriptViewer.tsx` | Call transcript viewer |
| `CallNotificationPanel.tsx` | Live call notifications and handoff triggers |
| `CallInterface.tsx` | Tenant-facing voice call experience |
| `ConversationComponent.tsx` | RTC join, transcript display, audio visualizer |

### Library

| File | Purpose |
|---|---|
| `lib/prompts.ts` | System prompt builders per pipeline stage |
| `lib/webhooks.ts` | Webhook event dispatcher |
| `lib/agora.ts` | Shared Agora constants (default agent UID) |
| `lib/utils.ts` | Utility helpers: `cn()`, `generateId()`, `formatDateTime()` |
| `.env.local.example` | Local environment variable template |

---

## Data & Persistence

> ⚠️ **No database is currently wired up.** This is an open task.

Before building features that read or write persistent data, first determine and document
the storage strategy. Likely candidates are:

- A hosted Postgres instance (e.g. Supabase, Neon) accessed via Prisma or Drizzle
- A simple key-value store (e.g. Upstash Redis) for session-scoped data
- JSON files for local development only

Until a database is confirmed, treat all data as **in-memory or ephemeral**. Do not
assume any persistence layer exists. Flag missing persistence explicitly in PRs and
tasks rather than silently papering over it.

---

## Authentication

> ⚠️ **Auth is not yet implemented.** This is an open task.

The landlord dashboard and all `app/api/landlords/[landlord_id]` routes need to be
protected. When implementing auth:

- Use Next.js middleware (`middleware.ts`) to guard `/dashboard` and `/api/landlords/*`
- Consider NextAuth.js or Clerk for the auth provider
- Landlord identity must flow through to the `invite-agent` route so the correct
  system prompt and knowledge base are loaded

Do not expose landlord data or agent session controls to unauthenticated requests.

---

## Landlord Dashboard Feature Set

The dashboard (`LandlordDashboard.tsx`) is the primary landlord interface, organized
into tabs:

**Knowledge Base** (`UnitKnowledgeBaseEditor.tsx`)
- Define unit details: address, price, size, amenities
- Set house rules and restrictions
- Add FAQs the AI agent will use to answer tenant questions

**Schedule** (`ViewingScheduleManager.tsx`)
- Add, edit, and remove available viewing slots
- Slots are passed to the agent so it can book appointments

**Lead Pipeline** (`LeadPipelineView.tsx`)
- View tenants who have called in, organized by stage
- Manually advance or disqualify leads

**Transcripts** (`TranscriptViewer.tsx`)
- Review full conversation transcripts per call
- Linked to webhook-captured session data

**Live Calls** (`CallNotificationPanel.tsx`)
- Receive real-time notifications when a call is in progress
- Trigger handoff from AI agent to landlord

---

## Working Rules

- Keep the RTC client creation StrictMode-safe: use `useRef`, not `useMemo`.
- Token route must use `RtcTokenBuilder.buildTokenWithRtm` — do not switch builders.
- Transcript UID remapping must stay aligned with the `agora-agent-client-toolkit`
  sentinel behavior. Do not remap UIDs independently.
- System prompts are Taglish by design. Do not translate them to pure English.
- Always use `Area.AP` for Agora region config.
- Do not introduce a database or auth library without first documenting the choice here
  and in a relevant ADR or PR description.

---

## Commands

```bash
pnpm install        # install dependencies
pnpm run dev        # start local dev server (next dev --webpack)
pnpm run verify     # full check: doctor + lint + typecheck + verify:api + build
```

Narrower checks (run these first for targeted changes):

```bash
pnpm run doctor     # env var / file existence check
pnpm run lint       # ESLint
pnpm run typecheck  # tsc --noEmit
pnpm run verify:api # API route contract verification
pnpm run build      # Next.js production build
```

---

## Done Criteria

1. Run the **narrowest relevant** validation command for your change.
2. For any shipped app or runtime change, `pnpm run verify` must pass cleanly.
3. If you add, remove, or rename a route, component, or library — update this file.
4. If you resolve an open task (database, auth), remove the ⚠️ notice and document
   what was chosen and why.
