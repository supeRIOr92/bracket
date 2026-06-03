'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { TrendingUp, Trophy, User, LogOut } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import BtcTicker from '@/components/ui/BtcTicker';

export function Navbar() {
  const { authenticated, user, logout } = usePrivy();
  const pathname = usePathname();
  const walletAddress = user?.wallet?.address ?? '';

    const navLinks = [
    { href: '/dashboard', label: 'Market', icon: TrendingUp },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/jackpot', label: 'Jackpot', icon: Trophy },
    { href: '/season', label: 'Season', icon: Trophy },
    {
      href: `/profile/${walletAddress}`,
      label: walletAddress ? formatAddress(walletAddress) : 'Profile',
      icon: User,
    },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href={authenticated ? '/dashboard' : '/'}
            className="text-xl font-bold text-blue-600"
          >
            BRACKET
          </Link>
          <BtcTicker />
        </div>

        {authenticated && (
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}