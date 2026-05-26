'use client';

import { useState } from 'react';
import type { CallSessionLog } from '@/types';

export function TranscriptViewer({ landlordId: _landlordId }: { landlordId: string }) {
  const [sessions] = useState<CallSessionLog[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const getStageLabel = (stage: CallSessionLog['stage_reached']): string => {
    const labels: Record<CallSessionLog['stage_reached'], string> = {
      inquiry: 'Inquiry',
      qualification: 'Qualification',
      scheduling: 'Scheduling',
      requirements: 'Requirements',
      followup: 'Follow-up',
    };
    return labels[stage];
  };

  const getOutcomeLabel = (outcome: CallSessionLog['outcome']): string => {
    const labels: Record<CallSessionLog['outcome'], string> = {
      booked: 'Booked',
      qualified_no_booking: 'Qualified - No Booking',
      disqualified: 'Disqualified',
      handoff: 'Handed Off',
      no_answer: 'No Answer',
      callback_requested: 'Callback Requested',
    };
    return labels[outcome];
  };

  const getOutcomeColor = (outcome: CallSessionLog['outcome']): string => {
    const colors: Record<CallSessionLog['outcome'], string> = {
      booked: 'text-green-600 bg-green-500/10',
      qualified_no_booking: 'text-yellow-600 bg-yellow-500/10',
      disqualified: 'text-red-600 bg-red-500/10',
      handoff: 'text-blue-600 bg-blue-500/10',
      no_answer: 'text-gray-600 bg-gray-500/10',
      callback_requested: 'text-purple-600 bg-purple-500/10',
    };
    return colors[outcome];
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Call Transcripts</h2>

      {sessions.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No call transcripts yet. Recordings and transcripts will appear
            here after calls are completed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.session_id}
              onClick={() =>
                setSelectedSession(
                  selectedSession === session.session_id
                    ? null
                    : session.session_id,
                )
              }
              className="w-full rounded-md border border-border p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {session.call_type === 'inbound'
                        ? 'Inbound Call'
                        : session.call_type === 'outbound_followup'
                          ? 'Follow-up Call'
                          : 'Reminder Call'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getOutcomeColor(session.outcome)}`}
                    >
                      {getOutcomeLabel(session.outcome)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stage: {getStageLabel(session.stage_reached)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.start_ts).toLocaleString()} &middot;{' '}
                    {session.handoff_triggered ? 'Handoff triggered' : 'No handoff'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedSession === session.session_id ? 'Hide' : 'View'}
                </span>
              </div>

              {selectedSession === session.session_id && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Session ID
                    </p>
                    <p className="text-sm">{session.session_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Agent ID
                    </p>
                    <p className="text-sm">{session.agent_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Duration
                    </p>
                    <p className="text-sm">
                      {Math.round(
                        (session.end_ts - session.start_ts) / 1000,
                      )}{' '}
                      seconds
                    </p>
                  </div>
                  {session.transcript_url && (
                    <a
                      href={session.transcript_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Full Transcript
                    </a>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
