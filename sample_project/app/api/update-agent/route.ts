import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agent-server-sdk';
import type { UpdateAgentRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: UpdateAgentRequest = await request.json();
    const { agent_id, system_messages } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 },
      );
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      throw new Error(
        'Missing Agora configuration. Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE.',
      );
    }

    const client = new AgoraClient({
      area: Area.AP,
      appId,
      appCertificate,
    });

    // Push updated context into the running session
    await client.updateAgent(agent_id, {
      llm: {
        system_messages,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update agent',
      },
      { status: 500 },
    );
  }
}
