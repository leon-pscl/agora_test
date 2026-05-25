'use client';

import { useState, useCallback } from 'react';
import type { ViewingSlot } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

export function ViewingScheduleManager({ landlordId: _landlordId }: { landlordId: string }) {
  const [slots, setSlots] = useState<ViewingSlot[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const addSlot = useCallback(() => {
    if (!newDate || !newTime) return;
    const datetime = new Date(`${newDate}T${newTime}`).toISOString();
    setSlots((prev) =>
      [...prev, { datetime, available: true }].sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      ),
    );
    setNewDate('');
    setNewTime('');
  }, [newDate, newTime]);

  const toggleSlot = useCallback((index: number) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, available: !slot.available } : slot,
      ),
    );
  }, []);

  const deleteSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const generateRepeatingSlots = useCallback(() => {
    const weeklySlots: ViewingSlot[] = [];
    for (let week = 0; week < 2; week++) {
      for (let day = 0; day < 7; day++) {
        const base = new Date();
        base.setDate(base.getDate() + week * 7 + day);
        base.setHours(10, 0, 0, 0);
        weeklySlots.push({
          datetime: base.toISOString(),
          available: true,
        });
        const afternoon = new Date(base);
        afternoon.setHours(14, 0, 0, 0);
        weeklySlots.push({
          datetime: afternoon.toISOString(),
          available: true,
        });
      }
    }
    setSlots(weeklySlots);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Viewing Schedule</h2>
        <Button variant="outline" size="sm" onClick={generateRepeatingSlots}>
          Generate 2-Week Slots
        </Button>
      </div>

      <div className="flex items-end gap-3 rounded-lg border border-border p-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Date
          </label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Time
          </label>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button size="sm" onClick={addSlot}>
          Add Slot
        </Button>
      </div>

      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No viewing slots configured. Add slots manually or generate a
            2-week repeating schedule.
          </p>
        ) : (
          slots.map((slot, i) => (
            <div
              key={slot.datetime}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    slot.available ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm">
                  {formatDateTime(slot.datetime)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {slot.available ? 'Available' : 'Booked'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSlot(i)}
                >
                  {slot.available ? 'Mark Booked' : 'Mark Available'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSlot(i)}
                >
                  x
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
