import { NextRequest, NextResponse } from 'next/server';
import type { TranscriptSession, TranscriptEntry } from '@/types';
import { prisma } from '@/lib/db';
import { persistConfirmedBookingFromTranscript } from '@/lib/booking-extraction';

function messageRole(message: TranscriptEntry): 'agent' | 'tenant' {
  return message.uid === '0' || message.uid === process.env.NEXT_PUBLIC_AGENT_UID
    ? 'agent'
    : 'tenant';
}

function toTimestamp(value: number | undefined, fallback: number): Date {
  return new Date(value ?? fallback);
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      session_id: string;
      agent_id: string;
      channel: string;
      start_ts: number;
      landlord_id?: string;
      unit_id?: string;
      source?: 'voice' | 'text_fallback';
      messages: TranscriptEntry[];
    } = await request.json();

    if (!body.session_id || !body.messages) {
      return NextResponse.json(
        { error: 'session_id and messages are required' },
        { status: 400 },
      );
    }

    const landlordId =
      body.landlord_id ??
      process.env.NEXT_PUBLIC_LANDLORD_ID ??
      'default-landlord';
    const startTs = toTimestamp(body.start_ts, Date.now());
    const endTs = new Date();

    const log = await prisma.conversationLog.upsert({
      where: { sessionId: body.session_id },
      create: {
        sessionId: body.session_id,
        landlordId,
        unitId: body.unit_id ?? null,
        source: body.source ?? 'voice',
        agentId: body.agent_id ?? '',
        channel: body.channel ?? '',
        startTs,
        endTs,
      },
      update: {
        landlordId,
        unitId: body.unit_id ?? null,
        source: body.source ?? 'voice',
        agentId: body.agent_id ?? '',
        channel: body.channel ?? '',
        startTs,
        endTs,
      },
    });

    await prisma.conversationMessage.deleteMany({
      where: { conversationId: log.id },
    });
    if (body.messages.length > 0) {
      await prisma.conversationMessage.createMany({
        data: body.messages.map((message, index) => ({
          conversationId: log.id,
          turnId: message.turn_id || `${body.session_id}-${index}`,
          role: messageRole(message),
          uid: message.uid,
          text: message.text,
          createdAt: toTimestamp(message.createdAt, body.start_ts + index),
        })),
      });
    }

    console.log(`[transcripts] Saved session ${body.session_id}: ${body.messages.length} messages`);

    const source = body.source ?? 'voice';
    const bookingResult =
      source === 'voice' && body.messages.length > 0
        ? await persistConfirmedBookingFromTranscript({
            landlordId,
            sessionId: body.session_id,
            messages: body.messages,
            hintUnitId: body.unit_id,
          })
        : { booking_created: false, reason: 'skipped_non_voice' };

    if (bookingResult.booking_created) {
      console.log(
        `[transcripts] Booking persisted for ${body.session_id}: ${bookingResult.schedule_event_id}`,
      );
    }

    return NextResponse.json({
      success: true,
      session_id: body.session_id,
      booking_created: bookingResult.booking_created,
      schedule_event_id: bookingResult.schedule_event_id,
      booking_reason: bookingResult.reason,
      unit_id: bookingResult.unit_id,
      starts_at: bookingResult.starts_at,
    });
  } catch (error) {
    console.error('[transcripts] Error saving:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save transcript' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const landlordId =
    searchParams.get('landlord_id') ??
    process.env.NEXT_PUBLIC_LANDLORD_ID ??
    'default-landlord';

  const logs = await prisma.conversationLog.findMany({
    where: { landlordId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { endTs: 'desc' },
  });
  const sessions: TranscriptSession[] = logs.map((log) => ({
    session_id: log.sessionId,
    agent_id: log.agentId ?? '',
    channel: log.channel ?? '',
    start_ts: log.startTs.getTime(),
    end_ts: log.endTs.getTime(),
    source: log.source as TranscriptSession['source'],
    unit_id: log.unitId,
    messages: log.messages.map((message) => ({
      turn_id: message.turnId,
      uid: message.uid ?? (message.role === 'agent' ? '0' : 'tenant'),
      text: message.text,
      createdAt: message.createdAt.getTime(),
    })),
  }));

  return NextResponse.json({ sessions });
}
