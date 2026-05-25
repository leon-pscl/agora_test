'use client';

import { useState } from 'react';
import { UnitKnowledgeBaseEditor } from './UnitKnowledgeBaseEditor';
import { ViewingScheduleManager } from './ViewingScheduleManager';
import { LeadPipelineView } from './LeadPipelineView';
import { TranscriptViewer } from './TranscriptViewer';
import { CallNotificationPanel } from './CallNotificationPanel';
import { Button } from '@/components/ui/button';

type DashboardTab = 'units' | 'schedule' | 'leads' | 'transcripts' | 'notifications';

export function LandlordDashboard({ landlordId }: { landlordId: string }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('units');
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'units', label: 'Units & Knowledge Base' },
    { id: 'schedule', label: 'Viewing Schedule' },
    { id: 'leads', label: 'Lead Pipeline' },
    { id: 'transcripts', label: 'Call Transcripts' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">Rental Voice Agent Dashboard</h1>
        <div className="flex items-center gap-3">
          {isLiveCallActive && (
            <span className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              <span className="h-2 w-2 animate-ping rounded-full bg-green-500" />
              Live Call Active
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Test Call
          </Button>
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
          {activeTab === 'units' && (
            <UnitKnowledgeBaseEditor landlordId={landlordId} />
          )}
          {activeTab === 'schedule' && (
            <ViewingScheduleManager landlordId={landlordId} />
          )}
          {activeTab === 'leads' && (
            <LeadPipelineView landlordId={landlordId} />
          )}
          {activeTab === 'transcripts' && (
            <TranscriptViewer landlordId={landlordId} />
          )}
          {activeTab === 'notifications' && (
            <CallNotificationPanel
              landlordId={landlordId}
              onLiveCallChange={setIsLiveCallActive}
            />
          )}
        </main>
      </div>
    </div>
  );
}
