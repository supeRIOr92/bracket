import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import type { PredictionMarket } from '../typechain-types';

function makeBounds(): [bigint, bigint, bigint, bigint] {
return [
BigInt('10150000000'),
BigInt('10300000000'),
BigInt('10500000000'),
BigInt('10650000000'),
];
}

describe('PredictionMarket', () => {
let market: PredictionMarket;
let mockUsdc: any;
let mockFeed: any;
let owner: any;
let alice: any;
let bob: any;
let carol: any;
let devTreasury: any;
let jackpotTreasury: any;
let flywheelTreasury: any;

let openAt: number;
let closeAt: number;
let settleAt: number;

const FIVE_USDC = BigInt(5e6);
const HUNDRED_USDC = BigInt(100e6);
const MINT_AMOUNT = BigInt(10_000e6);

before(async () => {
[owner, alice, bob, carol, devTreasury, jackpotTreasury, flywheelTreasury] =
await ethers.getSigners();
});

beforeEach(async () => {
const MockERC20 = await ethers.getContractFactory('MockERC20');
mockUsdc = await MockERC20.deploy('USD Coin', 'USDC', 6);
await mockUsdc.waitForDeployment();

const MockAggregator = await ethers.getContractFactory('MockAggregatorV3');
mockFeed = await MockAggregator.deploy();
await mockFeed.waitForDeployment();

const PredictionMarketFactory = await ethers.getContractFactory('PredictionMarket');
market = await upgrades.deployProxy(
PredictionMarketFactory,
[
await mockUsdc.getAddress(),
await mockFeed.getAddress(),
devTreasury.address,
jackpotTreasury.address,
flywheelTreasury.address,
owner.address,  
],
{ initializer: 'initialize', kind: 'uups' }
) as unknown as PredictionMarket;
await market.waitForDeployment();

await mockUsdc.mint(alice.address, MINT_AMOUNT);
await mockUsdc.mint(bob.address, MINT_AMOUNT);
await mockUsdc.mint(carol.address, MINT_AMOUNT);

const now = await time.latest();
openAt = now + 100;
closeAt = now + 3_600;
settleAt = now + 7_200;

const btcPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(1, btcPrice, now, now + 100, 1);
});

describe('createMarket()', () => {
it('creates market with correct params', async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
const m = await market.getMarket(1);
expect(m.id).to.equal(1n);
expect(m.settled).to.be.false;
expect(m.refunded).to.be.false;
});

it('reverts if not owner', async () => {
await expect(
market.connect(alice).createMarket(openAt, closeAt, settleAt, makeBounds())
).to.be.revertedWith('Ownable: caller is not the owner');
});

it('reverts on invalid timestamps', async () => {
await expect(
market.createMarket(closeAt, openAt, settleAt, makeBounds())
).to.be.revertedWithCustomError(market, 'InvalidTimestamps');
});

it('reverts on non-ascending bounds', async () => {
const badBounds: bigint[] = [
BigInt(103_000) * BigInt(1e8),
BigInt(101_500) * BigInt(1e8),
BigInt(105_000) * BigInt(1e8),
BigInt(106_500) * BigInt(1e8),
];
await expect(
market.createMarket(openAt, closeAt, settleAt, badBounds)
).to.be.revertedWithCustomError(market, 'InvalidBounds');
});
});

describe('placeBet()', () => {
beforeEach(async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
await mockUsdc.connect(alice).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(bob).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(carol).approve(await market.getAddress(), MINT_AMOUNT);
});

it('places bet successfully', async () => {
await expect(market.connect(alice).placeBet(1, 3, FIVE_USDC))
.to.emit(market, 'BetPlaced')
.withArgs(1n, alice.address, 3, FIVE_USDC);
const [poolId, amount, claimed] = await market.getUserBet(1, alice.address);
expect(poolId).to.equal(3);
expect(amount).to.equal(FIVE_USDC);
expect(claimed).to.be.false;
});

it('reverts on bet below minimum', async () => {
await expect(
market.connect(alice).placeBet(1, 3, BigInt(4e6))
).to.be.revertedWithCustomError(market, 'BetTooSmall');
});

it('reverts on double bet', async () => {
await market.connect(alice).placeBet(1, 3, FIVE_USDC);
await expect(
market.connect(alice).placeBet(1, 2, FIVE_USDC)
).to.be.revertedWithCustomError(market, 'AlreadyBet');
});

it('reverts on invalid pool id', async () => {
await expect(
market.connect(alice).placeBet(1, 6, FIVE_USDC)
).to.be.revertedWithCustomError(market, 'InvalidPool');
});
it('reverts after betting closed', async () => {
await time.increaseTo(closeAt + 1);
await expect(
market.connect(alice).placeBet(1, 3, FIVE_USDC)
).to.be.revertedWithCustomError(market, 'MarketNotOpen');
});

it('enforces 5% max bet when total >= 10k USDC', async () => {
await mockUsdc.mint(alice.address, BigInt(20_000e6));
await market.connect(alice).placeBet(1, 3, BigInt(9_900e6));
await mockUsdc.mint(bob.address, BigInt(5_000e6));
await market.connect(bob).placeBet(1, 2, BigInt(500e6));
await mockUsdc.mint(carol.address, BigInt(5_000e6));
await expect(
market.connect(carol).placeBet(1, 1, BigInt(600e6))
).to.be.revertedWithCustomError(market, 'BetTooLarge');
});
});

