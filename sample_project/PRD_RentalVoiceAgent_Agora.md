# Product Requirements Document
## AI-Powered Voice Rental Agent for Philippine Small Landlords
**Built on Agora Conversational AI Engine**

---

**Document version:** 1.0  
**Status:** Draft  
**Primary audience:** AI coding agents, backend engineers, frontend engineers  
**Tech stack:** Agora Conversational AI Engine (RESTful API + Voice SDK), LLM (OpenAI GPT-4o or equivalent), TTS (Microsoft Azure Neural TTS), ASR (Agora built-in)

---

## 1. Overview

### 1.1 Problem Statement

Solo and small-scale residential landlords in the Philippines (managing 1–10 units) lose prospective tenants every day because they cannot respond to inquiries fast enough. All communication happens manually via Messenger, text, and phone calls. There is no system handling the inquiry-to-viewing pipeline — meaning missed 10pm messages, forgotten follow-ups, and wasted viewings on unqualified prospects.

### 1.2 Proposed Solution

An AI-powered voice sales agent that sits between the listing and the landlord, handling the full inquiry-to-viewing pipeline automatically. The agent is:

- Voice-first (real-time phone/voice call experience)
- Bilingual in Taglish (Filipino/English mix)
- Personalized per landlord — trained on that landlord's unit details, rules, and pricing
- Available 24/7 with graceful human handoff when needed

### 1.3 Core Value Proposition

> "Never miss an inquiry. Never waste a viewing. Fill vacancies faster."

---

## 2. Technical Foundation: Agora Conversational AI Engine

All voice functionality in this product is powered by **Agora's Conversational AI Engine**, which merges real-time audio streaming with LLM-based conversational intelligence.

Key Agora capabilities used in this product:

| Capability | How It's Used |
|---|---|
| Ultra-low latency (≥650ms) | Ensures natural, non-awkward voice conversations with tenants |
| Custom LLM integration | Connects to GPT-4o with landlord-specific system prompts |
| Voice Activity Detection (VAD) | Detects when tenant stops speaking; triggers AI response |
| Voice interruption | Tenant can cut off the agent mid-sentence naturally |
| Background noise reduction | Works even in noisy Philippine street/household environments |
| Weak network resilience | Maintains stable calls with up to 80% packet loss |
| Multi-platform support | Works on iOS, Android, and Web |
| RESTful API | Backend starts/stops agents programmatically per landlord session |

Reference documentation: https://docs.agora.io/en/conversational-ai/overview/product-overview

---

## 3. User Personas

### 3.1 Primary User — The Landlord

- Solo or small-scale residential landlord in PH
- Manages 1–10 units (apartments, rooms, bedspaces)
- Currently handles everything via Messenger/text/phone
- Goal: fill vacancies faster with less personal effort
- Pain: slow responses lose tenants to competing listings; wasted viewings; repetitive questions

### 3.2 End Consumer — The Prospective Tenant

- Calling or messaging about a listed unit
- Expects fast response (often comparing multiple listings simultaneously)
- Communicates naturally in Taglish
- May call during off-hours (10pm, weekends)

---

## 4. Agent Pipeline: Stages and Behaviors

The agent handles five sequential stages. Each stage maps to an Agora voice session with a specific system prompt and tool set.

### Stage 1 — Inquiry Handling

**Trigger:** Tenant calls or initiates a voice session from the listing.

**Agent behavior:**
- Greets tenant in Taglish (e.g., "Helo! Para sa [Unit Name]? Pwede ko kayong tulungan!")
- Answers FAQs from the landlord's knowledge base: price, availability, size, floor, amenities, proximity to landmarks, pet policy, curfew, etc.
- Never gives information not in the landlord's knowledge base. If unknown, says: "Ipapaabot ko sa may-ari yan para masagot ng tama."

