'use client';

import { PrivyProvider as Privy } from '@privy-io/react-auth';
import { base } from 'viem/chains';

export function PrivyProvider({ children }: { children: React.ReactNode }) {
return (
<Privy
appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
config={{
loginMethods: ['email', 'google', 'wallet'],
appearance: {
theme: 'light',
accentColor: '#2563EB',
logo: '/logo.svg',
},
defaultChain: base,
supportedChains: [base],
embeddedWallets: {
ethereum: {
createOnLogin: 'users-without-wallets',
},
},
}}
>
{children}
</Privy>
);
}
