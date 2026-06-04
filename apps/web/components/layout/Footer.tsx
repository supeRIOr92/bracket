import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <span className="font-bold text-blue-600 text-lg">BRACKET</span>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Daily BTC range prediction on Base. Skill over luck.
            </p>
            <p className="text-gray-300 text-xs mt-4">
              Built on Base · Powered by Chainlink
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Leaderboard</Link></li>
              <li><Link href="/season" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Season</Link></li>
              <li><Link href="/jackpot" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Jackpot</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/risk" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Risk Disclaimer</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Connect</p>
            <ul className="space-y-2">
              <li>
                <a href="https://twitter.com/BracketPredict" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Twitter / X
                </a>
              </li>
              <li>
                <a href="mailto:hello@basebracket.xyz"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  hello@basebracket.xyz
                </a>
              </li>
              <li>
                <a href="https://basescan.org/address/CONTRACT_ADDRESS_HERE" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  Smart Contract ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© 2026 Bracket. All rights reserved.</p>
          <p className="text-xs text-gray-400 text-center">
            Not financial advice. Prediction markets carry risk. Participate responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
