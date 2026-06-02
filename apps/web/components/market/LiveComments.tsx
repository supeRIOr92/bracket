'use client';

import { useRef, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useMarketComments, type Comment } from '@/hooks/useMarketComments';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Avatar({ user }: { user: Comment['users'] }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const seed = user.wallet_address.slice(2, 4);
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-bold">{seed.toUpperCase()}</span>
    </div>
  );
}

interface Props {
  marketId: string;
  token: string | null; // JWT dari usePrivy
  }

export default function LiveComments({ marketId, token }: Props) {
  const { authenticated } = usePrivy();
  const { comments, loading } = useMarketComments(marketId);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSend = async () => {
    if (!input.trim() || !token || sending) return;
    setSending(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/${marketId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: input.trim() }),
        },
      );
      setInput('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[480px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">Live Chat</span>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            No comment yet. Be the first! 👋
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar user={c.users} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-gray-900 truncate">
                  {c.users.username || shortAddr(c.users.wallet_address)}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-700 break-words leading-snug mt-0.5">
                {c.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100">
        {authenticated ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="type your comment..."
              maxLength={280}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">
            connect your wallet to comment
          </p>
        )}
      </div>
    </div>
  );
}
