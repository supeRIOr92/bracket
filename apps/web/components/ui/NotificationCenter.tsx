'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Trophy, TrendingUp, Zap, Award, X } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
prediction_won: { icon: Trophy, color: 'text-green-500' },
prediction_lost: { icon: X, color: 'text-red-400' },
streak_milestone: { icon: Zap, color: 'text-yellow-500' },
jackpot_eligible: { icon: Award, color: 'text-blue-500' },
default: { icon: TrendingUp, color: 'text-gray-400' },
};

interface Notification {
id: string;
type: string;
message: string;
read: boolean;
created_at: string;
}

export default function NotificationCenter() {
const [open, setOpen] = useState(false);
const ref = useRef<HTMLDivElement>(null);

const { data: notifications = [] } = useQuery<Notification[]>({
queryKey: ['notifications'],
queryFn: async () => {
try {
const res = await notificationsApi.getAll();
return res.data || [];
} catch {
return [];
}
},
refetchInterval: 30_000,
});

const unreadCount = notifications.filter((n) => !n.read).length;

useEffect(() => {
const handler = (e: MouseEvent) => {
if (ref.current && !ref.current.contains(e.target as Node)) {
setOpen(false);
}
};
document.addEventListener('mousedown', handler);
return () => document.removeEventListener('mousedown', handler);
}, []);

return (
<div className="relative" ref={ref}>
<button
onClick={() => setOpen((v) => !v)}
className="relative p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
>
<Bell className="w-5 h-5" />
{unreadCount > 0 && (
<span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
{unreadCount > 9 ? '9+' : unreadCount}
</span>
)}
</button>

{open && (
<div className="absolute right-0 top-9 w-80 bg-white rounded-2xl border border-gray-100 shadow-lg z-50 overflow-hidden">
<div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
<span className="text-sm font-semibold text-gray-900">Notifications</span>
{unreadCount > 0 && (
<span className="text-xs text-blue-600 font-medium">{unreadCount} new</span>
)}
</div>

<div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
{notifications.length === 0 ? (
<div className="px-4 py-8 text-center text-sm text-gray-400">
No notifications yet
</div>
) : (
notifications.slice(0, 10).map((n) => {
const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
const Icon = config.icon;
return (
<div
key={n.id}
className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
!n.read ? 'bg-blue-50/40' : ''
}`}
>
<Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
<div className="flex-1 min-w-0">
<p className="text-sm text-gray-700 leading-snug">{n.message}</p>
<p className="text-xs text-gray-400 mt-0.5">
{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
</p>
</div>
{!n.read && (
<span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
)}
</div>
);
})
)}
</div>
</div>
)}
</div>
);
}
