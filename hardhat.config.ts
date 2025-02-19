import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const { BASE_SEPOLIA_KEY, BASESCAN_KEY } = process.env;

// Collect private keys into an array
const privateKeys: string[] = [
  process.env.ACCOUNT_PRIVATE_KEY,
  process.env.ACCOUNT_TWO_PRIVATE_KEY,
  process.env.ACCOUNT_THREE_PRIVATE_KEY, 
]
  .filter((key): key is string => Boolean(key)) 
  .map((key) => `0x${key.trim()}`); 

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  sourcify: {
    enabled: true,
  },
  networks: {
    base: {
      url: BASE_SEPOLIA_KEY || "", 
      accounts: privateKeys, 
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: BASESCAN_KEY || "",
  },
};

export default config;
