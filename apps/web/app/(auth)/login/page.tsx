'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
const { login, authenticated, ready } = usePrivy();
const router = useRouter();

useEffect(() => {
if (ready && authenticated) {
router.push('/dashboard');
}
}, [ready, authenticated, router]);

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
className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
>
Sign In
</button>
<p className="text-xs text-gray-400 mt-4">
No wallet? No problem. We create one for you.
</p>
</div>
</div>
);
}
