'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useRTCClient,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  useClientEvent,
  useJoin,
  usePublish,
  RemoteUser,
} from 'agora-rtc-react';
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  AgentState,
  TranscriptHelperMode,
  TurnStatus,
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
} from 'agora-agent-client-toolkit';
import { AgentVisualizer } from 'agora-agent-uikit';
import { MicButtonWithVisualizer } from 'agora-agent-uikit/rtc';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { Button } from '@/components/ui/button';
import type { ConversationComponentProps } from '@/types';

type ToolkitMessage = TranscriptHelperItem<
  Partial<UserTranscription | AgentTranscription>
>;

function normalizeTimestampMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

function mapVisualizerState(
  agentState: AgentState | null,
  isAgentConnected: boolean,
  connectionState: string,
) {
  if (
    connectionState === 'DISCONNECTED' ||
    connectionState === 'DISCONNECTING'
  ) {
    return 'disconnected';
  }
  if (
    connectionState === 'CONNECTING' ||
    connectionState === 'RECONNECTING'
  ) {
    return 'joining';
  }
  if (!isAgentConnected) return 'not-joined';
  switch (agentState) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'analyzing';
    case 'speaking':
      return 'talking';
    default:
      return 'ambient';
  }
}

function toMessageItem(item: ToolkitMessage) {
  return {
    turn_id: item.turn_id,
    uid: Number(item.uid) || 0,
    text: typeof item.text === 'string' ? item.text : '',
    status: item.status,
    createdAt:
      typeof item._time === 'number'
        ? normalizeTimestampMs(item._time)
        : undefined,
  };
}

