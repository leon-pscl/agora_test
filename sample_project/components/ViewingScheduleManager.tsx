'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LandlordProfile, RentalUnit, ScheduleEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

type DraftEvent = {
  id?: string;
  type: ScheduleEvent['type'];
  unit_id: string;
  title: string;
  tenant_name: string;
  tenant_contact: string;
  starts_at: string;
  ends_at: string;
  status: ScheduleEvent['status'];
  notes: string;
};

const fetchOpts: RequestInit = { credentials: 'include' };

function isDerivedEvent(event: ScheduleEvent): boolean {
  return event.id.startsWith('slot-');
}

function isPersistedEvent(event: ScheduleEvent): boolean {
  return !isDerivedEvent(event);
}

function toLocalInputValue(value: string): string {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function emptyDraft(unitId = ''): DraftEvent {
  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

  return {
    type: 'viewing',
    unit_id: unitId,
    title: 'Viewing appointment',
    tenant_name: '',
    tenant_contact: '',
    starts_at: toLocalInputValue(startsAt.toISOString()),
    ends_at: toLocalInputValue(endsAt.toISOString()),
    status: 'scheduled',
    notes: '',
  };
}

function eventToDraft(event: ScheduleEvent): DraftEvent {
  return {
    id: event.id,
    type: event.type,
    unit_id: event.unit_id ?? '',
    title: event.title,
    tenant_name: event.tenant_name ?? '',
    tenant_contact: event.tenant_contact ?? '',
    starts_at: toLocalInputValue(event.starts_at),
    ends_at: toLocalInputValue(event.ends_at),
    status: event.status,
    notes: event.notes ?? '',
  };
}

function EventCard({
  event,
  saving,
  onSelect,
  onDelete,
}: {
  event: ScheduleEvent;
  saving: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const derived = isDerivedEvent(event);

  return (
    <div className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{event.title}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {event.type === 'special_call' ? 'Special call' : 'Viewing'}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {event.status}
            </span>
            {derived && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
                From unit slots
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(event.starts_at)}
          </p>
          {(event.tenant_name || event.tenant_contact || event.notes) && (
            <p className="mt-2 text-sm">
              {[event.tenant_name, event.tenant_contact, event.notes]
                .filter(Boolean)
                .join(' - ')}
            </p>
          )}
        </button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export function ViewingScheduleManager({ landlordId }: { landlordId: string }) {
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [draft, setDraft] = useState<DraftEvent>(() => emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { persistedEvents, derivedEvents } = useMemo(() => {
    const persisted = events.filter(isPersistedEvent);
    const derived = events.filter(isDerivedEvent);
    return { persistedEvents: persisted, derivedEvents: derived };
  }, [events]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileResponse, scheduleResponse] = await Promise.all([
        fetch(`/api/landlords/${landlordId}`, fetchOpts),
        fetch(`/api/schedules?landlord_id=${landlordId}`, fetchOpts),
      ]);
      if (!profileResponse.ok || !scheduleResponse.ok) {
        throw new Error('Failed to load calendar data.');
      }
      const nextProfile = (await profileResponse.json()) as LandlordProfile;
      const scheduleData = (await scheduleResponse.json()) as { events: ScheduleEvent[] };
      setProfile(nextProfile);
      setEvents(scheduleData.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state after responses
    void loadData();
  }, [loadData]);

  const saveEvent = useCallback(async () => {
    if (!draft.title || !draft.starts_at || !draft.ends_at) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const isUpdate = Boolean(draft.id && !draft.id.startsWith('slot-'));
      const response = await fetch('/api/schedules', {
        method: isUpdate ? 'PATCH' : 'POST',
        ...fetchOpts,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isUpdate ? draft.id : undefined,
          landlord_id: landlordId,
          unit_id: draft.unit_id || null,
          type: draft.type,
          title: draft.title,
          tenant_name: draft.tenant_name || null,
          tenant_contact: draft.tenant_contact || null,
          starts_at: new Date(draft.starts_at).toISOString(),
          ends_at: new Date(draft.ends_at).toISOString(),
          status: draft.status,
          notes: draft.notes || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to save calendar event.');
      }

      setSuccess(isUpdate ? 'Event updated.' : 'Event created.');
      setDraft(emptyDraft(profile?.units[0]?.unit_id ?? ''));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }, [draft, landlordId, loadData, profile]);

  const deleteEvent = useCallback(
    async (event: ScheduleEvent) => {
      if (!isPersistedEvent(event)) {
        setError('Unit viewing slots are read-only here. Use "Add to calendar" to create an editable event.');
        return;
      }

      if (!window.confirm(`Delete "${event.title}"?`)) return;

      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const response = await fetch(`/api/schedules?id=${event.id}`, {
          method: 'DELETE',
          ...fetchOpts,
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to delete event.');
        }
        setSuccess('Event deleted.');
        if (draft.id === event.id) {
          setDraft(emptyDraft(profile?.units[0]?.unit_id ?? ''));
        }
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete event.');
      } finally {
        setSaving(false);
      }
    },
    [draft.id, loadData, profile],
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading calendar...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage viewing appointments and special inquiry calls.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(emptyDraft(profile?.units[0]?.unit_id ?? ''));
            setError(null);
            setSuccess(null);
          }}
        >
          New Event
        </Button>
      </div>

      {success && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Calendar events</h3>
            {persistedEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No saved events yet. Use the form to add one, or convert a unit slot below.
              </div>
            ) : (
              persistedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  saving={saving}
                  onSelect={() => {
                    setDraft(eventToDraft(event));
                    setError(null);
                    setSuccess(null);
                  }}
                  onDelete={() => void deleteEvent(event)}
                />
              ))
            )}
          </section>

          {derivedEvents.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Unit viewing slots (read-only)</h3>
              <p className="text-xs text-muted-foreground">
                These come from Room Info. Select one and use &quot;Add to calendar&quot; to make it editable here.
              </p>
              {derivedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  saving={saving}
                  onSelect={() => {
                    setDraft(eventToDraft(event));
                    setError(null);
                    setSuccess(null);
                  }}
                />
              ))}
            </section>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">
            {draft.id && isPersistedEvent({ ...draft, id: draft.id } as ScheduleEvent)
              ? 'Edit Event'
              : draft.id
                ? 'Add to calendar'
                : 'Add Event'}
          </h3>
          <label className="block text-xs font-medium text-muted-foreground">
            Type
            <select
              value={draft.type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as ScheduleEvent['type'],
                }))
              }
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="viewing">Viewing</option>
              <option value="special_call">Special inquiry call</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Unit
            <select
              value={draft.unit_id}
              onChange={(event) =>
                setDraft((current) => ({ ...current, unit_id: event.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No specific unit</option>
              {profile?.units.map((unit: RentalUnit) => (
                <option key={unit.unit_id} value={unit.unit_id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Title
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Starts
              <input
                type="datetime-local"
                value={draft.starts_at}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, starts_at: event.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Ends
              <input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, ends_at: event.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as ScheduleEvent['status'],
                }))
              }
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="available">Available</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Tenant name
            <input
              value={draft.tenant_name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, tenant_name: event.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Tenant contact
            <input
              value={draft.tenant_contact}
              onChange={(event) =>
                setDraft((current) => ({ ...current, tenant_contact: event.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="sm" onClick={() => void saveEvent()} disabled={saving}>
            {draft.id?.startsWith('slot-') ? 'Add to calendar' : 'Save Event'}
          </Button>
        </div>
      </div>
    </div>
  );
}
