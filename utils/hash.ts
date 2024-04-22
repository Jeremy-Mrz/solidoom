import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";
import { ethers } from "hardhat";
import { ConvertedStrategy } from "./types";
import { BigNumberish } from "@bancor/carbon-sdk/utils";

export function hashStrategy(strategy: ConvertedStrategy) {
  const { token0, token1, order0, order1 } = strategy;

  const orderTypes = ['uint256', 'uint256', 'uint256', 'uint256'];

  const order0Result = [order0.y, order0.z, order0.A, order0.B];
  const order1Result = [order1.y, order1.z, order1.A, order1.B];

  const hashedOrder0 = Buffer.from(solidityKeccak256(orderTypes, order0Result).slice(2), 'hex');
  const hashedOrder1 = Buffer.from(solidityKeccak256(orderTypes, order1Result).slice(2), 'hex');

  const finalHashTypes = ['address', 'address', 'bytes32', 'bytes32'];
  const finalHashResult = [token0, token1, hashedOrder0, hashedOrder1];

  return Buffer.from(solidityKeccak256(finalHashTypes, finalHashResult).slice(2), 'hex');
}

export function hashTest(token0: string, token1: string) {
  const types = ['address', 'address'];
  return Buffer.from(solidityKeccak256(types, [token0, token1]).slice(2), 'hex');
}

export function hashTestNumber(n0: number, n1: number) {
  const types = ['uint256', 'uint256'];
  return Buffer.from(solidityKeccak256(types, [n0, n1]).slice(2), 'hex');
}

export function hashTestOrder(order0: any, order1: any) {
  const types = ['uint256', 'uint256', 'uint256', 'uint256'];
  const order0Result = [order0.y, order0.z, order0.A, order0.B];
  const order1Result = [order1.y, order1.z, order1.A, order1.B];
  const hashedOrder0 = Buffer.from(solidityKeccak256(types, order0Result).slice(2), 'hex');
  const hashedOrder1 = Buffer.from(solidityKeccak256(types, order1Result).slice(2), 'hex');

  const finalTypes = ['bytes32', 'bytes32']
  return Buffer.from(solidityKeccak256(finalTypes, [hashedOrder0, hashedOrder1]).slice(2), 'hex');
}

export function hashTestSingleOrder(order0: any) {
  const converter = (number: BigNumberish) => Number(number); 
  const types = ['uint256', 'uint256', 'uint256', 'uint256'];
  const order0Result = [converter(order0.y), converter(order0.z), converter(order0.A), converter(order0.B)];
  return Buffer.from(solidityKeccak256(types, order0Result).slice(2), 'hex');
}