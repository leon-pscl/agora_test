'use client';

import { useState } from 'react';
import { LandlordDashboard } from '@/components/LandlordDashboard';
import { CallInterface } from '@/components/CallInterface';

type ViewMode = 'dashboard' | 'call';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  if (viewMode === 'call') {
    return (
      <CallInterface
        onReturnToDashboard={() => setViewMode('dashboard')}
      />
    );
  }

  return (
    <LandlordDashboard
      landlordId={process.env.NEXT_PUBLIC_LANDLORD_ID ?? 'default-landlord'}
    />
  );
}
