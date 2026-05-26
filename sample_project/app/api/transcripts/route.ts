import { NextRequest, NextResponse } from 'next/server';
import type { TranscriptSession, TranscriptEntry } from '@/types';

const transcriptStore = new Map<string, TranscriptSession>();

export async function POST(request: NextRequest) {
  try {
    const body: {
      session_id: string;
      agent_id: string;
      channel: string;
      start_ts: number;
      messages: TranscriptEntry[];
    } = await request.json();

    if (!body.session_id || !body.messages) {
      return NextResponse.json(
        { error: 'session_id and messages are required' },
        { status: 400 },
      );
    }

    const existing = transcriptStore.get(body.session_id);
    const session: TranscriptSession = {
      session_id: body.session_id,
      agent_id: body.agent_id ?? existing?.agent_id ?? '',
      channel: body.channel ?? existing?.channel ?? '',
      start_ts: body.start_ts ?? existing?.start_ts ?? Date.now(),
      end_ts: Date.now(),
      messages: body.messages,
    };
    transcriptStore.set(body.session_id, session);

    console.log(`[transcripts] Saved session ${body.session_id}: ${body.messages.length} messages`);

    return NextResponse.json({ success: true, session_id: body.session_id });
  } catch (error) {
    console.error('[transcripts] Error saving:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save transcript' },
      { status: 500 },
    );
  }
}

export async function GET() {
  const sessions = Array.from(transcriptStore.values())
    .sort((a, b) => b.end_ts - a.end_ts);

  return NextResponse.json({ sessions });
}