describe('settleMarket()', () => {
beforeEach(async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
await mockUsdc.connect(alice).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(bob).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(carol).approve(await market.getAddress(), MINT_AMOUNT);
});

it('settles normally with 2+ pools filled and valid winner', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
await market.connect(bob).placeBet(1, 4, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await expect(market.settleMarket(1))
.to.emit(market, 'MarketSettled')
.withArgs(1n, 3, settlementPrice, HUNDRED_USDC * 2n, HUNDRED_USDC, false);
const m = await market.getMarket(1);
expect(m.settled).to.be.true;
expect(m.refunded).to.be.false;
expect(m.winningPool).to.equal(3);
});

it('triggers REFUND if only 1 pool filled', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
const m = await market.getMarket(1);
expect(m.refunded).to.be.true;
});

it('triggers REFUND if only 0 pools filled (no bets)', async () => {
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
const m = await market.getMarket(1);
expect(m.refunded).to.be.true;
});

it('reverts if settlement too early', async () => {
await expect(market.settleMarket(1))
.to.be.revertedWithCustomError(market, 'SettlementTooEarly');
});

it('reverts on stale oracle', async () => {
await market.connect(alice).placeBet(1, 3, FIVE_USDC);
await market.connect(bob).placeBet(1, 4, FIVE_USDC);
const staleTime = openAt;
await mockFeed.setLatestRoundData(2, BigInt(104_000e8), staleTime, staleTime, 2);
await time.increaseTo(settleAt + 1);
await expect(market.settleMarket(1))
.to.be.revertedWithCustomError(market, 'OraclePriceTooStale');
});

it('distributes fees correctly on normal settlement', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
await market.connect(bob).placeBet(1, 4, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
const totalStake = HUNDRED_USDC * 2n;
const devFee = (totalStake * 250n) / 10_000n;
const jackpotFee = (totalStake * 150n) / 10_000n;
const flywheelFee = (totalStake * 100n) / 10_000n;
await expect(market.settleMarket(1))
.to.emit(market, 'FeesDistributed')
.withArgs(1n, devFee, jackpotFee, flywheelFee);
expect(await mockUsdc.balanceOf(devTreasury.address)).to.equal(devFee);
expect(await mockUsdc.balanceOf(jackpotTreasury.address)).to.equal(jackpotFee);
expect(await mockUsdc.balanceOf(flywheelTreasury.address)).to.equal(flywheelFee);
});

it('does NOT distribute fees on refund', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
expect(await mockUsdc.balanceOf(devTreasury.address)).to.equal(0n);
expect(await mockUsdc.balanceOf(jackpotTreasury.address)).to.equal(0n);
expect(await mockUsdc.balanceOf(flywheelTreasury.address)).to.equal(0n);
});
});

