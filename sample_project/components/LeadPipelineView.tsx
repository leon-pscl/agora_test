'use client';

import { useState } from 'react';
import type { BookingRecord } from '@/types';
import { formatDateTime } from '@/lib/utils';

const STATUS_COLORS: Record<BookingRecord['status'], string> = {
  scheduled: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  no_show: 'bg-red-500/10 text-red-600 border-red-500/30',
  completed: 'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

const PIPELINE_STAGES = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'scheduled', label: 'Viewing Scheduled' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Moved In' },
];

export function LeadPipelineView({ landlordId: _landlordId }: { landlordId: string }) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Lead Pipeline</h2>

      {/* Pipeline visualization */}
      <div className="flex gap-2">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2">
            <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium">
              {stage.label}
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <span className="text-muted-foreground">&rarr;</span>
            )}
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No leads yet. Leads will appear here when tenants call and book
            viewings through the voice agent.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <div
              key={booking.booking_id}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{booking.tenant_name}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.tenant_phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  Viewing: {formatDateTime(booking.viewing_datetime)}
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status]}`}
              >
                {booking.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
