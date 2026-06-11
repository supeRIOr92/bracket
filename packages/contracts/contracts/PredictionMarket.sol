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
* Fee Structure:
* - 2.5% devTreasury (growth ecosystem)
* - 2.5% jackpotTreasury (komunitas)
* - Total protocol fee: 5%
*
* Market Validity Rule:
* Settle normal jika minimal 2 pool berbeda terisi.
* Jika tidak memenuhi full refund, zero fee.
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

uint256 public constant PROTOCOL_FEE_BPS = 500; // 5% total
uint256 public constant DEV_FEE_BPS = 250; // 2.5%
uint256 public constant JACKPOT_FEE_BPS = 250; // 2.5%

uint256 public constant MIN_BET = 5e6; // 5 USDC
uint256 public constant MAX_BET_THRESHOLD = 10_000e6; // 10,000 USDC
uint256 public constant MAX_BET_BPS = 500; // 5% of total pool

uint256 public constant ORACLE_STALENESS_BUFFER = 2 hours;

uint8 public constant POOL_COUNT = 5;

// ─────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────

IERC20 public usdc;
AggregatorV3Interface public priceFeed;

address public devTreasury;
address public jackpotTreasury;

uint256 public marketCount;

struct Market {
uint256 id;
uint256 openAt;
uint256 closeAt;
uint256 settleAt;
// Pool boundaries dalam Chainlink 8-decimal units (1e8 = $1)
// Pool 1: price < bounds[0]
// Pool 2: bounds[0] <= price < bounds[1]
// Pool 3: bounds[1] <= price < bounds[2]
// Pool 4: bounds[2] <= price < bounds[3]
// Pool 5: price >= bounds[3]
int256[4] bounds;
uint256[5] poolStakes;
uint256 totalStake;
uint8 winningPool;
int256 settlementPrice;
bool settled;
bool refunded;
bool feesCollected;
}

struct Bet {
uint256 amount;
uint8 poolId;
bool claimed;
}

mapping(uint256 => Market) public markets;
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
uint256 jackpotAmount
);
event RewardClaimed(
uint256 indexed marketId,
address indexed user,
uint256 amount,
bool isRefund
);
event TreasuryUpdated(address devTreasury, address jackpotTreasury);

// ─────────────────────────────────────────────────────────────────────────
// INITIALIZER
// ─────────────────────────────────────────────────────────────────────────

/// @custom:oz-upgrades-unsafe-allow constructor
constructor() {
_disableInitializers();
}

/**
* @param _usdc 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
* @param _priceFeed 0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F
* @param _devTreasury 2.5% fee recipient
* @param _jackpotTreasury 2.5% fee recipient
* @param _owner admin address
*/
function initialize(
address _usdc,
address _priceFeed,
address _devTreasury,
address _jackpotTreasury,
address _owner
) external initializer {
if (_usdc == address(0) || _priceFeed == address(0)) revert ZeroAddress();
if (_devTreasury == address(0)) revert ZeroAddress();
if (_jackpotTreasury == address(0)) revert ZeroAddress();
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
}

// ─────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────

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

function updateTreasuries(
address _devTreasury,
address _jackpotTreasury
) external onlyOwner {
if (_devTreasury == address(0)) revert ZeroAddress();
if (_jackpotTreasury == address(0)) revert ZeroAddress();
devTreasury = _devTreasury;
jackpotTreasury = _jackpotTreasury;
emit TreasuryUpdated(_devTreasury, _jackpotTreasury);
}

function pause() external onlyOwner { _pause(); }
function unpause() external onlyOwner { _unpause(); }

/**
* @notice Emergency withdrawal. Hanya saat contract di-pause.
* @dev Flow: pause() → emergencyWithdraw() → refund manual ke user.
*/
function emergencyWithdraw(address to) external onlyOwner whenPaused {
if (to == address(0)) revert ZeroAddress();
uint256 balance = usdc.balanceOf(address(this));
require(balance > 0, "Nothing to withdraw");
usdc.transfer(to, balance);
}

// ─────────────────────────────────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────────────────────────────────

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

bets[marketId][msg.sender] = Bet({ amount: amount, poolId: poolId, claimed: false });
m.poolStakes[poolId - 1] += amount;
m.totalStake += amount;

usdc.transferFrom(msg.sender, address(this), amount);
emit BetPlaced(marketId, msg.sender, poolId, amount);
}

function settleMarket(uint256 marketId) external nonReentrant {
Market storage m = _getMarket(marketId);

if (m.settled) revert MarketAlreadySettled();
if (block.timestamp < m.settleAt) revert SettlementTooEarly();

(, int256 price, , uint256 updatedAt,) = priceFeed.latestRoundData();

if (price <= 0) revert InvalidOraclePrice();
if (updatedAt < m.closeAt - ORACLE_STALENESS_BUFFER) revert OraclePriceTooStale();

uint8 winningPool = _determineWinningPool(price, m.bounds);
bool isRefund = _checkRefundCondition(m.poolStakes);

m.settlementPrice = price;
m.winningPool = winningPool;
m.settled = true;
m.refunded = isRefund;

if (!isRefund) {
uint256 devFee = (m.totalStake * DEV_FEE_BPS) / 10_000;
uint256 jackpotFee = (m.totalStake * JACKPOT_FEE_BPS) / 10_000;
m.feesCollected = true;
usdc.transfer(devTreasury, devFee);
usdc.transfer(jackpotTreasury, jackpotFee);
emit FeesDistributed(marketId, devFee, jackpotFee);
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
// VIEW
// ─────────────────────────────────────────────────────────────────────────

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

function getPoolDistribution(uint256 marketId)
external view returns (uint256[5] memory poolStakes, uint256 totalStake)
{
Market storage m = _getMarket(marketId);
return (m.poolStakes, m.totalStake);
}

function getUserBet(uint256 marketId, address user)
external view returns (uint8 poolId, uint256 amount, bool claimed)
{
Bet storage b = bets[marketId][user];
return (b.poolId, b.amount, b.claimed);
}

function getMarket(uint256 marketId) external view returns (Market memory) {
return _getMarket(marketId);
}

function canClaim(uint256 marketId, address user) external view returns (bool) {
if (marketId > marketCount) return false;
Market storage m = markets[marketId];
if (!m.settled) return false;
Bet storage b = bets[marketId][user];
if (b.amount == 0 || b.claimed) return false;
if (m.refunded) return true;
return b.poolId == m.winningPool;
}

// ─────────────────────────────────────────────────────────────────────────
// INTERNAL
// ─────────────────────────────────────────────────────────────────────────

function _determineWinningPool(int256 price, int256[4] storage bounds)
internal view returns (uint8)
{
if (price < bounds[0]) return 1;
if (price < bounds[1]) return 2;
if (price < bounds[2]) return 3;
if (price < bounds[3]) return 4;
return 5;
}

function _checkRefundCondition(uint256[5] storage poolStakes)
internal view returns (bool)
{uint8 count = 0;for (uint8 i = 0; i < POOL_COUNT; i++) {
if (poolStakes[i] > 0) count++;
}
// Refund jika 0 atau 1 pool terisi — tidak ada kompetisi valid
return count < 2;
}

function _getMarket(uint256 marketId) internal view returns (Market storage) {
if (marketId == 0 || marketId > marketCount) revert MarketDoesNotExist();
return markets[marketId];
}

// ─────────────────────────────────────────────────────────────────────────
// UUPS
// ─────────────────────────────────────────────────────────────────────────

function _authorizeUpgrade(address newImplementation)
internal override onlyOwner {}
}