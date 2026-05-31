'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const { login, authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;

    const syncUser = async () => {
      setSyncing(true);
      try {
        // Cek apakah sudah punya JWT dari sesi sebelumnya
        const existing = localStorage.getItem('bracket_token');
        if (existing) {
          router.push('/dashboard');
          return;
        }

        // Ambil Privy access token lalu kirim ke backend
        const privyToken = await getAccessToken();
        if (!privyToken) throw new Error('No Privy token');

        const res = await authApi.login(privyToken);
        localStorage.setItem('bracket_token', res.data.accessToken);
        router.push('/dashboard');
      } catch (err) {
        console.error('Auth sync failed:', err);
        // Tetap redirect meski gagal — user bisa retry
        router.push('/dashboard');
      } finally {
        setSyncing(false);
      }
    };

    syncUser();
  }, [ready, authenticated, router, getAccessToken]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <span className="text-2xl font-bold text-blue-600">BRACKET</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-2">
          Welcome back
        </h1>
        <p className="text-gray-500 mb-8">
          Sign in to start predicting
        </p>
        <button
          onClick={login}
          disabled={syncing}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {syncing ? 'Connecting...' : 'Sign In'}
        </button>
        <p className="text-xs text-gray-400 mt-4">
          No wallet? No problem. We create one for you.
        </p>
      </div>
    </div>
  );
}
