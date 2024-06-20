import { TradeActionBNStr } from "@bancor/carbon-sdk";
import { TradeInfos, ConvertedStrategy, StrategyBundle, BundledTrade, TradeBundle } from "./types";

const getDeadline = (ms: number) => (Date.now() + ms).toString();

const getMinReturn = (amount: string, percent: number) => (Number(amount) * (1 - percent)).toString();

export function bundleStrategies(strategies: ConvertedStrategy[]): StrategyBundle {
  const bundle = [];
  for (const strategy of strategies) {
    const { token0, token1, order0, order1 } = strategy;
    bundle.push({ token0, token1, amount0: "0", amount1: "0", orders: [order0, order1] });
  };
  return bundle;
}

export function bundleTrades(trades: TradeInfos[]): TradeBundle {
  const bundle = [];
  for (const trade of trades) {
    const deadline = getDeadline(1000 * 60 * 30);
    const minReturn = "1";
    bundle.push({ ...trade, deadline, minReturn });
  };
  return bundle;
}