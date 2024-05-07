import { hexlify, zeroPad } from "@ethersproject/bytes";
import { ethers } from "hardhat";
import { parseUnits } from "@ethersproject/units";
import { tokens, TokenName } from "../../utils/tokenInfos";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

const toBytes32 = (bn: BigNumber) => {
  return hexlify(zeroPad(bn.toHexString(), 32));
};

const setStorageAt = async (address: string, index: string, value: BigNumberish) => {
  await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await ethers.provider.send("evm_mine", []);
};

/** 
 * @param token: token name trigram
 * @param address: address receiving tokens
 * @param amount: token amount desired, initialized at "100000"
 */
export async function balanceManipulation(tokenName: TokenName, address: string, amount: string = "100000") {
  const token = tokens[tokenName];
  if (!token) throw new Error(`No slot found for ${token}`);

  const locallyManipulatedBalance = parseUnits(amount, tokens[tokenName].decimals);
  const index = ethers.solidityPackedKeccak256(["uint256", "uint256"], [address, token.slot]);

  await setStorageAt(
    token.address,
    index.toString(),
    toBytes32(locallyManipulatedBalance).toString()
  )
}

/**
 * @summary Add "100000" of each token in object Tokens (parsed with token decimals) to a given address
 */
export async function balanceManipulationAll(address: string) {
  const promises = [];
  for (const token of Object.keys(tokens)) {
    if (token === 'ETH') continue;
    promises.push(balanceManipulation((token as TokenName), address));
  };
  await Promise.all(promises);
}