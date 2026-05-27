import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureDefaultLandlordSeeded, getLandlordProfile } from '@/lib/landlords';
import { retrieveKnowledgeContext } from '@/lib/knowledge';
import { buildMultiUnitSystemPrompt, buildSystemPrompt } from '@/lib/prompts';

function firstUsefulLine(chunks: string[]): string | null {
  for (const chunk of chunks) {
    const line = chunk
      .split('\n')
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0 && !entry.startsWith('Unit:'));
    if (line) return line.replace(/^[-*]\s*/, '');
  }
  return null;
}

async function generateReply(options: {
  message: string;
  landlordId: string;
  unitId?: string;
  chunks: string[];
}): Promise<string> {
  const profile = await getLandlordProfile(options.landlordId);
  const units = profile?.units ?? [];
  const selectedUnit = options.unitId
    ? units.find((unit) => unit.unit_id === options.unitId)
    : undefined;

  if (process.env.NEXT_LLM_API_KEY && profile && units.length > 0) {
    try {
      const [{ generateText }, { createOpenAI }] = await Promise.all([
        import('ai'),
        import('@ai-sdk/openai'),
      ]);
      const openai = createOpenAI({ apiKey: process.env.NEXT_LLM_API_KEY });
      const system = selectedUnit
        ? buildSystemPrompt(profile.agent_name, 'the landlord', selectedUnit, options.chunks)
        : buildMultiUnitSystemPrompt(profile.agent_name, 'the landlord', units, options.chunks);
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        system,
        prompt: options.message,
      });
      return result.text.trim();
    } catch (error) {
      console.error('[chat-fallback] LLM reply failed, using deterministic fallback:', error);
    }
  }

  const line = firstUsefulLine(options.chunks);
  if (line) {
    return `Based sa unit info, ${line}. May gusto po ba kayong i-clarify or ipa-schedule na viewing?`;
  }

  return 'Hindi ko sigurado yan, itatanong ko sa may-ari para sa inyo. Pwede ko rin po kayong tulungan mag-book ng viewing.';
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      message?: string;
      session_id?: string;
      landlord_id?: string;
      unit_id?: string;
    } = await request.json();

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const landlordId =
      body.landlord_id ??
      process.env.NEXT_PUBLIC_LANDLORD_ID ??
      'default-landlord';
    const sessionId = body.session_id ?? `text-${Date.now()}`;
    const message = body.message.trim();

    await ensureDefaultLandlordSeeded();
    const chunks = await retrieveKnowledgeContext({
      landlordId,
      unitId: body.unit_id,
      query: message,
      limit: 5,
    });
    const reply = await generateReply({
      message,
      landlordId,
      unitId: body.unit_id,
      chunks,
    });

    const now = new Date();
    const log = await prisma.conversationLog.upsert({
      where: { sessionId },
      create: {
        sessionId,
        landlordId,
        unitId: body.unit_id ?? null,
        source: 'text_fallback',
        agentId: 'text-fallback',
        channel: sessionId,
        startTs: now,
        endTs: now,
      },
      update: {
        landlordId,
        unitId: body.unit_id ?? null,
        source: 'text_fallback',
        endTs: now,
      },
    });

    await prisma.conversationMessage.createMany({
      data: [
        {
          conversationId: log.id,
          turnId: `${sessionId}-${now.getTime()}-tenant`,
          role: 'tenant',
          uid: 'tenant',
          text: message,
          createdAt: now,
        },
        {
          conversationId: log.id,
          turnId: `${sessionId}-${now.getTime()}-agent`,
          role: 'agent',
          uid: '0',
          text: reply,
          createdAt: new Date(now.getTime() + 1),
        },
      ],
    });

    return NextResponse.json({ session_id: sessionId, reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send chat message' },
      { status: 500 },
    );
  }
}
