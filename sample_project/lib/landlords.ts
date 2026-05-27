import type { FAQ, LandlordProfile, RentalUnit, ViewingSlot } from '@/types';
import { prisma } from '@/lib/db';
import { indexLandlordKnowledge } from '@/lib/knowledge';

function parseJsonArray<T>(value: string, fallback: T[] = []): T[] {
  try {
    return JSON.parse(value) as T[];
  } catch {
    return fallback;
  }
}

function serializeUnit(unit: RentalUnit) {
  return {
    unitId: unit.unit_id,
    name: unit.name,
    type: unit.type,
    price: unit.price,
    availability: unit.availability,
    address: unit.address,
    maxOccupants: unit.max_occupants,
    petsAllowed: unit.pets_allowed,
    faqs: JSON.stringify(unit.faqs),
    requirements: JSON.stringify(unit.requirements),
    rules: JSON.stringify(unit.rules),
    viewingSlots: JSON.stringify(unit.viewing_slots),
  };
}

function mapUnit(record: {
  unitId: string;
  name: string;
  type: string;
  price: number;
  availability: string;
  address: string;
  maxOccupants: number;
  petsAllowed: boolean;
  faqs: string;
  requirements: string;
  rules: string;
  viewingSlots: string;
}): RentalUnit {
  return {
    unit_id: record.unitId,
    name: record.name,
    type: record.type as RentalUnit['type'],
    price: record.price,
    availability: record.availability as RentalUnit['availability'],
    address: record.address,
    max_occupants: record.maxOccupants,
    pets_allowed: record.petsAllowed,
    faqs: parseJsonArray<FAQ>(record.faqs),
    requirements: parseJsonArray<string>(record.requirements),
    rules: parseJsonArray<string>(record.rules),
    viewing_slots: parseJsonArray<ViewingSlot>(record.viewingSlots),
  };
}

export async function getLandlordProfile(landlordId: string): Promise<LandlordProfile | null> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    include: { units: true },
  });

  if (!landlord) return null;

  return {
    landlord_id: landlord.id,
    tts_voice: landlord.ttsVoice,
    agent_name: landlord.agentName,
    handoff_phone: landlord.handoffPhone,
    units: landlord.units.map(mapUnit),
  };
}

export async function saveLandlordProfile(profile: LandlordProfile): Promise<LandlordProfile> {
  await prisma.landlord.upsert({
    where: { id: profile.landlord_id },
    create: {
      id: profile.landlord_id,
      ttsVoice: profile.tts_voice,
      agentName: profile.agent_name,
      handoffPhone: profile.handoff_phone,
    },
    update: {
      ttsVoice: profile.tts_voice,
      agentName: profile.agent_name,
      handoffPhone: profile.handoff_phone,
    },
  });

  await prisma.unit.deleteMany({ where: { landlordId: profile.landlord_id } });
  if (profile.units.length > 0) {
    await prisma.unit.createMany({
      data: profile.units.map((unit) => ({
        landlordId: profile.landlord_id,
        ...serializeUnit(unit),
      })),
    });
  }

  await indexLandlordKnowledge(profile.landlord_id, profile.units);
  return profile;
}

export async function ensureDefaultLandlordSeeded(): Promise<void> {
  const defaultLandlordId = process.env.NEXT_PUBLIC_LANDLORD_ID ?? 'default-landlord';
  const existing = await prisma.landlord.findUnique({ where: { id: defaultLandlordId } });
  if (existing) return;

  await saveLandlordProfile(DEFAULT_LANDLORD);
}

const DEFAULT_LANDLORD: LandlordProfile = {
  landlord_id: 'default-landlord',
  tts_voice: 'fil-PH-BlessicaNeural',
  agent_name: 'Maria',
  handoff_phone: '+639176543210',
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
  ],
};
