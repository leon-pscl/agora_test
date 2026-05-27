import type { BookingExtractionResult, RentalUnit, TranscriptEntry } from '@/types';
import { prisma } from '@/lib/db';
import { getLandlordProfile, saveLandlordProfile } from '@/lib/landlords';

const CONFIRMATION_PATTERNS =
  /\b(yes|oo|opo|correct|tama|go ahead|sige po|oo po|yes po|confirmed|confirm po)\b/i;
const VAGUE_PATTERNS = /\b(maybe|tingnan ko|noted|mamaya|later|hindi pa)\b/i;
const VIEWING_DURATION_MS = 30 * 60 * 1000;

type OrderedMessage = {
  role: 'agent' | 'tenant';
  text: string;
  createdAt: number;
};

type ExtractedSummary = {
  unitName: string;
  dateText: string;
  timeText: string;
  address: string;
  messageIndex: number;
};

function messageRole(message: TranscriptEntry): 'agent' | 'tenant' {
  const agentUid = process.env.NEXT_PUBLIC_AGENT_UID ?? '0';
  return message.uid === '0' || message.uid === agentUid ? 'agent' : 'tenant';
}

function toOrderedMessages(messages: TranscriptEntry[]): OrderedMessage[] {
  return messages
    .filter((message) => message.text?.trim())
    .map((message, index) => ({
      role: messageRole(message),
      text: message.text.trim(),
      createdAt: message.createdAt ?? index,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

function parseSummaryFromAgentText(text: string): Omit<ExtractedSummary, 'messageIndex'> | null {
  const normalized = text.replace(/\r\n/g, '\n');
  const unitMatch = normalized.match(/(?:^|\n)\s*[-*]?\s*Unit:\s*(.+)/i);
  const dateMatch = normalized.match(/(?:^|\n)\s*[-*]?\s*Date:\s*(.+)/i);
  const timeMatch = normalized.match(/(?:^|\n)\s*[-*]?\s*Time:\s*(.+)/i);
  const addressMatch = normalized.match(/(?:^|\n)\s*[-*]?\s*Address:\s*(.+)/i);

  if (!unitMatch || !dateMatch || !timeMatch) {
    return null;
  }

  const looksLikeConfirmation =
    /confirm/i.test(normalized) || /tama po ba/i.test(normalized);
  if (!looksLikeConfirmation) {
    return null;
  }

  return {
    unitName: unitMatch[1].trim(),
    dateText: dateMatch[1].trim(),
    timeText: timeMatch[1].trim(),
    address: addressMatch?.[1]?.trim() ?? '',
  };
}

function isExplicitTenantConfirmation(text: string): boolean {
  const normalized = text.trim();
  if (!normalized || VAGUE_PATTERNS.test(normalized)) {
    return false;
  }
  return CONFIRMATION_PATTERNS.test(normalized);
}

function findConfirmedSummary(messages: OrderedMessage[]): ExtractedSummary | null {
  const summaries: ExtractedSummary[] = [];

  messages.forEach((message, index) => {
    if (message.role !== 'agent') return;
    const parsed = parseSummaryFromAgentText(message.text);
    if (parsed) {
      summaries.push({ ...parsed, messageIndex: index });
    }
  });

  for (let i = summaries.length - 1; i >= 0; i -= 1) {
    const summary = summaries[i];
    const tenantReply = messages
      .slice(summary.messageIndex + 1)
      .find(
        (message) =>
          message.role === 'tenant' && isExplicitTenantConfirmation(message.text),
      );

    if (tenantReply) {
      return summary;
    }
  }

  return null;
}

function matchUnit(units: RentalUnit[], unitName: string): RentalUnit | null {
  const target = unitName.toLowerCase().trim();
  const exact = units.find((unit) => unit.name.toLowerCase().trim() === target);
  if (exact) return exact;

  const partial = units.find(
    (unit) =>
      unit.name.toLowerCase().includes(target) ||
      target.includes(unit.name.toLowerCase()),
  );
  return partial ?? null;
}

function parseDateTime(dateText: string, timeText: string): Date | null {
  const combined = `${dateText} ${timeText}`.trim();
  const parsed = Date.parse(combined);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  const dateOnly = Date.parse(dateText);
  if (!Number.isNaN(dateOnly)) {
    const timeMatch = timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      const date = new Date(dateOnly);
      let hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] ?? 0);
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
  }

  return null;
}

function slotMatchesTime(slotIso: string, startsAt: Date): boolean {
  const slotTime = new Date(slotIso).getTime();
  const targetTime = startsAt.getTime();
  return Math.abs(slotTime - targetTime) <= VIEWING_DURATION_MS;
}

function markSlotBooked(unit: RentalUnit, startsAt: Date): RentalUnit {
  const updatedSlots = unit.viewing_slots.map((slot) => {
    if (slot.available && slotMatchesTime(slot.datetime, startsAt)) {
      return { ...slot, available: false };
    }
    return slot;
  });

  const hadMatch = updatedSlots.some(
    (slot, index) => slot.available !== unit.viewing_slots[index]?.available,
  );

  if (!hadMatch && unit.viewing_slots.length > 0) {
    const closestIndex = unit.viewing_slots.reduce(
      (bestIndex, slot, index, slots) => {
        const bestDiff = Math.abs(
          new Date(slots[bestIndex].datetime).getTime() - startsAt.getTime(),
        );
        const currentDiff = Math.abs(
          new Date(slot.datetime).getTime() - startsAt.getTime(),
        );
        return currentDiff < bestDiff ? index : bestIndex;
      },
      0,
    );
    updatedSlots[closestIndex] = {
      ...updatedSlots[closestIndex],
      available: false,
    };
  }

  return { ...unit, viewing_slots: updatedSlots };
}

export async function persistConfirmedBookingFromTranscript(options: {
  landlordId: string;
  sessionId: string;
  messages: TranscriptEntry[];
  hintUnitId?: string;
}): Promise<BookingExtractionResult> {
  const { landlordId, sessionId, messages, hintUnitId } = options;
  const ordered = toOrderedMessages(messages);
  const summary = findConfirmedSummary(ordered);

  if (!summary) {
    return { booking_created: false, reason: 'no_confirmed_booking_found' };
  }

  const profile = await getLandlordProfile(landlordId);
  if (!profile || profile.units.length === 0) {
    return { booking_created: false, reason: 'landlord_not_found' };
  }

  let unit =
    (hintUnitId
      ? profile.units.find((entry) => entry.unit_id === hintUnitId)
      : null) ?? matchUnit(profile.units, summary.unitName);

  if (!unit) {
    return { booking_created: false, reason: 'unit_not_matched' };
  }

  const startsAt = parseDateTime(summary.dateText, summary.timeText);
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return { booking_created: false, reason: 'datetime_not_parsed' };
  }

  const endsAt = new Date(startsAt.getTime() + VIEWING_DURATION_MS);
  const notes = `Booked via voice session ${sessionId}. Address: ${summary.address || unit.address}`;

  const existing = await prisma.scheduleEvent.findFirst({
    where: {
      landlordId,
      unitId: unit.unit_id,
      type: 'viewing',
      startsAt,
    },
  });

  const scheduleEvent = existing
    ? await prisma.scheduleEvent.update({
        where: { id: existing.id },
        data: {
          status: 'scheduled',
          title: `Viewing: ${unit.name}`,
          notes,
        },
      })
    : await prisma.scheduleEvent.create({
        data: {
          landlordId,
          unitId: unit.unit_id,
          type: 'viewing',
          title: `Viewing: ${unit.name}`,
          tenantName: null,
          tenantContact: null,
          startsAt,
          endsAt,
          status: 'scheduled',
          notes,
        },
      });

  const updatedUnits = profile.units.map((entry) =>
    entry.unit_id === unit!.unit_id ? markSlotBooked(entry, startsAt) : entry,
  );
  await saveLandlordProfile({ ...profile, units: updatedUnits });

  await prisma.conversationLog.updateMany({
    where: { sessionId },
    data: { unitId: unit.unit_id, scheduleId: scheduleEvent.id },
  });

  return {
    booking_created: true,
    schedule_event_id: scheduleEvent.id,
    unit_id: unit.unit_id,
    starts_at: startsAt.toISOString(),
  };
}
