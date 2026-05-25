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
    console.log(`Session started: ${event.session_id}`);
  },
  'agent.left': async (event) => {
    console.log(`Session ended: ${event.session_id}`);
  },
  'custom.handoff_requested': async (event) => {
    console.log(`Handoff requested for session: ${event.session_id}`, event.payload);
  },
  'custom.booking_confirmed': async (event) => {
    console.log(`Booking confirmed for session: ${event.session_id}`, event.payload);
  },
};