export default function ConversationComponent({
  agoraData,
  rtmClient,
  onTokenWillExpire,
  onEndConversation,
  onTranscriptUpdate,
}: ConversationComponentProps) {
  const client = useRTCClient();
  const remoteUsers = useRemoteUsers();
  const [isEnabled, setIsEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('CONNECTING');
  const agentUID =
    process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [rawTranscript, setRawTranscript] = useState<ToolkitMessage[]>([]);

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) setIsReady(true);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setIsReady(false);
    };
  }, []);

  const { isConnected: joinSuccess } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraData.channel,
      token: agoraData.token,
      uid: parseInt(agoraData.uid, 10),
    },
    isReady,
  );

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady);

  const joinedUID = useMemo(() => {
    if (joinSuccess && client) {
      const uid = client.uid;
      return (uid !== null && uid !== undefined) ? uid : 0;
    }
    return 0;
  }, [joinSuccess, client]);

  useEffect(() => {
    if (!isReady || !joinSuccess) return;

    let cancelled = false;

    (async () => {
      try {
        const ai = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmConfig: { rtmEngine: rtmClient },
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: true,
          enableAgoraMetrics: false,
        });

        if (cancelled) {
          try {
            if (AgoraVoiceAI.getInstance() === ai) {
              ai.unsubscribe();
              ai.destroy();
            }
          } catch {}
          return;
        }

        ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (t) => {
          setRawTranscript([...t] as ToolkitMessage[]);
        });
        ai.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_, event) =>
          setAgentState(event.state),
        );
        ai.subscribeMessage(agoraData.channel);
      } catch (error) {
        if (!cancelled) {
          console.error('[AgoraVoiceAI] init failed:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        const ai = AgoraVoiceAI.getInstance();
        if (ai) {
          ai.unsubscribe();
          ai.destroy();
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, joinSuccess]);

  const transcript = useMemo(() => {
    const localUID = String(client.uid);
    return rawTranscript.map((m) =>
      m.uid === '0' ? { ...m, uid: localUID } : m,
    );
  }, [rawTranscript, client.uid]);

  const messageList = useMemo(
    () =>
      transcript
        .filter((m) => m.status !== TurnStatus.IN_PROGRESS)
        .map(toMessageItem),
    [transcript],
  );

  const currentInProgressMessage = useMemo(() => {
    const m = transcript.find((x) => x.status === TurnStatus.IN_PROGRESS);
    return m ? toMessageItem(m) : null;
  }, [transcript]);

  usePublish([localMicrophoneTrack]);

  const isAgentConnected = useMemo(
    () => remoteUsers.some((user) => user.uid.toString() === agentUID),
    [remoteUsers, agentUID],
  );

  useClientEvent(client, 'connection-state-change', (curState) => {
    setConnectionState(curState);
  });

  const visualizerState = useMemo(
    () => mapVisualizerState(agentState, isAgentConnected, connectionState),
    [agentState, isAgentConnected, connectionState],
  );

  const handleMicToggle = useCallback(async () => {
    const next = !isEnabled;
    const track = localMicrophoneTrack;
    if (!track) {
      setIsEnabled(next);
      return;
    }
    try {
      await track.setEnabled(next);
      setIsEnabled(next);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  }, [isEnabled, localMicrophoneTrack]);

  const handleTokenWillExpireCb = useCallback(async () => {
    if (!onTokenWillExpire || !joinedUID) return;
    try {
      const { rtcToken, rtmToken } = await onTokenWillExpire(
        joinedUID.toString(),
      );
      await client?.renewToken(rtcToken);
      await rtmClient.renewToken(rtmToken);
    } catch (error) {
      console.error('Failed to renew Agora token:', error);
    }
  }, [client, onTokenWillExpire, joinedUID, rtmClient]);

  useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpireCb);

  const handleEnd = useCallback(async () => {
    if (onTranscriptUpdate) {
      const entries = transcript
        .filter((m) => m.text)
        .map((m) => ({
          turn_id: String(m.turn_id ?? Date.now()),
          uid: String(m.uid),
          text: typeof m.text === 'string' ? m.text : '',
          createdAt: typeof m._time === 'number'
            ? normalizeTimestampMs(m._time)
            : undefined,
        }));
      console.log(`[ConversationComponent] Saving transcript: ${entries.length} messages`);
      onTranscriptUpdate(entries);
    }
    const track = localMicrophoneTrack;
    if (track) {
      try {
        await client?.unpublish(track);
      } catch {}
      try {
        track.stop();
        track.close();
      } catch {}
    }
    onEndConversation();
  }, [client, localMicrophoneTrack, onEndConversation, onTranscriptUpdate, transcript, currentInProgressMessage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connectionState === 'CONNECTED'
                ? 'bg-green-500'
                : connectionState === 'CONNECTING'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium">
            {connectionState === 'CONNECTED'
              ? 'Connected'
              : connectionState === 'CONNECTING'
                ? 'Connecting...'
                : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEnd}
            className="text-destructive hover:text-destructive"
          >
            End Call
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex h-48 w-full max-w-md items-center justify-center">
          <AgentVisualizer state={visualizerState} size="lg" />
          {remoteUsers.map((user) => (
            <div key={user.uid} className="hidden">
              <RemoteUser user={user} />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-full border border-border bg-card/80 px-4 py-2 backdrop-blur-md">
          <div className="conversation-mic-host flex items-center justify-center">
            <MicButtonWithVisualizer
              isEnabled={isEnabled}
              setIsEnabled={setIsEnabled}
              track={localMicrophoneTrack}
              onToggle={handleMicToggle}
              className="overflow-visible"
              aria-label={isEnabled ? 'Mute microphone' : 'Unmute microphone'}
              enabledColor="hsl(var(--primary))"
              disabledColor="hsl(var(--destructive))"
            />
          </div>
        </div>

        <div className="flex max-h-64 w-full max-w-md flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card/20">
          <div className="border-b border-border px-4 py-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Transcript
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messageList.length === 0 && !currentInProgressMessage ? (
              <p className="text-center text-sm text-muted-foreground">
                Start speaking to see the live transcript here.
              </p>
            ) : (
              <>
                {messageList.map((msg, i) => {
                  const isAgent = String(msg.uid) === agentUID;
                  return (
                    <div
                      key={`${msg.turn_id ?? msg.uid}-${i}`}
                      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                    >
                      <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">
                        {isAgent ? 'Agent' : 'You'}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm leading-6 ${
                          isAgent
                            ? 'border-border bg-secondary/50'
                            : 'border-border bg-primary/10'
                        }`}
                      >
                        {msg.text || '...'}
                      </div>
                    </div>
                  );
                })}
                {currentInProgressMessage && (
                  <div className="flex flex-col items-start">
                    <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">
                      Agent
                    </span>
                    <div className="max-w-[85%] rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm leading-6">
                      {currentInProgressMessage.text || '...'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
