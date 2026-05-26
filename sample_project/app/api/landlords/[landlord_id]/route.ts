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
    {
      unit_id: 'unit-3',
      name: 'One-Bedroom Unit 5C',
      type: 'apartment',
      price: 8000,
      availability: 'available',
      address: '123 Mabini St., Brgy. Poblacion, Makati City',
      max_occupants: 3,
      pets_allowed: true,
      faqs: [
        { question: 'Magkano po ang renta?', answer: 'Php 8,000 per month po, may sariling CR at kitchen.' },
        { question: 'May aircon po ba?', answer: 'May window-type aircon po sa sala at sa kwarto.' },
        { question: 'Pwede po ba ang pusa?', answer: 'Opo, allowed po ang pets, may additional deposit lang na Php 1,000.' },
      ],
      requirements: ['2 months advance', '1 month deposit', 'Valid ID', 'Proof of employment', 'Pet deposit (if applicable)'],
      rules: ['Tahimik after 10pm', 'No smoking inside the unit', 'Pets must be vaccinated', 'Waste segregation required', 'No kaldero sa labas'],
      viewing_slots: [
        { datetime: '2026-05-27T15:00:00+08:00', available: true },
        { datetime: '2026-05-28T10:00:00+08:00', available: true },
        { datetime: '2026-05-29T14:00:00+08:00', available: true },
      ],
    },
    {
      unit_id: 'unit-4',
      name: 'Studio Room 2A - New Building',
      type: 'room',
      price: 5500,
      availability: 'available',
      address: '456 P. Gomez St., Brgy. San Antonio, Makati City',
      max_occupants: 2,
      pets_allowed: false,
      faqs: [
        { question: 'Magkano po ang renta?', answer: 'Php 5,500 per month po, may sariling CR, included na ang tubig.' },
        { question: 'May elevator po ba?', answer: 'Opo, may elevator ang building at may 24/7 security guard.' },
        { question: 'Malapit po ba sa MRT?', answer: '5 minutes walk po sa MRT Ayala station.' },
      ],
      requirements: ['1 month advance', '1 month deposit', 'Valid ID', 'Proof of employment', 'Security deposit: Php 2,000'],
      rules: ['No smoking', 'Tahimik after 10pm', 'No visitors overnight', 'No washing of clothes sa CR', 'Use designated smoking area'],
      viewing_slots: [
        { datetime: '2026-05-27T09:00:00+08:00', available: true },
        { datetime: '2026-05-28T11:00:00+08:00', available: true },
        { datetime: '2026-05-29T15:00:00+08:00', available: true },
      ],
    },
    {
      unit_id: 'unit-5',
      name: 'Shared Dorm - 6 Beds',
      type: 'bedspace',
      price: 1200,
      availability: 'available',
      address: '789 Aurora Blvd., Brgy. Kaunlaran, Cubao, Quezon City',
      max_occupants: 6,
      pets_allowed: false,
      faqs: [
        { question: 'Magkano po?', answer: 'Php 1,200 per month per bed, bedspace lang po.' },
        { question: 'May locker po ba?', answer: 'Yes po, may personal locker ang bawat isa.' },
        { question: 'May curfew po?', answer: 'Wala pong curfew pero tahimik after 10pm.' },
        { question: 'Included na po ba ang kuryente?', answer: 'Sharing po ang kuryente at tubig based sa number ng occupants.' },
      ],
      requirements: ['1 month advance', '1 month deposit', 'Valid ID'],
      rules: ['No smoking inside', 'Tahimik after 10pm', 'No visitors after 8pm', 'Keep common areas clean', 'No alcoholic drinks sa room'],
      viewing_slots: [
        { datetime: '2026-05-27T13:00:00+08:00', available: true },
        { datetime: '2026-05-28T16:00:00+08:00', available: true },
      ],
    },
    {
      unit_id: 'unit-6',
      name: 'Room for Rent - Family Room',
      type: 'room',
      price: 3500,
      availability: 'reserved',
      address: '789 Aurora Blvd., Brgy. Kaunlaran, Cubao, Quezon City',
      max_occupants: 2,
      pets_allowed: false,
      faqs: [
        { question: 'Sulit po ba?', answer: 'Php 3,500 per month, good for 2 persons, shared CR po.' },
        { question: 'May kitchen po?', answer: 'Shared kitchen po with other tenants.' },
        { question: 'Malapit po ba sa LRT?', answer: 'Malapit po sa LRT2 Cubao station, 10 minutes walk.' },
      ],
      requirements: ['1 month advance', '1 month deposit', 'Valid ID', 'Barangay clearance'],
      rules: ['No smoking', 'Tahimik after 10pm', 'No visitors after 9pm', 'Schedule ng laundry', 'Clean as you go sa kitchen'],
      viewing_slots: [
        { datetime: '2026-05-28T14:00:00+08:00', available: true },
      ],
    },
    {
      unit_id: 'unit-7',
      name: 'Studio with Balcony - 8F',
      type: 'apartment',
      price: 12000,
      availability: 'available',
      address: '100 BGC Center, Brgy. Fort Bonifacio, Taguig City',
      max_occupants: 2,
      pets_allowed: true,
      faqs: [
        { question: 'Magkano po ang renta?', answer: 'Php 12,000 per month po, may balcony at maganda ang view.' },
        { question: 'Included na po ba ang parking?', answer: 'May basement parking po, Php 1,500 additional per month.' },
        { question: 'May gym po ba sa building?', answer: 'Opo, may gym at pool ang building, included na sa rent.' },
        { question: 'Pwede po ba ang aso?', answer: 'Opo, pet-friendly po, may additional deposit na Php 2,000.' },
      ],
      requirements: ['2 months advance', '2 months deposit', 'Valid ID', 'Proof of employment (3 months payslip)', 'Pet deposit (if applicable)', 'Co-maker required'],
      rules: ['No smoking inside unit (use balcony)', 'Tahimik after 10pm', 'Register all guests sa lobby', 'Pets on leash sa common areas', 'No exceeding max occupants'],
      viewing_slots: [
        { datetime: '2026-05-27T16:00:00+08:00', available: true },
        { datetime: '2026-05-28T15:00:00+08:00', available: true },
        { datetime: '2026-05-29T10:00:00+08:00', available: true },
        { datetime: '2026-05-30T11:00:00+08:00', available: true },
      ],
    },
  ],
  tts_voice: 'fil-PH-BlessicaNeural',
  agent_name: 'Maria',
  handoff_phone: '+639176543210',
});

