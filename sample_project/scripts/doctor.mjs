#!/usr/bin/env node

const REQUIRED_VARS = [
  'NEXT_PUBLIC_AGORA_APP_ID',
  'NEXT_AGORA_APP_CERTIFICATE',
  'NEXT_LLM_API_KEY',
];

const ALL_VARS = [
  ...REQUIRED_VARS,
  'NEXT_PUBLIC_AGENT_UID',
  'NEXT_AZURE_TTS_KEY',
  'NEXT_AZURE_TTS_REGION',
  'NEXT_AZURE_TTS_VOICE_NAME',
  'NEXT_DEEPGRAM_API_KEY',
  'NEXT_AGENT_GREETING',
  'NEXT_LANDLORD_ID',
];

function checkEnv() {
  const missing = [];
  const allSet = [];

  for (const v of REQUIRED_VARS) {
    if (!process.env[v]) {
      missing.push(v);
    } else {
      allSet.push(v);
    }
  }

  console.log('── Environment ──────────────────────');
  console.log(`Required vars set: ${allSet.length}/${REQUIRED_VARS.length}`);
  for (const v of missing) {
    console.log(`  MISSING: ${v}`);
  }

  const optionalMissing = [];
  for (const v of ALL_VARS) {
    if (!REQUIRED_VARS.includes(v) && !process.env[v]) {
      optionalMissing.push(v);
    }
  }
  if (optionalMissing.length > 0) {
    console.log(`Optional vars not set: ${optionalMissing.join(', ')}`);
  }

  return missing.length === 0;
}

function checkFiles() {
  console.log('');
  console.log('── Files ────────────────────────────');

  const checks = [
    ['app/api/generate-agora-token/route.ts', 'Token generation route'],
    ['app/api/invite-agent/route.ts', 'Agent invite route'],
    ['app/api/stop-conversation/route.ts', 'Stop conversation route'],
    ['app/api/update-agent/route.ts', 'Update agent route'],
    ['app/api/webhooks/route.ts', 'Webhooks route'],
    ['app/api/landlords/[landlord_id]/route.ts', 'Landlord API route'],
    ['app/api/bookings/route.ts', 'Bookings API route'],
    ['components/LandlordDashboard.tsx', 'Landlord dashboard'],
    ['components/UnitKnowledgeBaseEditor.tsx', 'Knowledge base editor'],
    ['components/ViewingScheduleManager.tsx', 'Schedule manager'],
    ['components/LeadPipelineView.tsx', 'Lead pipeline'],
    ['components/TranscriptViewer.tsx', 'Transcript viewer'],
    ['components/CallNotificationPanel.tsx', 'Notification panel'],
    ['components/CallInterface.tsx', 'Call interface'],
    ['components/ConversationComponent.tsx', 'Conversation component'],
    ['lib/prompts.ts', 'System prompt builders'],
    ['lib/webhooks.ts', 'Webhook handlers'],
    ['lib/utils.ts', 'Utilities'],
    ['.env.local.example', 'Environment template'],
  ];

  const fs = await import('fs');
  const path = await import('path');
  const root = path.resolve(new URL('.', import.meta.url).pathname, '..');

  let allFound = true;
  for (const [filePath, label] of checks) {
    const fullPath = path.join(root, filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✓ ${label}`);
    } else {
      console.log(`  ✗ ${label} (not found: ${filePath})`);
      allFound = false;
    }
  }

  return allFound;
}

const envOk = checkEnv();
const filesOk = await checkFiles();

console.log('');
if (envOk && filesOk) {
  console.log('✓ Doctor check passed.');
  process.exit(0);
} else {
  console.log('✗ Doctor check failed. Review the issues above.');
  process.exit(1);
}
