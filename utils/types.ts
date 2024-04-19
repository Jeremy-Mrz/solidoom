import { OrderStruct } from "@bancor/carbon-sdk/dist/abis/types/CarbonController";
import { TradeActionBNStr } from "@bancor/carbon-sdk";
import { TokenInfos } from "./tokenInfos";
import { ethers } from "hardhat";
import { Contract } from "hardhat/internal/hardhat-network/stack-traces/model";

type FromPromise<T> = T extends Promise<infer I> ? I : never;
export type HardhatEthersSigner = FromPromise<ReturnType<typeof ethers.getSigners>>[0];

export interface BalanceManipulationParams {
  tokenName: TokenInfos;
  address: string;
  amount: string;
}

export interface PricePoint {
  timestamp: number;
  low: string;
  high: string;
  open: string;
  close: string;
}

export type Endpoint = 'history/prices' | 'simulate-create-strategy';

export interface HistoryPriceParams {
  baseToken: string;
  quoteToken: string;
  start: number;
  end: number;
};

export interface CreateStrategyParams {
  baseToken: string;
  quoteToken: string;
  start: number;
  end: number;
  baseBudget: number;
  quoteBudget: number;
  buyMin: number;
  buyMax: number;
  sellMin: number;
  sellMax: number;
};

export interface encodeStrategyParams {
  buyMin: string;
  buyMax: string;
  sellMin: string;
  sellMax: string;
  buyBudget: string;
  sellBudget: string;
}

export interface ConvertedStrategy {
  token0: string;
  token1: string;
  order0: OrderStruct;
  order1: OrderStruct;
}

export interface BundledStrategy {
  token0: string;
  token1: string;
  orders: OrderStruct[];
}

export type StrategyBundle = BundledStrategy[];

export interface TradeInfos {
  source: string;
  target: string;
  tradeActions: TradeActionBNStr[];
  totalTargetAmount: string;
  value: BigInt;
}

export interface BundledTrade extends TradeInfos {
  deadline: string;
  minReturn: string;
}

export type TradeBundle = BundledTrade[];