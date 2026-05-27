'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { LandlordProfile, RentalUnit, TranscriptEntry } from '@/types';
import { Button } from '@/components/ui/button';

type ChatMessage = TranscriptEntry & {
  role: 'tenant' | 'agent';
};

export function TextFallbackChat({ landlordId }: { landlordId: string }) {
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [sessionId] = useState(() => `text-${Date.now()}`);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/landlords/${landlordId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LandlordProfile | null) => {
        setProfile(data);
        setSelectedUnitId(data?.units[0]?.unit_id ?? '');
      })
      .catch(() => {});
  }, [landlordId]);

  const selectedUnit = useMemo<RentalUnit | undefined>(
    () => profile?.units.find((unit) => unit.unit_id === selectedUnitId),
    [profile, selectedUnitId],
  );

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    const createdAt = Date.now();
    setMessages((current) => [
      ...current,
      {
        turn_id: `${sessionId}-${createdAt}-tenant`,
        uid: 'tenant',
        role: 'tenant',
        text,
        createdAt,
      },
    ]);
    setMessage('');
    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/chat-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          landlord_id: landlordId,
          unit_id: selectedUnitId || undefined,
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || typeof data.reply !== 'string') {
        throw new Error(data.error ?? 'Failed to send message.');
      }
      const reply = data.reply;
      setMessages((current) => [
        ...current,
        {
          turn_id: `${sessionId}-${Date.now()}-agent`,
          uid: '0',
          role: 'agent',
          text: reply,
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Prefer typing?</h2>
        <p className="text-sm text-muted-foreground">
          Ask the rental assistant here. This chat is saved for admin review.
        </p>
      </div>

      {profile && profile.units.length > 0 && (
        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Room
          <select
            value={selectedUnitId}
            onChange={(event) => setSelectedUnitId(event.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Any available unit</option>
            {profile.units.map((unit) => (
              <option key={unit.unit_id} value={unit.unit_id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Try asking about rent, payment terms, pets, rules, or viewing times
            {selectedUnit ? ` for ${selectedUnit.name}` : ''}.
          </p>
        ) : (
          messages.map((entry) => (
            <div
              key={entry.turn_id}
              className={`rounded-lg px-3 py-2 text-sm ${
                entry.role === 'agent'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {entry.text}
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="mt-3 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type your question..."
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={sending || message.trim().length === 0}>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
