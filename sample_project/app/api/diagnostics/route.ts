import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    app_id: {
      present: !!process.env.NEXT_PUBLIC_AGORA_APP_ID,
      prefix: process.env.NEXT_PUBLIC_AGORA_APP_ID
        ? process.env.NEXT_PUBLIC_AGORA_APP_ID.slice(0, 8) + '...'
        : null,
    },
    app_certificate: {
      present: !!process.env.NEXT_AGORA_APP_CERTIFICATE,
      prefix: process.env.NEXT_AGORA_APP_CERTIFICATE
        ? process.env.NEXT_AGORA_APP_CERTIFICATE.slice(0, 4) + '...'
        : null,
    },
    landlord_id: {
      present: !!process.env.NEXT_PUBLIC_LANDLORD_ID,
      value: process.env.NEXT_PUBLIC_LANDLORD_ID ?? null,
    },
    agent_name: {
      present: !!process.env.NEXT_AGENT_NAME,
      value: process.env.NEXT_AGENT_NAME ?? 'Maria (default)',
    },
    agent_greeting: {
      present: !!process.env.NEXT_AGENT_GREETING,
      value: process.env.NEXT_AGENT_GREETING ?? 'default',
    },
    all_required_present:
      !!process.env.NEXT_PUBLIC_AGORA_APP_ID &&
      !!process.env.NEXT_AGORA_APP_CERTIFICATE,
  };

  return NextResponse.json({
    status: checks.all_required_present ? 'ready' : 'missing_credentials',
    checks,
    timestamp: new Date().toISOString(),
    note: checks.all_required_present
      ? 'Core credentials present. AI engine (STT/LLM/TTS) uses Agora managed defaults — no additional keys needed.'
      : 'Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE in .env.local',
  });
}