**Agora implementation:**
- Start agent via `POST /join` with landlord-specific `system_messages` containing the unit FAQ as structured context
- Set `greeting_message` to a Taglish welcome specific to the landlord's unit name
- ASR language: `"fil-PH"` (Filipino) or `"en-US"` as fallback — **note: verify exact language code support in Agora ASR docs before implementing**
- TTS: Microsoft Azure Neural TTS with a warm Filipino-accented voice (e.g., `fil-PH-BlessicaNeural` — verify availability)

---

### Stage 2 — Prospect Qualification

**Trigger:** After FAQs are answered and tenant expresses continued interest.

**Agent behavior:**
- Asks qualifying questions one at a time, conversationally:
  1. "Ilan po kayong maninirahan?"
  2. "May alaga po ba kayong pets?"
  3. "Kailan po kayo maaring lumipat?"
  4. "Nagtatrabaho po ba kayo sa malapit, o may ibang dahilan sa paghahanap ng malapit na tirahan?"
- Records answers as structured data (see Section 7, Data Models)
- If tenant fails a hard disqualifier (e.g., pets not allowed, too many occupants for unit capacity), politely ends the call and logs the reason
- If tenant passes, transitions to Stage 3

**Agora implementation:**
- Inject tenant answers into conversation context using Agora's custom information transmission feature (`/update` endpoint to pass structured data mid-session)
- Use LLM function calling to extract and validate answers into a `QualificationResult` JSON object
- Implement short-term memory so qualification context carries through to scheduling

---

### Stage 3 — Viewing Scheduling

**Trigger:** Tenant is qualified; agent moves to book an appointment.

**Agent behavior:**
- Presents 2–3 available viewing slots from the landlord's schedule (provided at setup)
- Confirms the tenant's preferred slot
- Reads back the confirmed appointment: date, time, address, what to bring
- Sends a confirmation message (SMS/Messenger) with appointment details post-call

**Agora implementation:**
- Viewing slot data injected into `system_messages` at session start (landlord configures available slots in the landlord dashboard)
- Agent parses tenant selection using LLM structured output
- On confirmation, trigger a webhook to the backend (`/webhook` integration) to write the booking to the database and dispatch the confirmation message
- If tenant is indecisive, agent uses polite urgency: "Maraming nagtatanong ng slot na ito — gusto ninyong i-reserve na?"

---

### Stage 4 — Requirements Relay

**Trigger:** Either embedded within Stage 3 post-confirmation, or triggered independently when a tenant calls to ask about move-in requirements.

**Agent behavior:**
- Recites the landlord's move-in requirements list clearly and in order:
  - Number of months advance/deposit
  - Valid IDs required
  - Proof of income or employment (if required)
  - Any specific landlord rules (no subletting, no loud music, etc.)
- Repeats any requirement the tenant asks about
- Offers to send the list via SMS post-call

**Agora implementation:**
- Requirements stored in the landlord's knowledge base (onboarding step)
- Injected as a dedicated section in `system_messages`: "Requirements section: Always read this list when the user asks about requirements or after a booking is confirmed."
- No LLM improvisation allowed here — agent reads only what's in the requirements list, nothing more

---

### Stage 5 — Follow-Up Outbound Calls

**Trigger:** Scheduled by the backend — fires automatically for:
- Tenants who inquired but did not book a viewing (24-hour follow-up)
- Tenants with confirmed viewings (reminder call 2–4 hours before)
- Tenants who viewed but did not move in (3-day check-in)

**Agent behavior:**
- Outbound call initiated programmatically
- Reintroduces context: "Tawag ito tungkol sa [Unit Name] na tinanong ninyo kahapon..."
- Re-engages with any unresolved question from the original session
- Offers to rebook a viewing if they missed the first one
- Logs call outcome (answered/no answer/callback requested/not interested)

**Agora implementation:**
- Backend scheduler (cron job or task queue) calls `POST /join` with the tenant's phone number channel and a follow-up-specific system prompt
- `idle_timeout` set to 60 seconds (shorter than inbound — if unanswered, terminate and log)
- Outcome logged via webhook on agent `leave` event

