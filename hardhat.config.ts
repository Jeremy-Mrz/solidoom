import { HardhatUserConfig, subtask, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { hreBalanceManipulationAll } from "./test/utils/hreBalanceManipulation";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  mocha: {
    timeout: 100000000
  },
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true,
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/JCPJlJLFLn4Dw3NEuiGKCPQBvQhv4VWt"
      }
    }
  }
};

const TASK_NODE_SERVER_CREATED = "node:server-created";

subtask(TASK_NODE_SERVER_CREATED)
  .setAction(async (arg, hre) => {
    const Voucher = await hre.ethers.getContractFactory("Voucher");
    const voucher = await Voucher.deploy();
    const voucherAddress = await voucher.getAddress();

    const CarbonController = await (hre.ethers.getContractFactory("contracts/carbon/CarbonController.sol:CarbonController") as any);
    const carbonController = await CarbonController.deploy(voucherAddress, "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1");

    const ccAddress = await carbonController.getAddress();
    const forkedCcAddress = "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1";

    const Doom = await hre.ethers.getContractFactory("Doom");
    const doom = await Doom.deploy(ccAddress);
    const doomAddress = await doom.getAddress();

    const hardhatAccount1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    await hreBalanceManipulationAll(hardhatAccount1, hre);

    console.log({ voucherAddress, ccAddress, doomAddress });
  });

task("contracts", "Deploy Voucher Controller and Doom contracts")
  .setAction(async (arg, hre) => {
    await hre.run("node");
  })


export default config;