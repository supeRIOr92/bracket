export default function PrivacyPage() {
    return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 2026</p>

      <div className="space-y-8 text-gray-600 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Overview</h2>
          <p>Bracket is a non-custodial prediction market protocol. We collect minimal data necessary to operate the service. We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Data We Collect</h2>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Wallet address</strong> — required for participation, stored in our database</li>
            <li><strong>Username</strong> — optional, user-set display name</li>
            <li><strong>Prediction history</strong> — your bets, outcomes, and payout records</li>
            <li><strong>Live chat messages</strong> — comments posted in market chat</li>
            <li><strong>XP and stats</strong> — PR Score, streak, win rate, level</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data We Do NOT Collect</h2>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Name, email address, or any KYC information</li>
            <li>IP address logs beyond standard infrastructure requirements</li>
            <li>Browser fingerprints or tracking cookies</li>
            <li>Off-chain financial or banking data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Privy</strong> — wallet authentication. Subject to <a href="https://privy.io/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privy's privacy policy</a>.</li>
            <li><strong>Supabase</strong> — cloud database hosting. Data is stored on their infrastructure.</li>
            <li><strong>Chainlink</strong> — oracle data for market settlement. No user data is shared.</li>
            <li><strong>Base (Coinbase)</strong> — blockchain infrastructure. All on-chain transactions are public.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. On-Chain Data</h2>
          <p>All bets, claims, and settlements are recorded on the Base blockchain and are permanently public. This data cannot be deleted or modified by Bracket or anyone else.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Data Deletion</h2>
          <p>You may request deletion of your off-chain data (username, chat history, stats) by contacting us at <a href="mailto:hello@basebracket.xyz" className="text-blue-600 hover:underline">hello@basebracket.xyz</a>. On-chain data is permanent and beyond our ability to remove.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact</h2>
          <p>Privacy-related inquiries: <a href="mailto:hello@basebracket.xyz" className="text-blue-600 hover:underline">hello@basebracket.xyz</a></p>
        </section>

      </div>
    </div>
  );
}
