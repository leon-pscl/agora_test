# Rental Voice Agent — AI-Powered Voice Rental Assistant

An AI-powered voice rental agent for small-scale Philippine landlords (1–10 units). Prospective tenants call in via browser and converse with an AI agent in natural Taglish (Filipino/English mix). The agent answers FAQs, qualifies leads, books viewings, and hands off to the human landlord when needed. Landlords manage their units, availability, and leads through a dashboard.

Built on the **Agora Conversational AI Engine** with RTC for real-time audio and RTM for live transcript delivery.

---

## Architecture

```
[Browser Client]                        [Next.js Server]                [Agora Cloud]
      │                                      │                              │
      │  POST /api/generate-agora-token      │                              │
      │─────────────────────────────────────>│                              │
      │<───────── token + uid + channel ─────│                              │
      │                                      │                              │
      │  POST /api/invite-agent              │                              │
      │  (requester_id, channel_name)        │                              │
      │─────────────────────────────────────>│                              │
      │                                      │  POST /join                  │
      │                                      │─────────────────────────────>│
      │                                      │<──────── agent_id ──────────│
      │<──────────── agent_id ───────────────│                              │
      │                                      │                              │
      │  ┌─ RTC Join ──────────────────────┐ │                              │
      │  │ Channel: {channel}              │ │                              │
      │  │ Publish: local mic audio        │ │                              │
      │  │ Subscribe: agent audio          │ │                              │
      │  └─────────────────────────────────┘ │                              │
      │  ┌─ RTM Subscribe ────────────────┐ │                              │
      │  │ Channel: {channel}             │ │                              │
      │  │ Receive: transcripts, state    │ │                              │
      │  └─────────────────────────────────┘ │                              │
      │                                      │                              │
      │              │ Audio Flow │           │                              │
      │<─────────────────────────────────────────────────────────────────────│
      │   Tenant voice ──> ASR ──> LLM ──> TTS ──> Tenant hears response    │
      │                                      │                              │
      │  POST /api/stop-conversation         │                              │
      │─────────────────────────────────────>│  POST /leave                 │
      │                                      │─────────────────────────────>│
```

### AI Pipeline (Agora Conversational AI Engine)

```
Tenant voice → ASR (Deepgram Nova-2) → LLM (OpenAI GPT-4o-mini) → TTS (MiniMax) → Tenant hears response
```

The AI pipeline runs entirely on Agora's cloud infrastructure. The client only publishes raw microphone audio and receives processed audio back. No audio processing happens on the client or the Next.js server.

### Conversation Stages

1. **Inquiry** — Agent greets tenant, answers FAQs from the landlord's knowledge base
2. **Qualification** — Asks screening questions (occupants, pets, move-in date, employment)
3. **Scheduling** — Books a viewing appointment
4. **Requirements** — Recites move-in requirements
5. **Follow-up** — Outbound calls for reminders and re-engagement

Human handoff triggers when the tenant asks for the owner, a question falls outside the knowledge base, or price negotiation is requested.

---

## Agora SDK Integration

### Conversational AI Engine (`agora-agent-server-sdk`)

The server-side TypeScript SDK manages the full agent lifecycle:

- **`app/api/invite-agent/route.ts`** — Creates an `AgoraClient` (with `Area.AP` for Asia-Pacific), builds an `Agent` with STT/LLM/TTS configuration, and calls `session.start()` which sends `POST /join` to Agora's ConvoAI API. The agent joins the specified RTC channel and begins the conversation pipeline.
- **`app/api/stop-conversation/route.ts`** — Calls `client.stopAgent(agentId)` to shut down the session via `POST /leave`.
- **`app/api/update-agent/route.ts`** — Pushes mid-session context updates via `client.agents.update()` using a generated ConvoAI token for auth.
- **`app/api/generate-agora-token/route.ts`** — Uses `RtcTokenBuilder.buildTokenWithRtm` to mint combined RTC+RTM tokens (not separate tokens).

### RTC SDK (`agora-rtc-react`)

The React SDK handles client-side media:

- **`CallInterface.tsx`** — Creates the RTC client with `useRef` (StrictMode-safe) and wraps child components in `AgoraRTCProvider`.
- **`ConversationComponent.tsx`** — Uses `useJoin` to join the RTC channel, `useLocalMicrophoneTrack` to capture microphone audio, `usePublish` to send audio to the channel, `useRemoteUsers` to detect when the AI agent has joined, and `useClientEvent` for connection state changes and token renewal.
- The agent's `RemoteUser` component is rendered (hidden) to subscribe to the agent's outgoing audio track.

### RTM SDK (`agora-rtm`)

Used for real-time transcript delivery and agent state events:

- Client calls `rtm.login({ token })` and `rtm.subscribe(channel, { withPresence: true })` after obtaining tokens.
- `ConversationComponent.tsx` initializes `AgoraVoiceAI` from `agora-agent-client-toolkit` which wraps the RTM client and emits `TRANSCRIPT_UPDATED` and `AGENT_STATE_CHANGED` events.
- Transcripts are rendered in real-time alongside the audio visualizer from `agora-agent-uikit`.

