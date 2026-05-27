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
import { ensureDefaultLandlordSeeded, getLandlordProfile } from '@/lib/landlords';
import { retrieveKnowledgeContext } from '@/lib/knowledge';
import { buildSystemPrompt, buildMultiUnitSystemPrompt } from '@/lib/prompts';

const agentUid = process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);

export async function POST(request: NextRequest) {
  try {
    const body: ClientStartRequest & { landlord_id?: string; unit_id?: string } =
      await request.json();
    const { requester_id, channel_name, landlord_id, unit_id } = body;

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      return NextResponse.json(
        {
          error:
            'Missing Agora configuration. Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE.',
        },
        { status: 500 },
      );
    }

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    const resolvedLandlordId =
      landlord_id ?? process.env.NEXT_PUBLIC_LANDLORD_ID ?? 'default-landlord';

    await ensureDefaultLandlordSeeded();
    const landlord = await getLandlordProfile(resolvedLandlordId);

    const agentName = landlord?.agent_name ?? process.env.NEXT_AGENT_NAME ?? 'Maria';
    const greeting =
      process.env.NEXT_AGENT_GREETING ??
      'Hi po! Ako si Maria, rental assistant. Ano po ang gusto ninyong malaman?';

    console.log(
      `[invite-agent] Request: landlord_id=${resolvedLandlordId}, unit_id=${unit_id ?? '(none)'}, requester=${requester_id}, channel=${channel_name}`,
    );

    let systemPrompt = '';
    const retrievedChunks = await retrieveKnowledgeContext({
      landlordId: resolvedLandlordId,
      unitId: unit_id,
      query: 'rental unit price availability address rules requirements viewing schedule faq',
      limit: 4,
    });

    if (landlord && landlord.units.length > 0) {
      if (unit_id) {
        const unit = landlord.units.find((u: RentalUnit) => u.unit_id === unit_id) ?? null;
        if (unit) {
          systemPrompt = buildSystemPrompt(
            agentName,
            'the owner',
            unit,
            retrievedChunks,
          );
        }
      } else {
        systemPrompt = buildMultiUnitSystemPrompt(
          agentName,
          'the owner',
          landlord.units,
          retrievedChunks,
        );
      }
    }

    if (!systemPrompt) {
      console.log('[invite-agent] WARNING: No landlord/units found, using generic prompt');
      systemPrompt = `You are a helpful rental assistant for a property in the Philippines.
You speak in natural Taglish — warm, friendly, and brief.
Keep replies to 1-2 short sentences. Answer only what was asked.
If you don't know something, say: "Hindi ko sigurado yan, itatanong ko sa may-ari para sa inyo."
Never negotiate price. If asked, say the owner handles that personally.`;
    }

    const client = new AgoraClient({
      area: Area.AP,
      appId,
      appCertificate,
    });

    const agent = new Agent({
      name: `rental-agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      instructions: systemPrompt,
      greeting,
      failureMessage: 'Pasensya po, check ko muna sa may-ari.',
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
              silence_duration_ms: 600,
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
          failureMessage: 'Pasensya po, check ko muna sa may-ari.',
          maxHistory: 10,
          params: {
            max_tokens: 120,
            temperature: 0.5,
            top_p: 0.9,
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