---

## 5. Human Handoff

The agent must know when to escalate. Handoff is triggered when:

- Tenant explicitly asks to speak to the owner
- Agent encounters a question outside the knowledge base more than twice
- Tenant shows high frustration signals (e.g., repeated "Hindi ko naiintindihan", raised tone detected — use VAD energy signals as a proxy)
- Negotiation is requested (price negotiation is always escalated to the landlord)

**Handoff behavior:**
- Agent says: "Ipapadaan ko na kayo sa may-ari. Sandali lang po."
- Backend receives a webhook event flagged as `HANDOFF_REQUESTED`
- Landlord's mobile app or dashboard receives a push notification with call transcript summary
- If landlord is unavailable, agent offers a callback: "Hindi available ang may-ari ngayon. Okay lang ba kayong tatawagan bukas ng umaga?"

**Agora implementation:**
- Use Agora's `update` endpoint to modify `system_messages` mid-session if landlord joins the channel
- Webhook event type: custom `agent_event` with `handoff_requested: true` payload
- Transcript up to handoff point sent to landlord dashboard via the `/transcripts` feature

---

## 6. System Architecture

```
[Tenant Phone/App]
       |
       | (Voice call — Agora RTC channel)
       |
[Agora Conversational AI Engine]
       |  ← system_messages (landlord knowledge base)
       |  ← LLM: OpenAI GPT-4o (with function calling)
       |  ← TTS: Azure Neural TTS (fil-PH voice)
       |  ← ASR: Agora built-in (Filipino/English)
       |
[Business Server (Node.js / Python)]
       |
       |— POST /join → Start agent session
       |— POST /leave → End agent session
       |— POST /update → Inject mid-session context
       |— Webhooks → Booking events, handoff events, call outcomes
       |
[Landlord Dashboard (Web/Mobile)]
       |— Unit knowledge base editor
       |— Viewing schedule manager
       |— Live call notifications
       |— Lead pipeline view
       |— Transcript viewer
```

---

## 7. Data Models

### 7.1 Landlord Profile
```json
{
  "landlord_id": "string",
  "units": [
    {
      "unit_id": "string",
      "name": "string",
      "type": "apartment | room | bedspace",
      "price": "number",
      "availability": "available | occupied | reserved",
      "address": "string",
      "max_occupants": "number",
      "pets_allowed": "boolean",
      "faqs": [{ "question": "string", "answer": "string" }],
      "requirements": ["string"],
      "rules": ["string"],
      "viewing_slots": [{ "datetime": "ISO8601", "available": "boolean" }]
    }
  ],
  "tts_voice": "string",
  "agent_name": "string",
  "handoff_phone": "string"
}
```

### 7.2 Qualification Result
```json
{
  "session_id": "string",
  "tenant_name": "string",
  "tenant_phone": "string",
  "occupant_count": "number",
  "has_pets": "boolean",
  "move_in_date": "ISO8601",
  "employment_status": "string",
  "disqualified": "boolean",
  "disqualification_reason": "string | null",
  "qualification_score": "number (0–100)"
}
```

### 7.3 Booking Record
```json
{
  "booking_id": "string",
  "unit_id": "string",
  "landlord_id": "string",
  "tenant_name": "string",
  "tenant_phone": "string",
  "viewing_datetime": "ISO8601",
  "status": "scheduled | confirmed | no_show | completed | cancelled",
  "requirements_sent": "boolean",
  "confirmation_sent": "boolean"
}
```

### 7.4 Call Session Log
```json
{
  "session_id": "string",
  "agent_id": "string (Agora agent_id)",
  "landlord_id": "string",
  "unit_id": "string",
  "call_type": "inbound | outbound_followup | outbound_reminder",
  "start_ts": "unix timestamp",
  "end_ts": "unix timestamp",
  "stage_reached": "inquiry | qualification | scheduling | requirements | followup",
  "handoff_triggered": "boolean",
  "transcript_url": "string",
  "outcome": "booked | qualified_no_booking | disqualified | handoff | no_answer | callback_requested"
}
```

