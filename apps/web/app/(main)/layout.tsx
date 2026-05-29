'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function MainLayout({
children,
}: {
children: React.ReactNode;
}) {
const { authenticated, ready } = usePrivy();
const router = useRouter();

useEffect(() => {
if (ready && !authenticated) {
router.push('/');
}
}, [ready, authenticated, router]);

if (!ready || !authenticated) return null;

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
