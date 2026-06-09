// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
* @title PredictionMarket — BRACKET
* @notice BTC Daily Range Prediction Market (PvP Parimutuel)
* @dev Single upgradeable contract. Hanya 4 operasi yang menyentuh uang:
* placeBet, settleMarket, claim, pause/unpause.
* Semua game logic (XP, PR Score) dikelola off-chain.
*
* Market Validity Rule:
* Settle normal jika:
* (1) Minimal 2 pool berbeda terisi
* (2) Winning pool bukan satu-satunya pool yang terisi
* Jika tidak memenuhi → full refund, zero fee.
*/
contract PredictionMarket is
Initializable,
UUPSUpgradeable,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable
{
// ─────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────

uint256 public constant PROTOCOL_FEE_BPS = 500; // 5%
uint256 public constant DEV_FEE_BPS = 250; // 2.5%
uint256 public constant JACKPOT_FEE_BPS = 150; // 1.5%
uint256 public constant FLYWHEEL_FEE_BPS = 100; // 1.0%

uint256 public constant MIN_BET = 5e6; // 5 USDC (6 decimals)
uint256 public constant MAX_BET_THRESHOLD = 10_000e6; // 10,000 USDC
uint256 public constant MAX_BET_BPS = 500; // 5% of total pool

/// @dev Chainlink BTC/USD di Base heartbeat = 20 menit.
/// Kita toleransi 2 jam dari closeAt untuk jaga-jaga kalau
/// harga BTC flat dan oracle tidak update selama window closeAt.
uint256 public constant ORACLE_STALENESS_BUFFER = 2 hours;

uint8 public constant POOL_COUNT = 5;

// ─────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────

IERC20 public usdc;
AggregatorV3Interface public priceFeed; // Chainlink BTC/USD

address public devTreasury;
address public jackpotTreasury;
address public flywheelTreasury;

uint256 public marketCount;

struct Market {
uint256 id;
uint256 openAt; // betting opens
uint256 closeAt; // betting closes (23:00 UTC)
uint256 settleAt; // earliest settlement (00:00 UTC next day)

// Half-open intervals: [lower, upper)
// Pool 1: price < bounds[0]
// Pool 2: bounds[0] <= price < bounds[1]
// Pool 3: bounds[1] <= price < bounds[2]
// Pool 4: bounds[2] <= price < bounds[3]
// Pool 5: price >= bounds[3]
// All in Chainlink 8-decimal units (1e8 = $1)
int256[4] bounds;

uint256[5] poolStakes; // total USDC staked per pool
uint256 totalStake; // total USDC across all pools

uint8 winningPool; // 1..5, 0 if not settled
int256 settlementPrice; // Chainlink price at settlement

bool settled;
bool refunded; // true if market invalid → refund mode
bool feesCollected;
}

struct Bet {
uint256 amount;
uint8 poolId; // 1..5
bool claimed; // claimed payout OR refund
}

mapping(uint256 => Market) public markets;
// marketId → userAddress → Bet
mapping(uint256 => mapping(address => Bet)) public bets;

// ─────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────

error MarketNotOpen();
error MarketNotSettled();
error MarketAlreadySettled();
error SettlementTooEarly();
error AlreadyBet();
error BetTooSmall();
error BetTooLarge();
error InvalidPool();
error NotWinner();
error AlreadyClaimed();
error NothingToClaim();
error InvalidOraclePrice();
error OraclePriceTooStale();
error InvalidBounds();
error InvalidTimestamps();
error MarketDoesNotExist();
error ZeroAddress();

// ─────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────

event MarketCreated(
uint256 indexed marketId,
uint256 openAt,
uint256 closeAt,
uint256 settleAt,
int256[4] bounds
);

event BetPlaced(
uint256 indexed marketId,
address indexed user,
uint8 poolId,
uint256 amount
);

event MarketSettled(
uint256 indexed marketId,
uint8 winningPool,
int256 settlementPrice,
uint256 totalStake,
uint256 winningPoolStake,
bool isRefund
);

event FeesDistributed(
uint256 indexed marketId,
uint256 devAmount,
uint256 jackpotAmount,
uint256 flywheelAmount
);

event RewardClaimed(
uint256 indexed marketId,
address indexed user,
uint256 amount,
bool isRefund
);

event TreasuryUpdated(
address devTreasury,
address jackpotTreasury,
address flywheelTreasury
);

// ─────────────────────────────────────────────────────────────────────────
// INITIALIZER
// ─────────────────────────────────────────────────────────────────────────

/// @custom:oz-upgrades-unsafe-allow constructor
constructor() {
_disableInitializers();
}

/**
* @notice Inisialisasi contract (hanya dipanggil sekali saat deploy proxy).
* @param _usdc USDC token address (Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
* @param _priceFeed Chainlink BTC/USD Feed (Base Mainnet: 0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F)
* @param _devTreasury Alamat penerima developer fee
* @param _jackpotTreasury Alamat penerima jackpot fee
* @param _flywheelTreasury Alamat penerima flywheel fee
* @param _owner Admin address (bisa createMarket dan upgrade)
*/
function initialize(
address _usdc,
address _priceFeed,
address _devTreasury,
address _jackpotTreasury,
address _flywheelTreasury,
address _owner
) external initializer {
if (_usdc == address(0) || _priceFeed == address(0)) revert ZeroAddress();
if (_devTreasury == address(0)) revert ZeroAddress();
if (_jackpotTreasury == address(0)) revert ZeroAddress();
if (_flywheelTreasury == address(0)) revert ZeroAddress();
if (_owner == address(0)) revert ZeroAddress();

__Ownable_init();
_transferOwnership(_owner);
__UUPSUpgradeable_init();
__Pausable_init();
__ReentrancyGuard_init();

usdc = IERC20(_usdc);
priceFeed = AggregatorV3Interface(_priceFeed);
devTreasury = _devTreasury;
jackpotTreasury = _jackpotTreasury;
flywheelTreasury = _flywheelTreasury;
}

// ─────────────────────────────────────────────────────────────────────────
// ADMIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
* @notice Membuat market baru.
* @dev Hanya owner. Backend cron job panggil ini setiap 00:00 UTC.
* @param openAt Timestamp saat betting dibuka (00:00 UTC)
* @param closeAt Timestamp saat betting ditutup (23:00 UTC)
* @param settleAt Timestamp earliest settlement (00:00 UTC hari berikutnya)
* @param bounds 4 batas pool dalam Chainlink 8-decimal units
* bounds[0] < bounds[1] < bounds[2] < bounds[3]
*/
function createMarket(
uint256 openAt,
uint256 closeAt,
uint256 settleAt,
int256[4] calldata bounds
) external onlyOwner returns (uint256 marketId) {
if (openAt >= closeAt || closeAt >= settleAt) revert InvalidTimestamps();

if (
bounds[0] >= bounds[1] ||
bounds[1] >= bounds[2] ||
bounds[2] >= bounds[3]
) revert InvalidBounds();

marketId = ++marketCount;

Market storage m = markets[marketId];
m.id = marketId;
m.openAt = openAt;
m.closeAt = closeAt;
m.settleAt = settleAt;
m.bounds = bounds;

emit MarketCreated(marketId, openAt, closeAt, settleAt, bounds);
}

/**
* @notice Update treasury addresses.
* @dev Digunakan jika ada rotasi wallet.
*/
function updateTreasuries(
address _devTreasury,
address _jackpotTreasury,
address _flywheelTreasury
) external onlyOwner {
if (_devTreasury == address(0)) revert ZeroAddress();
if (_jackpotTreasury == address(0)) revert ZeroAddress();
if (_flywheelTreasury == address(0)) revert ZeroAddress();

devTreasury = _devTreasury;
jackpotTreasury = _jackpotTreasury;
flywheelTreasury = _flywheelTreasury;

emit TreasuryUpdated(_devTreasury, _jackpotTreasury, _flywheelTreasury);
}

function pause() external onlyOwner { _pause(); }
function unpause() external onlyOwner { _unpause(); }

// ─────────────────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
* @notice User memasang taruhan.
* @dev Memerlukan USDC approval sebelumnya.
* 1 user = 1 bet per market.
* @param marketId ID market
* @param poolId Pool pilihan (1..5)
* @param amount USDC dalam 6 decimals (5e6 = 5 USDC)
*/
function placeBet(
uint256 marketId,
uint8 poolId,
uint256 amount
) external whenNotPaused nonReentrant {
Market storage m = _getMarket(marketId);

if (m.settled) revert MarketNotOpen();
if (block.timestamp >= m.closeAt) revert MarketNotOpen();
if (block.timestamp < m.openAt) revert MarketNotOpen();
if (poolId < 1 || poolId > POOL_COUNT) revert InvalidPool();
if (amount < MIN_BET) revert BetTooSmall();
if (bets[marketId][msg.sender].amount != 0) revert AlreadyBet();

if (m.totalStake >= MAX_BET_THRESHOLD) {
uint256 maxBet = (m.totalStake * MAX_BET_BPS) / 10_000;
if (amount > maxBet) revert BetTooLarge();
}

bets[marketId][msg.sender] = Bet({
amount: amount,
poolId: poolId,
claimed: false
});

m.poolStakes[poolId - 1] += amount;
m.totalStake += amount;

usdc.transferFrom(msg.sender, address(this), amount);

emit BetPlaced(marketId, msg.sender, poolId, amount);
}

/**
* @notice Menyelesaikan market dengan harga dari Chainlink.
* @dev Permissionless — siapapun bisa panggil setelah settleAt.
* Backend menjalankan auto-settle bot sebagai failsafe.
*
* Oracle staleness: harga diterima jika updatedAt >= closeAt - ORACLE_STALENESS_BUFFER.
* Buffer = 2 jam untuk toleransi Chainlink heartbeat pada kondisi harga flat.
*
* @param marketId ID market yang akan diselesaikan
*/
function settleMarket(uint256 marketId) external nonReentrant {
Market storage m = _getMarket(marketId);

if (m.settled) revert MarketAlreadySettled();
if (block.timestamp < m.settleAt) revert SettlementTooEarly();

(
,
int256 price,
,
uint256 updatedAt,
) = priceFeed.latestRoundData();

if (price <= 0) revert InvalidOraclePrice();

// Toleransi 2 jam sebelum closeAt — mencegah revert saat harga BTC flat
if (updatedAt < m.closeAt - ORACLE_STALENESS_BUFFER) revert OraclePriceTooStale();

uint8 winningPool = _determineWinningPool(price, m.bounds);
bool isRefund = _checkRefundCondition(m.poolStakes, winningPool);

m.settlementPrice = price;
m.winningPool = winningPool;
m.settled = true;
m.refunded = isRefund;

if (!isRefund) {
uint256 devFee = (m.totalStake * DEV_FEE_BPS) / 10_000;
uint256 jackpotFee = (m.totalStake * JACKPOT_FEE_BPS) / 10_000;
uint256 flywheelFee = (m.totalStake * FLYWHEEL_FEE_BPS) / 10_000;

m.feesCollected = true;

usdc.transfer(devTreasury, devFee);
usdc.transfer(jackpotTreasury, jackpotFee);
usdc.transfer(flywheelTreasury, flywheelFee);

emit FeesDistributed(marketId, devFee, jackpotFee, flywheelFee);
}

emit MarketSettled(
marketId,
winningPool,
price,
m.totalStake,
m.poolStakes[winningPool - 1],
isRefund
);
}

/**
* @notice Pemenang mengklaim reward, atau semua user mengklaim refund.
* @dev Normal settlement: hanya pemenang yang bisa claim.
* Refund mode: semua peserta bisa claim kembali stake penuh.
* @param marketId ID market yang sudah settled
*/
function claim(uint256 marketId) external whenNotPaused nonReentrant {
Market storage m = _getMarket(marketId);

if (!m.settled) revert MarketNotSettled();

Bet storage userBet = bets[marketId][msg.sender];
if (userBet.amount == 0) revert NothingToClaim();
if (userBet.claimed) revert AlreadyClaimed();

uint256 payout;

if (m.refunded) {
payout = userBet.amount;
} else {
if (userBet.poolId != m.winningPool) revert NotWinner();
uint256 netPool = m.totalStake - ((m.totalStake * PROTOCOL_FEE_BPS) / 10_000);
uint256 winStake = m.poolStakes[m.winningPool - 1];
payout = (netPool * userBet.amount) / winStake;
}

userBet.claimed = true;
usdc.transfer(msg.sender, payout);

emit RewardClaimed(marketId, msg.sender, payout, m.refunded);
}

// ─────────────────────────────────────────────────────────────────────────
// VIEW FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
* @notice Estimasi payout untuk taruhan tertentu.
* @param marketId ID market
* @param poolId Pool yang dituju (1..5)
* @param betAmount Jumlah taruhan dalam USDC (6 decimals)
* @return estimatedPayout Estimasi payout net setelah fee
*/
function getEstimatedPayout(
uint256 marketId,
uint8 poolId,
uint256 betAmount
) external view returns (uint256 estimatedPayout) {
Market storage m = _getMarket(marketId);
if (poolId < 1 || poolId > POOL_COUNT) revert InvalidPool();

uint256 hypotheticalTotal = m.totalStake + betAmount;
uint256 hypotheticalPoolStake = m.poolStakes[poolId - 1] + betAmount;

uint256 netPool = hypotheticalTotal - ((hypotheticalTotal * PROTOCOL_FEE_BPS) / 10_000);
estimatedPayout = (netPool * betAmount) / hypotheticalPoolStake;
}

/**
* @notice Pool distribution untuk market tertentu.
*/
function getPoolDistribution(
uint256 marketId
) external view returns (uint256[5] memory poolStakes, uint256 totalStake) {
Market storage m = _getMarket(marketId);
return (m.poolStakes, m.totalStake);
}

/**
* @notice Bet data user untuk market tertentu.
*/
function getUserBet(
uint256 marketId,
address user
) external view returns (uint8 poolId, uint256 amount, bool claimed) {
Bet storage b = bets[marketId][user];
return (b.poolId, b.amount, b.claimed);
}

/**
* @notice Data market lengkap.
*/
function getMarket(uint256 marketId) external view returns (Market memory) {
return _getMarket(marketId);
}

/**
* @notice Apakah user bisa claim di market ini.
*/
function canClaim(
uint256 marketId,
address user
) external view returns (bool) {
if (marketId > marketCount) return false;
Market storage m = markets[marketId];
if (!m.settled) return false;

Bet storage b = bets[marketId][user];
if (b.amount == 0 || b.claimed) return false;

if (m.refunded) return true;
return b.poolId == m.winningPool;
}

// ─────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────

function _determineWinningPool(
int256 price,
int256[4] storage bounds
) internal view returns (uint8) {
if (price < bounds[0]) return 1;
if (price < bounds[1]) return 2;
if (price < bounds[2]) return 3;
if (price < bounds[3]) return 4;
return 5;
}

function _checkRefundCondition(
uint256[5] storage poolStakes,
uint8 winningPool
) internal view returns (bool isRefund) {
uint8 poolsWithStake = 0;
for (uint8 i = 0; i < POOL_COUNT; i++) {
if (poolStakes[i] > 0) poolsWithStake++;
}

if (poolsWithStake < 2) return true;
if (poolsWithStake == 1 && poolStakes[winningPool - 1] > 0) return true;

return false;
}

function _getMarket(uint256 marketId) internal view returns (Market storage) {
if (marketId == 0 || marketId > marketCount) revert MarketDoesNotExist();
return markets[marketId];
}

// ─────────────────────────────────────────────────────────────────────────
// UUPS UPGRADE
// ─────────────────────────────────────────────────────────────────────────

function _authorizeUpgrade(address newImplementation)
internal
override
onlyOwner
{}
}
