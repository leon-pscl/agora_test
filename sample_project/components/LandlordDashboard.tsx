'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LandlordProfile, ScheduleEvent, TranscriptSession } from '@/types';
import { UnitKnowledgeBaseEditor } from './UnitKnowledgeBaseEditor';
import { ViewingScheduleManager } from './ViewingScheduleManager';
import { TranscriptViewer } from './TranscriptViewer';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

type DashboardTab = 'dashboard' | 'calendar' | 'room_info' | 'call_logs';

function AdminDashboardHome({ landlordId }: { landlordId: string }) {
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [sessions, setSessions] = useState<TranscriptSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResponse, scheduleResponse, transcriptResponse] = await Promise.all([
        fetch(`/api/landlords/${landlordId}`),
        fetch(`/api/schedules?landlord_id=${landlordId}`),
        fetch(`/api/transcripts?landlord_id=${landlordId}`),
      ]);
      const [nextProfile, scheduleData, transcriptData] = await Promise.all([
        profileResponse.ok ? profileResponse.json() : null,
        scheduleResponse.ok ? scheduleResponse.json() : { events: [] },
        transcriptResponse.ok ? transcriptResponse.json() : { sessions: [] },
      ]);
      setProfile(nextProfile as LandlordProfile | null);
      setEvents((scheduleData as { events: ScheduleEvent[] }).events ?? []);
      setSessions((transcriptData as { sessions: TranscriptSession[] }).sessions ?? []);
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    // Dashboard data loads after mount from multiple API endpoints.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state after responses
    void loadData();
  }, [loadData]);

  const todayEvents = useMemo(() => {
    const today = new Date();
    return events.filter((event) => {
      const startsAt = new Date(event.starts_at);
      return (
        startsAt.getFullYear() === today.getFullYear() &&
        startsAt.getMonth() === today.getMonth() &&
        startsAt.getDate() === today.getDate()
      );
    });
  }, [events]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          A quick view of unit status, today&apos;s plans, and recent conversations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Units</p>
          <p className="mt-2 text-2xl font-semibold">{profile?.units.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Vacant</p>
          <p className="mt-2 text-2xl font-semibold">
            {profile?.units.filter((unit) => unit.availability === 'available').length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Call Logs</p>
          <p className="mt-2 text-2xl font-semibold">{sessions.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Room Status</h3>
          <div className="space-y-2">
            {profile?.units.map((unit) => (
              <div key={unit.unit_id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      PHP {unit.price.toLocaleString()} / month
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {unit.availability === 'available' ? 'Vacant' : unit.availability}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Today&apos;s Plans</h3>
          {todayEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No viewings or special calls scheduled today.
            </div>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.starts_at)} - {event.status}
                  </p>
                  {event.tenant_name && (
                    <p className="mt-1 text-sm">{event.tenant_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function LandlordDashboard({
  landlordId,
  onTestCall,
  onLogout,
}: {
  landlordId: string;
  onTestCall?: () => void;
  onLogout?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'room_info', label: 'Room Info' },
    { id: 'call_logs', label: 'Call Logs' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">Rental Voice Agent Dashboard</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onTestCall}
          >
            Voice Agent
          </Button>
          {onLogout && (
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Logout
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-56 shrink-0 flex-col border-r border-border p-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
            <AdminDashboardHome landlordId={landlordId} />
          )}
          {activeTab === 'room_info' && (
            <UnitKnowledgeBaseEditor landlordId={landlordId} />
          )}
          {activeTab === 'calendar' && (
            <ViewingScheduleManager landlordId={landlordId} />
          )}
          {activeTab === 'call_logs' && (
            <TranscriptViewer landlordId={landlordId} />
          )}
        </main>
      </div>
    </div>
  );
}
