import { ethers, upgrades, run } from 'hardhat';

/**
 * Deploy PredictionMarket (UUPS Upgradeable) ke Base Mainnet.
 *
 * Prerequisites:
 *   - DEPLOYER_PRIVATE_KEY di .env
 *   - BASESCAN_API_KEY di .env (untuk verify)
 *
 * Run:
 *   pnpm hardhat run packages/contracts/scripts/deploy.ts --network base
 */

// ─── Addresses ────────────────────────────────────────────────────────────────

const USDC_BASE          = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CHAINLINK_BTC_USD  = '0xcD2A119bD1F7DF95d706DE6F2057fDD45A0503E'; // Base Mainnet BTC/USD

// Ganti dengan wallet/Safe address lo sebelum deploy
const DEV_TREASURY       = process.env.DEV_TREASURY       || '';
const JACKPOT_TREASURY   = process.env.JACKPOT_TREASURY   || '';
const FLYWHEEL_TREASURY  = process.env.FLYWHEEL_TREASURY  || '';

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Validasi treasury addresses
  if (!DEV_TREASURY || !JACKPOT_TREASURY || !FLYWHEEL_TREASURY) {
    throw new Error(
      'Set DEV_TREASURY, JACKPOT_TREASURY, FLYWHEEL_TREASURY di .env sebelum deploy',
    );
  }

  console.log('\n─── Deploying PredictionMarket (UUPS) ───');

  const PredictionMarket = await ethers.getContractFactory('PredictionMarket');

  const proxy = await upgrades.deployProxy(
    PredictionMarket,
    [
      USDC_BASE,
      CHAINLINK_BTC_USD,
      DEV_TREASURY,
      JACKPOT_TREASURY,
      FLYWHEEL_TREASURY,
      deployer.address, // owner = deployer, bisa transfer nanti ke multisig
    ],
    {
      initializer: 'initialize',
      kind: 'uups',
    },
  );

  await proxy.waitForDeployment();

  const proxyAddress    = await proxy.getAddress();
  const implAddress     = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress    = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log('\n✅ Deploy berhasil!');
  console.log('   Proxy address:      ', proxyAddress);
  console.log('   Implementation:     ', implAddress);
  console.log('   Admin (ERC1967):    ', adminAddress);
  console.log('   Owner:              ', deployer.address);

  console.log('\n─── Set env vars berikut ───');
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${proxyAddress}`);
  console.log(`CONTRACT_ADDRESS=${proxyAddress}`);

  // ─── Verify on Basescan ────────────────────────────────────────────────────
  console.log('\n─── Verifying on Basescan (30s delay)... ───');
  await new Promise((r) => setTimeout(r, 30_000));

  try {
    await run('verify:verify', {
      address: implAddress,
      constructorArguments: [],
    });
    console.log('✅ Contract verified on Basescan');
    console.log(`   https://basescan.org/address/${proxyAddress}`);
  } catch (err: any) {
    if (err.message?.includes('Already Verified')) {
      console.log('ℹ️  Already verified');
    } else {
      console.warn('⚠️  Verify failed:', err.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});