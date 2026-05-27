import { NextRequest, NextResponse } from 'next/server';
import type { ScheduleEvent, ViewingSlot } from '@/types';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureDefaultLandlordSeeded, getLandlordProfile } from '@/lib/landlords';

function toScheduleEvent(record: {
  id: string;
  landlordId: string;
  unitId: string | null;
  type: string;
  title: string;
  tenantName: string | null;
  tenantContact: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  notes: string | null;
}): ScheduleEvent {
  return {
    id: record.id,
    landlord_id: record.landlordId,
    unit_id: record.unitId,
    type: record.type as ScheduleEvent['type'],
    title: record.title,
    tenant_name: record.tenantName,
    tenant_contact: record.tenantContact,
    starts_at: record.startsAt.toISOString(),
    ends_at: record.endsAt.toISOString(),
    status: record.status as ScheduleEvent['status'],
    notes: record.notes,
  };
}

function derivedViewingEvent(
  landlordId: string,
  unit: { unit_id: string; name: string },
  slot: ViewingSlot,
  index: number,
): ScheduleEvent {
  const startsAt = new Date(slot.datetime);
  const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

  return {
    id: `slot-${unit.unit_id}-${index}`,
    landlord_id: landlordId,
    unit_id: unit.unit_id,
    type: 'viewing',
    title: `Viewing: ${unit.name}`,
    tenant_name: null,
    tenant_contact: null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: slot.available ? 'available' : 'scheduled',
    notes: 'Derived from unit viewing slots. Save edits to create a calendar event.',
  };
}

function isAdmin(request: NextRequest): boolean {
  return getSessionFromRequest(request)?.role === 'admin';
}

function scheduleDedupKey(unitId: string, startsAt: string | Date): string {
  return `${unitId}:${new Date(startsAt).getTime()}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const landlordId =
    searchParams.get('landlord_id') ??
    process.env.NEXT_PUBLIC_LANDLORD_ID ??
    'default-landlord';

  try {
    await ensureDefaultLandlordSeeded();
    const [profile, persisted] = await Promise.all([
      getLandlordProfile(landlordId),
      prisma.scheduleEvent.findMany({
        where: { landlordId },
        orderBy: { startsAt: 'asc' },
      }),
    ]);

    const persistedEvents = persisted.map(toScheduleEvent);
    const persistedViewingKeys = new Set(
      persistedEvents
        .filter((event) => event.type === 'viewing' && event.unit_id)
        .map((event) => scheduleDedupKey(event.unit_id!, event.starts_at)),
    );
    const derivedEvents =
      profile?.units.flatMap((unit) =>
        unit.viewing_slots
          .map((slot, index) => derivedViewingEvent(landlordId, unit, slot, index))
          .filter(
            (event) =>
              event.unit_id &&
              !persistedViewingKeys.has(scheduleDedupKey(event.unit_id, event.starts_at)),
          ),
      ) ?? [];

    return NextResponse.json({
      events: [...persistedEvents, ...derivedEvents].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load schedules' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body: Partial<ScheduleEvent> = await request.json();
    if (!body.landlord_id || !body.title || !body.starts_at || !body.ends_at) {
      return NextResponse.json(
        { error: 'landlord_id, title, starts_at, and ends_at are required' },
        { status: 400 },
      );
    }

    const event = await prisma.scheduleEvent.create({
      data: {
        landlordId: body.landlord_id,
        unitId: body.unit_id ?? null,
        type: body.type ?? 'viewing',
        title: body.title,
        tenantName: body.tenant_name ?? null,
        tenantContact: body.tenant_contact ?? null,
        startsAt: new Date(body.starts_at),
        endsAt: new Date(body.ends_at),
        status: body.status ?? 'scheduled',
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(toScheduleEvent(event), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create schedule' },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body: Partial<ScheduleEvent> & { id?: string } = await request.json();
    if (!body.id || body.id.startsWith('slot-')) {
      return NextResponse.json(
        { error: 'Save derived viewing slots as new events before editing.' },
        { status: 400 },
      );
    }

    const event = await prisma.scheduleEvent.update({
      where: { id: body.id },
      data: {
        ...(body.unit_id !== undefined ? { unitId: body.unit_id } : {}),
        ...(body.type ? { type: body.type } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.tenant_name !== undefined ? { tenantName: body.tenant_name } : {}),
        ...(body.tenant_contact !== undefined ? { tenantContact: body.tenant_contact } : {}),
        ...(body.starts_at ? { startsAt: new Date(body.starts_at) } : {}),
        ...(body.ends_at ? { endsAt: new Date(body.ends_at) } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return NextResponse.json(toScheduleEvent(event));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update schedule' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || id.startsWith('slot-')) {
      return NextResponse.json(
        { error: 'Only saved calendar events can be deleted.' },
        { status: 400 },
      );
    }

    await prisma.scheduleEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete schedule' },
      { status: 400 },
    );
  }
}
