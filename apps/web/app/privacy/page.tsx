import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function RiskPage() {
  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Disclaimer</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-gray-600 leading-relaxed">

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-amber-800 font-semibold text-sm">
              ⚠️ Participation in prediction markets carries significant financial risk. Read this disclaimer carefully before participating.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Total Loss of Funds</h2>
            <p>You may lose your entire staked amount. If your predicted pool does not match the settlement price, your stake is redistributed to winners. There is no partial refund for incorrect predictions under normal market conditions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Smart Contract Risk</h2>
            <p>Bracket operates via smart contracts on the Base blockchain. While we take reasonable steps to ensure contract security, smart contracts may contain unforeseen vulnerabilities. In the event of an exploit, funds may be unrecoverable. Only participate with funds you can afford to lose.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Oracle Risk</h2>
            <p>Market settlement relies on the Chainlink BTC/USD price feed. In the event of oracle failure, network congestion, or data anomalies, markets may be marked as invalid and stakes refunded. Bracket has no control over Chainlink's data or infrastructure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Blockchain & Network Risk</h2>
            <p>Transactions on Base are subject to network congestion, gas price fluctuations, and potential chain reorganizations. Failed or delayed transactions are the user's responsibility to monitor and retry.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Regulatory Risk</h2>
            <p>The regulatory status of prediction markets varies by jurisdiction and is subject to change. It is your responsibility to ensure your participation complies with local laws. Bracket does not provide legal advice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Not Financial Advice</h2>
            <p>Nothing on Bracket constitutes financial, investment, or trading advice. Bracket is a game of prediction and skill. Past performance — including PR Score rankings — does not guarantee future results.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Responsible Participation</h2>
            <p>Set a budget and stick to it. Never stake more than you can afford to lose. If you feel your participation is becoming compulsive, seek help at <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">begambleaware.org</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>For questions or concerns, contact us at <a href="mailto:basebracket.gg@gmail.com" className="text-blue-600 hover:underline">basebracket.gg@gmail.com</a>.</p>
          </section>

        </div>
      </div>
      <Footer />
    </>
  );
}
