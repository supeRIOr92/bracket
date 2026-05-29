import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-contract-sizer';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const config: HardhatUserConfig = {
solidity: {
version: '0.8.24',
settings: {
optimizer: {
enabled: true,
runs: 200,
},
viaIR: true,
},
},
networks: {
hardhat: {
forking: {
url: process.env.RPC_URL_BASE || 'https://mainnet.base.org',
enabled: false, // enable untuk fork testing
},
},
base: {
url: process.env.RPC_URL_BASE || 'https://mainnet.base.org',
accounts: process.env.DEPLOYER_PRIVATE_KEY
? [process.env.DEPLOYER_PRIVATE_KEY]
: [],
chainId: 8453,
},
},
etherscan: {
apiKey: {
base: process.env.BASESCAN_API_KEY || '',
},
customChains: [
{
network: 'base',
chainId: 8453,
urls: {
apiURL: 'https://api.basescan.org/api',
browserURL: 'https://basescan.org',
},
},
],
},
contractSizer: {
alphaSort: true,
runOnCompile: true,
},
};

export default config;
