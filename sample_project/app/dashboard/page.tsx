'use client';

import { useRouter } from 'next/navigation';
import { LandlordDashboard } from '@/components/LandlordDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const landlordId = process.env.NEXT_PUBLIC_LANDLORD_ID ?? 'default-landlord';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <LandlordDashboard
      landlordId={landlordId}
      onTestCall={() => router.push('/call')}
      onLogout={handleLogout}
    />
  );
}
