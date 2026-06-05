'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { TrendingUp, Trophy, User, LogOut, Settings, Menu, X } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import BtcTicker from '@/components/ui/BtcTicker';
import NotificationCenter from '@/components/ui/NotificationCenter';

export function Navbar() {
const { authenticated, user, logout } = usePrivy();
const pathname = usePathname();
const walletAddress = user?.wallet?.address ?? '';
const [mobileOpen, setMobileOpen] = useState(false);

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
{
href: '/settings',
label: 'Settings',
icon: Settings,
},
];
return (
<nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

{/* Left: Logo + Ticker */}
<div className="flex items-center gap-4">
<Link
href={authenticated ? '/dashboard' : '/'}
className="text-xl font-bold text-blue-600"
>
BRACKET
</Link>
<div className="hidden sm:block">
<BtcTicker />
</div>
</div>

{/* Desktop nav */}
{authenticated && (
<div className="hidden md:flex items-center gap-5">
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
<NotificationCenter />
<button
onClick={logout}
className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
>
<LogOut className="w-4 h-4" />
</button>
</div>
)}

{/* Mobile: notification + hamburger */}
{authenticated && (
<div className="flex items-center gap-3 md:hidden">
<NotificationCenter />
<button
onClick={() => setMobileOpen(!mobileOpen)}
className="p-1.5 text-gray-500 hover:text-gray-900"
>
{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
</button>
</div>
)}
</div>

{/* Mobile menu */}
{authenticated && mobileOpen && (
<div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1">
<div className="pb-3 mb-3 border-b border-gray-50">
<BtcTicker />
</div>
{navLinks.map((link) => (
<Link
key={link.href}
href={link.href}
onClick={() => setMobileOpen(false)}
className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
pathname === link.href
? 'bg-blue-50 text-blue-600'
: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
}`}
>
<link.icon className="w-4 h-4" />
{link.label}
</Link>
))}
<button
onClick={() => { logout(); setMobileOpen(false); }}
className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 w-full transition-colors mt-2"
>
<LogOut className="w-4 h-4" />
Logout
</button>
</div>
)}
</nav>
);
}