---

## 8. Agora API Integration Reference

### 8.1 Start an Agent Session (Inbound Inquiry)
```javascript
POST https://api.agora.io/api/conversational-ai-agent/v2/projects/:appid/join

{
  "name": "rental_agent_<landlord_id>_<session_id>",
  "properties": {
    "channel": "<tenant_channel_name>",
    "token": "<rtc_token>",
    "agent_rtc_uid": "0",
    "remote_rtc_uids": ["<tenant_uid>"],
    "idle_timeout": 120,
    "llm": {
      "url": "https://api.openai.com/v1/chat/completions",
      "api_key": "<openai_key>",
      "system_messages": [
        {
          "role": "system",
          "content": "<landlord_knowledge_base_prompt>"
        }
      ],
      "greeting_message": "<taglish_greeting>",
      "failure_message": "Pasensya na, hindi ko masagot yan. Ipapaabot ko sa may-ari.",
      "max_history": 20,
      "params": {
        "model": "gpt-4o-mini"
      }
    },
    "asr": {
      "language": "en-US"
    },
    "tts": {
      "vendor": "microsoft",
      "params": {
        "key": "<azure_tts_key>",
        "region": "<azure_region>",
        "voice_name": "en-US-AndrewMultilingualNeural"
      }
    }
  }
}
```

> **Note to agent:** Replace `voice_name` with the best available Filipino-accented voice. Verify `fil-PH-BlessicaNeural` availability in your Azure TTS region before deploying. If not available, `en-US-AndrewMultilingualNeural` handles Taglish reasonably well as a fallback.

### 8.2 Stop an Agent Session
```javascript
POST https://api.agora.io/api/conversational-ai-agent/v2/projects/:appid/agents/:agentId/leave
```
Call this when: tenant hangs up, handoff is completed, idle_timeout fires, or disqualification ends the session.

### 8.3 Update Agent Mid-Session (Inject Qualification Data)
```javascript
POST https://api.agora.io/api/conversational-ai-agent/v2/projects/:appid/agents/:agentId/update
```
Use this to push updated context (e.g., qualification answers) into the running session without restarting it.

### 8.4 Webhooks

Configure a webhook endpoint on your business server to receive:

| Event | Action |
|---|---|
| `agent.joined` | Log session start, notify landlord dashboard |
| `agent.left` | Finalize session log, trigger follow-up scheduler |
| `custom.handoff_requested` | Push notification to landlord mobile app |
| `custom.booking_confirmed` | Write booking record, dispatch SMS confirmation |

---

## 9. LLM System Prompt Architecture

The system prompt injected into each session has three sections:

**Section 1 — Role and Persona**
```
You are [Agent Name], a helpful rental assistant for [Landlord Name]'s property at [Address]. 
You speak in natural Taglish — mixing Filipino and English the way Filipinos actually talk. 
You are warm, friendly, and professional. Never pretend to be human if directly asked.
```

**Section 2 — Unit Knowledge Base (dynamic, per landlord)**
```
Unit details:
- Type: [Room / Apartment / Bedspace]
- Monthly rent: PHP [amount]
- Available: [Yes/No]
- Address: [full address]
- Near: [landmarks]
- Max occupants: [number]
- Pets allowed: [Yes/No]
- Rules: [list]
- Requirements: [list]
- FAQs: [Q&A pairs]
```

**Section 3 — Behavior Rules (static)**
```
Rules you must always follow:
1. Only answer questions about this specific unit. Do not make up information.
2. If you don't know something, say: "Hindi ko sigurado yan, itatanong ko sa may-ari para sa inyo."
3. Never negotiate price. If asked, say the owner handles that personally.
4. After FAQs, naturally move toward qualification questions.
5. After qualification passes, guide toward booking a viewing.
6. Always confirm bookings by reading back: date, time, address, what to bring.
7. If the tenant seems frustrated or confused, offer to connect them to the owner.
8. Never share the landlord's personal phone number. Route all requests through you.
```

