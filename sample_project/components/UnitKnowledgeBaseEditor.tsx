'use client';

import { useState, useCallback, useEffect } from 'react';
import type { RentalUnit } from '@/types';
import { Button } from '@/components/ui/button';

const SUGGESTED_QUESTIONS = [
  'Magkano po ang renta?',
  'Ano pong kasama sa renta?',
  'May parking po ba?',
  'Malapit po ba sa tricycle/jeep?',
  'Pwede po bang magluto?',
  'May curfew po ba?',
];

const INITIAL_UNITS: RentalUnit[] = [
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
    viewing_slots: [],
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
    viewing_slots: [],
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
    viewing_slots: [],
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
    viewing_slots: [],
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
    viewing_slots: [],
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
    viewing_slots: [],
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
    viewing_slots: [],
  },
];

export function UnitKnowledgeBaseEditor({ landlordId }: { landlordId: string }) {
  const [units, setUnits] = useState<RentalUnit[]>(INITIAL_UNITS);
  const [selectedUnit, setSelectedUnit] = useState(0);

  useEffect(() => {
    fetch(`/api/landlords/${landlordId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.units && data.units.length > 0) {
          setUnits(data.units);
        }
      })
      .catch(() => {});
  }, [landlordId]);

  const updateUnit = useCallback(
    (index: number, updates: Partial<RentalUnit>) => {
      setUnits((prev) =>
        prev.map((u, i) => (i === index ? { ...u, ...updates } : u)),
      );
    },
    [],
  );

  const addUnit = useCallback(() => {
    setUnits((prev) => [
      ...prev,
      {
        unit_id: `unit-${Date.now()}`,
        name: '',
        type: 'apartment',
        price: 0,
        availability: 'available',
        address: '',
        max_occupants: 1,
        pets_allowed: false,
        faqs: [],
        requirements: [''],
        rules: [''],
        viewing_slots: [],
      },
    ]);
  }, []);

  const saveLandlord = useCallback(async () => {
    await fetch(`/api/landlords/${landlordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landlord_id: landlordId,
        units,
        tts_voice: 'fil-PH-BlessicaNeural',
        agent_name: 'Maria',
        handoff_phone: '',
      }),
    });
  }, [landlordId, units]);

  const unit = units[selectedUnit];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Units & Knowledge Base</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addUnit}>
            Add Unit
          </Button>
          <Button size="sm" onClick={saveLandlord}>
            Save All
          </Button>
        </div>
      </div>

      {/* Unit Selector */}
      <div className="flex gap-2">
        {units.map((u, i) => (
          <button
            key={u.unit_id}
            onClick={() => setSelectedUnit(i)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              i === selectedUnit
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {u.name || `Unit ${i + 1}`}
          </button>
        ))}
      </div>

      {unit && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Basic Info
            </h3>
            <div>
              <label className="text-xs font-medium">Unit Name</label>
              <input
                type="text"
                value={unit.name}
                onChange={(e) => updateUnit(selectedUnit, { name: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Studio Room 3B"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Type</label>
              <select
                value={unit.type}
                onChange={(e) =>
                  updateUnit(selectedUnit, {
                    type: e.target.value as RentalUnit['type'],
                  })
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="apartment">Apartment</option>
                <option value="room">Room</option>
                <option value="bedspace">Bedspace</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Monthly Rent (PHP)</label>
              <input
                type="number"
                value={unit.price}
                onChange={(e) =>
                  updateUnit(selectedUnit, { price: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Address</label>
              <input
                type="text"
                value={unit.address}
                onChange={(e) =>
                  updateUnit(selectedUnit, { address: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Max Occupants</label>
              <input
                type="number"
                value={unit.max_occupants}
                onChange={(e) =>
                  updateUnit(selectedUnit, {
                    max_occupants: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={unit.pets_allowed}
                  onChange={(e) =>
                    updateUnit(selectedUnit, {
                      pets_allowed: e.target.checked,
                    })
                  }
                />
                Pets Allowed
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Requirements */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Move-in Requirements
              </h3>
              {unit.requirements.map((req, i) => (
                <div key={i} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => {
                      const newReq = [...unit.requirements];
                      newReq[i] = e.target.value;
                      updateUnit(selectedUnit, { requirements: newReq });
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newReq = unit.requirements.filter(
                        (_, idx) => idx !== i,
                      );
                      updateUnit(selectedUnit, { requirements: newReq });
                    }}
                  >
                    x
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  updateUnit(selectedUnit, {
                    requirements: [...unit.requirements, ''],
                  })
                }
              >
                Add Requirement
              </Button>
            </div>

            {/* Rules */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                House Rules
              </h3>
              {unit.rules.map((rule, i) => (
                <div key={i} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => {
                      const newRules = [...unit.rules];
                      newRules[i] = e.target.value;
                      updateUnit(selectedUnit, { rules: newRules });
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newRules = unit.rules.filter(
                        (_, idx) => idx !== i,
                      );
                      updateUnit(selectedUnit, { rules: newRules });
                    }}
                  >
                    x
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  updateUnit(selectedUnit, {
                    rules: [...unit.rules, ''],
                  })
                }
              >
                Add Rule
              </Button>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Frequently Asked Questions
              </h3>
              {unit.faqs.map((faq, i) => (
                <div key={i} className="mt-2 space-y-1">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => {
                      const newFaqs = [...unit.faqs];
                      newFaqs[i] = { ...newFaqs[i], question: e.target.value };
                      updateUnit(selectedUnit, { faqs: newFaqs });
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Question"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) => {
                      const newFaqs = [...unit.faqs];
                      newFaqs[i] = { ...newFaqs[i], answer: e.target.value };
                      updateUnit(selectedUnit, { faqs: newFaqs });
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Answer"
                    rows={2}
                  />
                  <div className="flex gap-1">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          const newFaqs = [...unit.faqs];
                          newFaqs[i] = { ...newFaqs[i], question: q };
                          updateUnit(selectedUnit, { faqs: newFaqs });
                        }}
                        className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  updateUnit(selectedUnit, {
                    faqs: [...unit.faqs, { question: '', answer: '' }],
                  })
                }
              >
                Add FAQ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
