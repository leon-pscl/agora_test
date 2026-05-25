# Agent Guide — Rental Voice Agent

Use this file as the primary agent-facing guide for the `rental-voice-agent` project.

## Start Here

This project is an AI-Powered Voice Rental Agent for Philippine Small Landlords, built on Agora's Conversational AI Engine.

## Current System Shape

- Next.js 16 App Router with React 19 and TypeScript
- Browser RTC via `agora-rtc-react`
- RTM transcripts via `agora-rtm`
- Transcript/runtime helpers via `agora-agent-client-toolkit`
- Shared UI primitives via `agora-agent-uikit`
- Token and agent lifecycle routes inside `app/api`
- Landlord dashboard with knowledge base editor, schedule manager, lead pipeline

## Key Files

- `app/api/generate-agora-token/route.ts`: RTC + RTM token generation
- `app/api/invite-agent/route.ts`: managed agent session startup (landlord-specific prompts)
- `app/api/stop-conversation/route.ts`: agent shutdown
- `app/api/update-agent/route.ts`: mid-session context injection
- `app/api/webhooks/route.ts`: receive agent events (joined, left, handoff, booking)
- `app/api/landlords/[landlord_id]/route.ts`: landlord profile CRUD
- `app/api/bookings/route.ts`: booking records CRUD
- `components/LandlordDashboard.tsx`: main dashboard with tab navigation
- `components/UnitKnowledgeBaseEditor.tsx`: unit setup, rules, FAQs
- `components/ViewingScheduleManager.tsx`: viewing slot management
- `components/LeadPipelineView.tsx`: lead pipeline visualization
- `components/TranscriptViewer.tsx`: call transcript viewer
- `components/CallNotificationPanel.tsx`: live call notifications and handoff
- `components/CallInterface.tsx`: tenant-facing voice call experience
- `components/ConversationComponent.tsx`: RTC join, transcript, visualizer
- `lib/prompts.ts`: system prompt builders for each pipeline stage
- `lib/webhooks.ts`: webhook event dispatcher
- `.env.local.example`: local environment template

## Working Rules

- Keep the RTC client creation StrictMode-safe with `useRef`, not `useMemo`.
- Keep the token route on `RtcTokenBuilder.buildTokenWithRtm`.
- Keep transcript UID remapping aligned with the toolkit sentinel behavior.
- System prompts use Taglish (Filipino/English mix) for natural conversation.
- Use Area.AP for Asia-Pacific deployment (Philippine proximity).

## Commands

```bash
pnpm install
pnpm run dev
pnpm run verify
```

Useful narrower checks:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```

## Done Criteria

1. Run the narrowest relevant validation command.
2. For shipped app/runtime changes, ensure `pnpm run verify` passes.
3. Update this guide and affected docs when workflow or architecture guidance changes.
