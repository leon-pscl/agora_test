'use client';

import { useState, useEffect } from 'react';

type LiveCallNotification = {
  id: string;
  tenantName: string;
  unitName: string;
  duration: number;
  stage: string;
  handoffRequested: boolean;
  timestamp: number;
};

export function CallNotificationPanel({
  landlordId: _landlordId,
  onLiveCallChange,
}: {
  landlordId: string;
  onLiveCallChange: (active: boolean) => void;
}) {
  const [notifications, setNotifications] = useState<LiveCallNotification[]>(
    [],
  );
  const [isLiveCall, setIsLiveCall] = useState(false);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Notifications</h2>

      {/* Live Call Status */}
      {isLiveCall && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3">
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <div>
                <p className="text-sm font-medium">Live Call in Progress</p>
                <p className="text-xs text-muted-foreground">
                  A tenant is currently speaking with your rental agent
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // TODO: Join the channel for live monitoring
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Listen In
            </button>
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground">
                Notifications for handoff requests, booking confirmations, and
                call outcomes will appear here.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-md border p-4 ${
                notification.handoffRequested
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {notification.handoffRequested
                        ? 'Handoff Requested'
                        : 'Booking Confirmed'}
                    </span>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground">
                      {notification.unitName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tenant: {notification.tenantName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stage: {notification.stage} &middot;{' '}
                    {Math.round(notification.duration / 60)} min call
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notification.handoffRequested && (
                    <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      Call Tenant Back
                    </button>
                  )}
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
