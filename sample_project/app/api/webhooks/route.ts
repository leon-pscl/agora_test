import { NextRequest, NextResponse } from 'next/server';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import type { WebhookEvent } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: WebhookEvent = await request.json();

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
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
