'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { authApi } from '@/lib/api';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const synced = useRef(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (!ready || !authenticated || synced.current) return;

    const syncUser = async () => {
      try {
        const privyToken = await getAccessToken();
        if (!privyToken) return;

        const res = await authApi.login(privyToken);
        localStorage.setItem('bracket_token', res.data.accessToken);
        synced.current = true;
      } catch (err) {
        console.error('Auth sync failed:', err);
      } finally {
        setAuthReady(true);
      }
    };

    syncUser();
  }, [ready, authenticated, getAccessToken]);

  if (!ready || !authenticated || !authReady) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
