import type { WebhookEvent } from '@/types';

type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const handlers = new Map<string, WebhookHandler>();

export function registerWebhookHandler(
  eventType: WebhookEvent['event'],
  handler: WebhookHandler,
): void {
  handlers.set(eventType, handler);
}

export async function dispatchWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = handlers.get(event.event);
  if (handler) {
    await handler(event);
  }
}

export const defaultWebhookHandlers: Record<WebhookEvent['event'], WebhookHandler> = {
  'agent.joined': async (event) => {
    console.log(`[webhook-handler] Agent joined session ${event.session_id} at ${new Date(event.timestamp).toISOString()}`);
  },
  'agent.left': async (event) => {
    console.log(`[webhook-handler] Agent left session ${event.session_id} at ${new Date(event.timestamp).toISOString()}`);
    if (event.payload) {
      console.log(`[webhook-handler]   reason:`, JSON.stringify(event.payload));
    }
  },
  'custom.handoff_requested': async (event) => {
    console.log(`[webhook-handler] Handoff requested for session ${event.session_id}`, JSON.stringify(event.payload, null, 2));
  },
  'custom.booking_confirmed': async (event) => {
    console.log(`[webhook-handler] Booking confirmed for session ${event.session_id}`, JSON.stringify(event.payload, null, 2));
  },
};
