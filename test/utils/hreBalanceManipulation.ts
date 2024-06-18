import { hexlify, zeroPad } from "@ethersproject/bytes";
import { parseUnits } from "@ethersproject/units";
import { tokens, TokenName } from "../../utils/tokenInfos";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const toBytes32 = (bn: BigNumber) => {
  return hexlify(zeroPad(bn.toHexString(), 32));
};

const setStorageAt = async (address: string, index: string, value: BigNumberish, hre: HardhatRuntimeEnvironment) => {
  await hre.ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await hre.ethers.provider.send("evm_mine", []);
};


async function balanceManipulation(tokenName: TokenName, address: string, hre: HardhatRuntimeEnvironment, amount: string = "100000") {
  const token = tokens[tokenName];
  if (!token) throw new Error(`No slot found for ${token}`);

  const locallyManipulatedBalance = parseUnits(amount, tokens[tokenName].decimals);
  const index = hre.ethers.solidityPackedKeccak256(["uint256", "uint256"], [address, token.slot]);

  await setStorageAt(
    token.address,
    index.toString(),
    toBytes32(locallyManipulatedBalance).toString(),
    hre
  )
}

export async function hreBalanceManipulationAll(address: string, hre: HardhatRuntimeEnvironment) {
  const promises = [];
  for (const token of Object.keys(tokens)) {
    if (token === 'ETH') continue;
    promises.push(balanceManipulation((token as TokenName), address, hre));
  };
  await Promise.all(promises);
}