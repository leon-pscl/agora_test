'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
} from '@/types';
import { Button } from '@/components/ui/button';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

const ConversationComponent = dynamic(
  () => import('./ConversationComponent'),
  { ssr: false },
);

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        const clientRef = useRef<ReturnType<
          typeof AgoraRTC.createClient
        > | null>(null);
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

type CallInterfaceProps = {
  onReturnToDashboard: () => void;
};

export function CallInterface({ onReturnToDashboard }: CallInterfaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);

  const handleStartCall = async () => {
    setIsLoading(true);
    setError(null);
    setAgentJoinError(false);

    try {
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      const [agentData, rtm] = await Promise.all([
        fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
            landlord_id: process.env.NEXT_PUBLIC_LANDLORD_ID,
          } as ClientStartRequest & { landlord_id?: string }),
        })
          .then(async (res) => {
            if (!res.ok) {
              setAgentJoinError(true);
              return null;
            }
            return res.json() as Promise<AgentResponse>;
          })
          .catch((err) => {
            console.error('Failed to start conversation with agent:', err);
            setAgentJoinError(true);
            return null;
          }),

        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          return rtm;
        })(),
      ]);

      setRtmClient(rtm);
      setAgoraData({ ...responseData, agentId: agentData?.agent_id });
      setShowConversation(true);
    } catch (err) {
      setError('Failed to start call. Please try again.');
      console.error('Error starting call:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel;
        if (!channel) throw new Error('Missing channel for token renewal');

        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  const handleEndConversation = async () => {
    if (agoraData?.agentId) {
      try {
        await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    rtmClient
      ?.logout()
      .catch((err) => console.error('RTM logout error:', err));
    setRtmClient(null);
    setShowConversation(false);
  };

  return (
    <div className="relative flex h-dvh min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          showConversation
            ? 'items-stretch justify-start'
            : 'items-center justify-center'
        }`}
      >
        <div
          className={`z-10 flex min-h-0 flex-1 flex-col ${
            showConversation
              ? 'h-full w-full max-w-none items-stretch gap-0 px-0 text-left'
              : 'w-full max-w-md items-center justify-center px-4 text-center'
          }`}
        >
          {!showConversation ? (
            <div className="animate-fade-up flex flex-col items-center gap-8">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">
                  Rental Voice Agent
                </h1>
                <p className="text-muted-foreground">
                  Speak with our AI assistant about available rental units.
                  Available 24/7.
                </p>
              </div>

              <Button
                onClick={handleStartCall}
                disabled={isLoading}
                className="h-12 w-full rounded-full text-base font-medium"
              >
                {isLoading ? 'Connecting...' : 'Start Call'}
              </Button>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onReturnToDashboard}
                className="text-muted-foreground"
              >
                Back to Dashboard
              </Button>
            </div>
          ) : agoraData && rtmClient ? (
            <>
              {agentJoinError && (
                <div className="bg-destructive/10 p-3 text-sm text-destructive">
                  Failed to connect with AI agent.
                </div>
              )}
              <AgoraProvider>
                <ConversationComponent
                  agoraData={agoraData}
                  rtmClient={rtmClient}
                  onTokenWillExpire={handleTokenWillExpire}
                  onEndConversation={handleEndConversation}
                />
              </AgoraProvider>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