describe('claim()', () => {
beforeEach(async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
await mockUsdc.connect(alice).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(bob).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(carol).approve(await market.getAddress(), MINT_AMOUNT);
});

it('winner claims correct payout', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
await market.connect(bob).placeBet(1, 4, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
const totalStake = HUNDRED_USDC * 2n;
const fee = (totalStake * 500n) / 10_000n;
const expectedPayout = totalStake - fee;
const before = await mockUsdc.balanceOf(alice.address);
await expect(market.connect(alice).claim(1))
.to.emit(market, 'RewardClaimed')
.withArgs(1n, alice.address, expectedPayout, false);
const after = await mockUsdc.balanceOf(alice.address);
expect(after - before).to.equal(expectedPayout);
});

it('loser cannot claim', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
await market.connect(bob).placeBet(1, 4, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
await expect(market.connect(bob).claim(1))
.to.be.revertedWithCustomError(market, 'NotWinner');
});

it('cannot claim twice', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
await market.connect(bob).placeBet(1, 4, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
await market.connect(alice).claim(1);
await expect(market.connect(alice).claim(1))
.to.be.revertedWithCustomError(market, 'AlreadyClaimed');
});

it('refund: all users get back their stake', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
const before = await mockUsdc.balanceOf(alice.address);
await expect(market.connect(alice).claim(1))
.to.emit(market, 'RewardClaimed')
.withArgs(1n, alice.address, HUNDRED_USDC, true);
const after = await mockUsdc.balanceOf(alice.address);
expect(after - before).to.equal(HUNDRED_USDC);
});

it('non-participant cannot claim refund', async () => {
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
await expect(market.connect(carol).claim(1))
.to.be.revertedWithCustomError(market, 'NothingToClaim');
});
});

describe('Oracle boundary edge cases', () => {
beforeEach(async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
const marketAddr = await market.getAddress();
await mockUsdc.connect(alice).approve(marketAddr, MINT_AMOUNT);
await mockUsdc.connect(bob).approve(marketAddr, MINT_AMOUNT);
await mockUsdc.connect(carol).approve(marketAddr, MINT_AMOUNT);
await market.connect(alice).placeBet(1, 1, FIVE_USDC);
await market.connect(bob).placeBet(1, 3, FIVE_USDC);
await market.connect(carol).placeBet(1, 5, FIVE_USDC);
});

const cases = [
{ price: BigInt(10_299_900_000), expectedPool: 2, desc: '102.999 → Pool B' },
{ price: BigInt(10_300_000_000), expectedPool: 3, desc: '103.000 → Pool C' },
{ price: BigInt(10_499_900_000), expectedPool: 3, desc: '104.999 → Pool C' },
{ price: BigInt(10_500_000_000), expectedPool: 4, desc: '105.000 → Pool D' },
{ price: BigInt(10_649_900_000), expectedPool: 4, desc: '106.499 → Pool D' },
{ price: BigInt(10_650_000_000), expectedPool: 5, desc: '106.500 → Pool E' },
];

for (const { price, expectedPool, desc } of cases) {
it(`boundary: ${desc}`, async () => {
await mockFeed.setLatestRoundData(2, price, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await market.settleMarket(1);
const m = await market.getMarket(1);
expect(m.winningPool).to.equal(expectedPool);
});
}
});

describe('getEstimatedPayout()', () => {
it('calculates correct estimated payout', async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
await mockUsdc.connect(alice).approve(await market.getAddress(), MINT_AMOUNT);
await market.connect(alice).placeBet(1, 3, HUNDRED_USDC);
const estimated = await market.getEstimatedPayout(1, 4, HUNDRED_USDC);
expect(estimated).to.equal(BigInt(190e6));
});
});

describe('pause()', () => {
it('blocks placeBet when paused', async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
await mockUsdc.connect(alice).approve(await market.getAddress(), MINT_AMOUNT);
await market.pause();
await expect(market.connect(alice).placeBet(1, 3, FIVE_USDC))
.to.be.revertedWith('Pausable: paused');
});

it('settleMarket still works when paused', async () => {
await market.createMarket(openAt, closeAt, settleAt, makeBounds());
await time.increaseTo(openAt + 1);
await mockUsdc.connect(alice).approve(await market.getAddress(), MINT_AMOUNT);
await mockUsdc.connect(bob).approve(await market.getAddress(), MINT_AMOUNT);
await market.connect(alice).placeBet(1, 3, FIVE_USDC);
await market.connect(bob).placeBet(1, 4, FIVE_USDC);
await market.pause();
const settlementPrice = BigInt('10400000000');
await mockFeed.setLatestRoundData(2, settlementPrice, closeAt + 1, closeAt + 1, 2);
await time.increaseTo(settleAt + 1);
await expect(market.settleMarket(1)).to.not.be.reverted;
});
});
});
