'use client';

import { useState, useEffect } from 'react';
import type { TranscriptSession } from '@/types';

export function TranscriptViewer({ landlordId }: { landlordId: string }) {
  const [sessions, setSessions] = useState<TranscriptSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/transcripts?landlord_id=${landlordId}`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
      })
      .catch((err) => console.error('Error fetching transcripts:', err))
      .finally(() => setLoading(false));
  }, [landlordId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Call Logs</h2>
        <p className="text-sm text-muted-foreground">
          Voice transcripts and typed fallback chats saved for review.
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Loading transcripts...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No call logs yet. Voice and typed conversations will appear here
            after tenants talk to the assistant.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="overflow-hidden rounded-md border border-border"
            >
              <button
                onClick={() =>
                  setSelectedSession(
                    selectedSession === session.session_id
                      ? null
                      : session.session_id,
                  )
                }
                className="w-full p-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">
                      {session.source === 'text_fallback' ? 'Text chat' : 'Voice call'}{' '}
                      {new Date(session.start_ts).toLocaleString()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {session.messages.length} messages &middot;{' '}
                      {Math.max(0, Math.round((session.end_ts - session.start_ts) / 1000))}s
                      {session.agent_id ? ` &middot; Agent: ${session.agent_id.slice(0, 8)}...` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedSession === session.session_id ? 'Hide' : 'View'}
                  </span>
                </div>
              </button>

              {selectedSession === session.session_id && (
                <div className="max-h-96 divide-y divide-border overflow-y-auto border-t border-border">
                  {session.messages.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No messages in this session.</p>
                  ) : (
                    session.messages.map((msg, i) => {
                      const isAgent = msg.uid === '0' || msg.uid === process.env.NEXT_PUBLIC_AGENT_UID;
                      return (
                        <div
                          key={`${msg.turn_id}-${i}`}
                          className={`flex flex-col px-4 py-3 ${isAgent ? 'bg-secondary/20' : ''}`}
                        >
                          <span className="mb-0.5 text-xs font-medium text-muted-foreground">
                            {isAgent ? 'Agent' : 'Tenant'}
                          </span>
                          <p className="text-sm leading-6">{msg.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
