import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";
import { ConvertedStrategy } from "./types";

export function hashStrategy(strategy: ConvertedStrategy) {
  const { token0, token1, order0, order1 } = strategy;

  const orderTypes = ['uint128', 'uint128', 'uint64', 'uint64'];

  const order0Result = [order0.y, order0.z, order0.A, order0.B];
  const order1Result = [order1.y, order1.z, order1.A, order1.B];

  const hashedOrder0 = Buffer.from(solidityKeccak256(orderTypes, order0Result).slice(2), 'hex');
  const hashedOrder1 = Buffer.from(solidityKeccak256(orderTypes, order1Result).slice(2), 'hex');

  const finalHashTypes = ['address', 'address', 'bytes32', 'bytes32'];
  const finalHashResult = [token0, token1, hashedOrder0, hashedOrder1];

  return Buffer.from(solidityKeccak256(finalHashTypes, finalHashResult).slice(2), 'hex');
}

export function hashStrategies(hashes: Buffer[]) {
  const types = new Array(hashes.length).fill("bytes32");
  return Buffer.from(solidityKeccak256(types, hashes).slice(2), 'hex');
}