import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
return (
<>
<Navbar />
<div className="max-w-3xl mx-auto px-6 py-16">
<h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
<p className="text-sm text-gray-400 mb-10">Last updated: June 2026</p>

<div className="space-y-8 text-gray-600 leading-relaxed">

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance</h2>
<p>By accessing or using Bracket, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">2. Eligibility</h2>
<p>You must be at least 18 years old to use Bracket. You represent that your use of the platform complies with all applicable laws in your jurisdiction. Bracket is not available to residents of the United States or any jurisdiction where prediction markets are prohibited by law.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">3. How It Works</h2>
<p>Bracket is a decentralized, parimutuel prediction market deployed on the Base blockchain. Each day, a new market opens with 5 BTC price range pools. Users stake USDC into their chosen pool. At settlement (00:00 UTC), the Chainlink BTC/USD oracle determines the winning pool. Winners split the total pool proportionally, minus a 5% protocol fee.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">4. Protocol Fees</h2>
<p>A 5% fee is deducted from the total pool before payout. Fees are allocated as follows: development treasury, jackpot pool, and ecosystem flywheel. Fee allocation is enforced by the smart contract and cannot be altered unilaterally.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">5. Settlement & Finality</h2>
<p>All settlements are executed on-chain via the Chainlink oracle. Once a market is settled, outcomes are final and immutable. Bracket has no ability to reverse or modify on-chain settlements.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">6. No Warranties</h2>
<p>Bracket is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access, oracle accuracy, or the absence of bugs in the smart contract. Use at your own risk.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
<p>To the maximum extent permitted by law, Bracket and its contributors shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to loss of funds due to smart contract vulnerabilities, oracle failures, or user error.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">8. Modifications</h2>
<p>We reserve the right to update these terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.</p>
</section>

<section>
<h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact</h2>
<p>For questions regarding these terms, contact us at <a href="mailto:basebracket.gg@gmail.com" className="text-blue-600 hover:underline">basebracket.gg@gmail.com</a>.</p>
</section>

</div>
</div>
<Footer />
</>
);
}
