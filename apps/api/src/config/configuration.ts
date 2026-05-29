export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
  },
  privy: {
    appId: process.env.PRIVY_APP_ID!,
    appSecret: process.env.PRIVY_APP_SECRET!,
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL_BASE || 'https://mainnet.base.org',
    contractAddress: process.env.CONTRACT_ADDRESS!,
    usdcAddress: process.env.USDC_ADDRESS_BASE!,
    chainlinkFeed: process.env.CHAINLINK_BTC_USD_BASE!,
    deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
  },
  treasury: {
    dev: process.env.DEV_TREASURY_ADDRESS!,
    jackpot: process.env.JACKPOT_TREASURY_ADDRESS!,
    flywheel: process.env.FLYWHEEL_TREASURY_ADDRESS!,
  },
  redis: {
    url: process.env.REDIS_URL!,
    token: process.env.REDIS_TOKEN!,
  },
});