landlordStore.set('landlord-caloocan', {
  landlord_id: 'landlord-caloocan',
  units: [
    {
      unit_id: 'c-unit-1',
      name: 'Apartment - 2BR near Monumento',
      type: 'apartment',
      price: 6500,
      availability: 'available',
      address: '200 Rizal Ave., Brgy. Grace Park, Caloocan City',
      max_occupants: 4,
      pets_allowed: true,
      faqs: [
        { question: 'Magkano po?', answer: 'Php 6,500 per month, 2 bedrooms, 1 CR.' },
        { question: 'Malapit po sa LRT?', answer: '5 minutes walk sa LRT1 Monumento station.' },
        { question: 'May sariling metro po ba ng kuryente?', answer: 'Opo, direct sa Meralco, hindi po sharing.' },
      ],
      requirements: ['1 month advance', '1 month deposit', 'Valid ID', 'Proof of residence'],
      rules: ['No smoking inside', 'Quiet hours 10pm-6am', 'No tambay sa hallway', 'Waste segregation'],
      viewing_slots: [
        { datetime: '2026-05-28T10:00:00+08:00', available: true },
        { datetime: '2026-05-29T13:00:00+08:00', available: true },
      ],
    },
    {
      unit_id: 'c-unit-2',
      name: 'Bedspace for Men - 8 Beds',
      type: 'bedspace',
      price: 1500,
      availability: 'available',
      address: '150 Samson Rd., Brgy. 12, Caloocan City',
      max_occupants: 1,
      pets_allowed: false,
      faqs: [
        { question: 'Magkano po?', answer: 'Php 1,500 per month, for men only, bedspace with locker.' },
        { question: 'May curfew po?', answer: 'Wala po, pero sarado po ang gate ng 11pm.' },
      ],
      requirements: ['1 month advance', 'Valid ID', 'For men only'],
      rules: ['No smoking', 'No alcohol', 'No babae sa loob ng room', 'Quiet after 10pm'],
      viewing_slots: [
        { datetime: '2026-05-27T10:00:00+08:00', available: true },
        { datetime: '2026-05-28T11:00:00+08:00', available: true },
      ],
    },
  ],
  tts_voice: 'fil-PH-BlessicaNeural',
  agent_name: 'Juan',
  handoff_phone: '+639177654321',
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