---

## 10. Landlord Onboarding Flow

Agents building the landlord dashboard must implement this onboarding flow to populate the knowledge base:

1. **Unit setup** — Landlord enters unit type, price, address, landmarks, occupant limit, pet policy
2. **Rules & requirements** — Landlord inputs move-in requirements and house rules (templated options + free text)
3. **FAQ builder** — Landlord answers 10–15 suggested questions (pre-filled with common PH rental FAQs, landlord edits)
4. **Viewing schedule** — Landlord sets available viewing slots for the next 2 weeks (repeating weekly option)
5. **Agent name & voice** — Landlord picks an agent name and optionally previews the TTS voice
6. **Phone number integration** — Landlord's listing phone number is routed through the agent (requires telephony bridge, e.g., Vonage or Twilio SIP integration to Agora channel — **this is a separate integration scope**)
7. **Test call** — Landlord does a test call to hear the agent in action before going live

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Voice response latency | ≤800ms end-to-end (Agora guarantees ≥650ms pipeline) |
| Availability | 99.9% uptime (24/7 operation) |
| Concurrent sessions per landlord | 1 (upgrade path to concurrent multi-unit sessions) |
| Language accuracy | Must handle Taglish without code-switch failures |
| Call recording | All sessions recorded and stored for 30 days |
| Data residency | Verify Agora data routing — prefer Singapore region for Philippine latency |
| DICT/NPC compliance | **Consult a legal professional** — verify data privacy compliance under the Philippine Data Privacy Act (RA 10173) before launch |

---

## 12. Out of Scope (v1)

The following are explicitly excluded from the first version:

- Multi-unit concurrent calls for a single landlord
- Messenger/SMS chatbot channel (voice-only for v1)
- Payment collection or deposit handling
- Tenant background/credit checking integration
- Calendar sync (Google Calendar, etc.) — viewing slots are manually entered
- Landlord mobile app (v1 is web dashboard only)

---

## 13. Open Questions for the Team

1. **ASR language code** — Confirm whether Agora's ASR supports `fil-PH` natively or if English ASR is required with Taglish handling delegated to the LLM. Check current ASR language support at https://docs.agora.io/en/conversational-ai/models/asr/overview.
2. **Telephony bridge** — How does an inbound phone call from a tenant reach an Agora RTC channel? A SIP/PSTN bridge (e.g., Twilio, Vonage, or Agora's own PSTN if available) must be scoped separately.
3. **Azure TTS Filipino voice** — Verify `fil-PH-BlessicaNeural` is available in the deployment region.
4. **PCU limits** — Agora limits concurrent API calls to 20 PCU per App ID by default. Contact Agora support if landlord count exceeds this.
5. **Outbound calling** — Outbound calls to tenants require a telephony outbound integration. This is outside pure Agora scope and needs a PSTN provider.

---

## 14. Success Metrics

| Metric | Target |
|---|---|
| Inquiry response rate | 100% (all inquiries answered, 24/7) |
| Qualification completion rate | ≥70% of inquiries reach qualification stage |
| Viewing booking rate | ≥40% of qualified leads book a viewing |
| No-show rate | ≤20% (vs. industry baseline — landlord to provide baseline) |
| Vacancy fill time | Reduction from landlord's current baseline (track before/after) |
| Landlord intervention rate | ≤15% of calls require handoff |

---

*This PRD was authored based on the proposed solution document and the Agora Conversational AI Engine documentation (https://docs.agora.io/en/conversational-ai/overview/product-overview). Verify all Agora API endpoints, language codes, and TTS voice names against the latest Agora documentation before implementation, as these may have changed.*
