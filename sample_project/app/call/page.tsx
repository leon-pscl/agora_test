'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CallInterface } from '@/components/CallInterface';

export default function CallPage() {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        setRole(data.role);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <CallInterface
      showDashboardLink={role === 'admin'}
      onReturnToDashboard={() => router.push('/dashboard')}
      onLogout={handleLogout}
    />
  );
}