### Token Flow

1. Client calls `GET /api/generate-agora-token` which returns a combined RTC+RTM token via `buildTokenWithRtm`
2. Client uses the same token for both RTC channel join and RTM login
3. On `token-privilege-will-expire`, the client requests fresh tokens and calls `client.renewToken()` and `rtmClient.renewToken()`

### Working Rules

- RTC client creation uses `useRef`, not `useMemo` (StrictMode-safe)
- Token generation uses `RtcTokenBuilder.buildTokenWithRtm` exclusively
- Agora region is always `Area.AP` (Asia-Pacific for Philippine proximity)
- System prompts are Taglish by design

---

## Setup

### Prerequisites

- Node.js >= 22
- [Agora account](https://console.agora.io/) with Conversational AI Engine enabled
- OpenAI API key (for the LLM)

### Environment Setup

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_AGORA_APP_ID` | Agora App ID from Console |
| `NEXT_AGORA_APP_CERTIFICATE` | Agora App Certificate |
| `NEXT_LLM_API_KEY` | OpenAI API key |

Optional variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_AGENT_UID` | `123456` | UID used by the AI agent in the RTC channel |
| `NEXT_PUBLIC_LANDLORD_ID` | `default-landlord` | Which landlord profile to load |
| `NEXT_AGENT_NAME` | `Maria` | Agent's name in greetings |
| `NEXT_AGENT_GREETING` | (Taglish greeting) | Custom greeting message |
| `NEXT_DEEPGRAM_API_KEY` | — | Deepgram API key (uses managed default if omitted) |
| `NEXT_AZURE_TTS_KEY` | — | Azure TTS key (for custom TTS) |
| `NEXT_AZURE_TTS_REGION` | — | Azure TTS region |
| `NEXT_AZURE_TTS_VOICE_NAME` | `fil-PH-BlessicaNeural` | Azure TTS voice |

### Install & Run

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landlord dashboard. Click "Test Call" to open the tenant-facing voice call interface.

### Verification

```bash
pnpm run doctor      # Check env vars and file structure
pnpm run lint        # ESLint
pnpm run typecheck   # TypeScript type checking
pnpm run verify:api  # API route contract checks
pnpm run build       # Production build
pnpm run verify      # All of the above sequentially
```

---

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
│   ├── bookings/               — Booking records CRUD
│   ├── transcripts/            — Call transcript storage
│   └── diagnostics/            — Environment config health check
├── globals.css
├── layout.tsx
└── page.tsx                    — Landing page (dashboard + call entry)

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
├── utils.ts      — Shared utilities (cn, generateId, formatDateTime)
└── agora.ts      — Agent UID defaults

types/
└── index.ts      — TypeScript data models (RentalUnit, LandlordProfile, etc.)

scripts/
├── doctor.mjs                — Environment and file structure checker
└── verify-api-contracts.ts   — API route export verification
```

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/generate-agora-token` | Generate RTC+RTM tokens |
| POST | `/api/invite-agent` | Start ConvoAI agent session |
| POST | `/api/stop-conversation` | Stop agent session |
| POST | `/api/update-agent` | Update agent system messages mid-session |
| POST | `/api/webhooks` | Receive agent lifecycle events |
| GET/PUT/DELETE | `/api/landlords/:id` | Landlord profile CRUD |
| GET/POST/PATCH | `/api/bookings` | Booking records CRUD |
| GET/POST | `/api/transcripts` | Call transcript storage |
| GET | `/api/diagnostics` | Environment config health check |

---

## Known Limitations

- **No database** — All data (landlords, bookings, transcripts) is stored in-memory using `Map`. Data resets on server restart. A production database has not been wired yet.
- **No authentication** — The dashboard and all landlord API routes are unprotected. Authenticated access (NextAuth.js or Clerk) is an open task.
- **In-memory transcript storage** — Transcripts are only kept in the Node.js process memory. They will be lost on server restart.
- **No persistent lead pipeline** — The lead pipeline view shows hardcoded empty state; no actual lead data flows from calls into the pipeline yet. Webhook handlers log events but don't store leads.
- **No outbound calls** — Follow-up and reminder calls are described in the architecture but not implemented.
- **Single-region** — `Area.AP` is hardcoded for Philippine proximity. Multi-region support is not configured.
- **Agent name uniqueness** — Agent names are generated with `Date.now()` + random suffix; on name collision (HTTP 409), the request fails rather than retrying with a new name.
- **No conversation history persistence** — The agent's `maxHistory: 50` is session-scoped. Past session context is not available to new sessions.
- **20 PCU limit** — Default Agora ConvoAI limit of 20 concurrent agents per App ID.
- **Environment-dependent** — Requires valid Agora App credentials and OpenAI API key. The AI pipeline (STT/LLM/TTS) will not function without these.

---

## License

MIT
