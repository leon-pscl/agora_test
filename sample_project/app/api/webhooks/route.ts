import { NextRequest, NextResponse } from 'next/server';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import type { WebhookEvent } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: WebhookEvent = await request.json();

    console.log(`[webhook] Event: ${body.event}, session: ${body.session_id}, agent: ${body.agent_id ?? '(none)'}, payload keys: ${Object.keys(body.payload ?? {}).join(', ')}`);

    // Validate required fields
    if (!body.event || !body.session_id) {
      return NextResponse.json(
        { error: 'event and session_id are required' },
        { status: 400 },
      );
    }

    await dispatchWebhookEvent(body);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Handler error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
