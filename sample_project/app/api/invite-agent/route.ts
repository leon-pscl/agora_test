import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  OpenAI,
} from 'agora-agent-server-sdk';
import type { ClientStartRequest, RentalUnit } from '@/types';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { buildSystemPrompt } from '@/lib/prompts';

const agentUid = process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);

async function getLandlordUnit(landlordId: string, unitId?: string): Promise<RentalUnit | null> {
  // TODO: Replace with database lookup
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/landlords/${landlordId}`;
  console.log(`[invite-agent] Fetching landlord data: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.log(`[invite-agent] Landlord ${landlordId} not found (${response.status})`);
    return null;
  }
  const landlord = await response.json();
  console.log(`[invite-agent] Landlord found: ${landlord.landlord_id}, units: ${landlord.units?.length ?? 0}`);

  let unit: RentalUnit | null = null;
  if (unitId) {
    unit = landlord.units.find((u: RentalUnit) => u.unit_id === unitId) ?? null;
    console.log(`[invite-agent] Requested unit ${unitId}: ${unit ? `found "${unit.name}"` : 'NOT FOUND'}`);
  } else {
    unit = landlord.units[0] ?? null;
    console.log(`[invite-agent] No unit specified, using first: ${unit ? `"${unit.name}"` : 'NONE'}`);
  }
  return unit;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClientStartRequest & { landlord_id?: string; unit_id?: string } = await request.json();
    const { requester_id, channel_name, landlord_id, unit_id } = body;

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: 'Missing Agora configuration. Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE.' },
        { status: 500 },
      );
    }

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    const agentName = process.env.NEXT_AGENT_NAME ?? 'Maria';
    const greeting = process.env.NEXT_AGENT_GREETING ?? 'Helo! Ako ang rental assistant. Paano po ako makatutulong?';
    console.log(`[invite-agent] Request: landlord_id=${landlord_id ?? '(none)'}, unit_id=${unit_id ?? '(none)'}, requester=${requester_id}, channel=${channel_name}`);

    let systemPrompt = '';
    let unitInfo: RentalUnit | null = null;

    if (landlord_id) {
      unitInfo = await getLandlordUnit(landlord_id, unit_id);
      if (unitInfo) {
        systemPrompt = buildSystemPrompt(
          agentName,
          'the owner',
          unitInfo,
        );
      }
    }

    if (!systemPrompt) {
      console.log('[invite-agent] WARNING: No landlord/unit found, using generic prompt');
      systemPrompt = `You are a helpful rental assistant for a property in the Philippines.
You speak in natural Taglish — mixing Filipino and English the way Filipinos actually talk.
You are warm, friendly, and professional.

Help the tenant with their inquiry about the rental unit. Answer questions about pricing, location, amenities, and availability.
If you don't know something, say: "Hindi ko sigurado yan, itatanong ko sa may-ari para sa inyo."
Never negotiate price. If asked, say the owner handles that personally.`;
    }

    console.log(`[invite-agent] Agent: "${agentName}", greeting: "${greeting}"`);
    console.log(`[invite-agent] System prompt (first 500 chars): ${systemPrompt.slice(0, 500)}...`);

    const client = new AgoraClient({
      area: Area.AP,
      appId,
      appCertificate,
    });

    const agent = new Agent({
      name: `rental-agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      instructions: systemPrompt,
      greeting,
      failureMessage: 'Pasensya na, hindi ko masagot yan. Ipapaabot ko sa may-ari.',
      maxHistory: 50,
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480,
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-2',
          language: 'en',
        }),
      )
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: greeting,
          failureMessage: 'Pasensya na, hindi ko masagot yan. Ipapaabot ko sa may-ari.',
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
      )
      .withTts(
        new (await import('agora-agent-server-sdk')).MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        }),
      );

    const session = agent.createSession(client, {
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 120,
      expiresIn: ExpiresIn.hours(1),
    });

    const agentId = await session.start();
    console.log(`[invite-agent] Agent started successfully: ${agentId}`);

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
