import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PrivyProvider } from '@/components/providers/PrivyProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BRACKET — Predict the Market',
  description: 'BTC daily range prediction market. Outsmart the crowd.',
  openGraph: {
    title: 'BRACKET',
    description: 'BTC daily range prediction market. Outsmart the crowd.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
