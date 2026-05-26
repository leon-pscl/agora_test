import { NextRequest, NextResponse } from 'next/server';
import type { LandlordProfile } from '@/types';

// In-memory store — replace with database in production
const landlordStore = new Map<string, LandlordProfile>();

// Seed demo data
landlordStore.set('default-landlord', {
  landlord_id: 'default-landlord',
  units: [
    {
      unit_id: 'unit-1',
      name: 'Studio Room 3B',
      type: 'apartment',
      price: 4500,
      availability: 'available',
      address: '123 Mabini St., Brgy. Poblacion, Makati City',
      max_occupants: 2,
      pets_allowed: false,
      faqs: [
        { question: 'Magkano po ang renta?', answer: 'Php 4,500 per month po, exclusive ng tubig at kuryente.' },
        { question: 'May parking po ba?', answer: 'May street parking po, pero walang designated slot.' },
        { question: 'Pwede po bang magluto?', answer: 'Pwede po, may sariling kitchen naman ang unit.' },
      ],
      requirements: ['1 month advance', '1 month deposit', 'Valid ID', 'Proof of employment'],
      rules: ['No overnight visitors without notice', 'Tahimik after 10pm', 'No smoking inside the unit', 'Waste segregation required'],
      viewing_slots: [
        { datetime: '2026-05-27T10:00:00+08:00', available: true },
        { datetime: '2026-05-27T14:00:00+08:00', available: true },
        { datetime: '2026-05-28T09:00:00+08:00', available: true },
      ],
    },
    {
      unit_id: 'unit-2',
      name: 'Bedspace - Room A',
      type: 'bedspace',
      price: 1800,
      availability: 'available',
      address: '123 Mabini St., Brgy. Poblacion, Makati City',
      max_occupants: 1,
      pets_allowed: false,
      faqs: [
        { question: 'Ilang tao po sa isang room?', answer: '4 po sa isang room, may sariling kama at locker.' },
        { question: 'May curfew po ba?', answer: 'Wala pong curfew, pero tahimik po after 10pm.' },
      ],
      requirements: ['1 month advance', '1 month deposit', 'Valid ID'],
      rules: ['No smoking', 'Tahimik after 10pm', 'No visitors after 9pm'],
      viewing_slots: [
        { datetime: '2026-05-27T11:00:00+08:00', available: true },
        { datetime: '2026-05-28T14:00:00+08:00', available: true },
      ],
    },
  ],
  tts_voice: 'fil-PH-BlessicaNeural',
  agent_name: 'Maria',
  handoff_phone: '+639176543210',
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ landlord_id: string }> },
) {
  const { landlord_id } = await params;
  const landlord = landlordStore.get(landlord_id);

  if (!landlord) {
    return NextResponse.json(
      { error: 'Landlord not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(landlord);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ landlord_id: string }> },
) {
  const { landlord_id } = await params;

  try {
    const body: LandlordProfile = await request.json();
    landlordStore.set(landlord_id, body);
    return NextResponse.json({ success: true, landlord_id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update landlord',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ landlord_id: string }> },
) {
  const { landlord_id } = await params;
  landlordStore.delete(landlord_id);
  return NextResponse.json({ success: true });
}
