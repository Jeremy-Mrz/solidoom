import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  mocha: {
    timeout: 100000000
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/JCPJlJLFLn4Dw3NEuiGKCPQBvQhv4VWt"
      }
    }
  }
};


export default config;
