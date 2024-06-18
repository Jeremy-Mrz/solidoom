import { buildStrategyObject, encodeStrategy } from "@bancor/carbon-sdk/strategy-management";
import { convertOrder } from "./converter";
import { TokenName, tokens } from "./tokenInfos";
import { ConvertedStrategy, encodeStrategyParams } from "./types";

const defaultParams = {
  buyMin: "1",
  buyMax: "1000",
  sellMin: "1000",
  sellMax: "2000",
  buyBudget: "0",
  sellBudget: "0"
}

/**
 * @param base Base token trigram
 * @param quote Quote token trigram
 * @param priceParams buyMin, buyMax, sellMin, sellMax, buyBudget, sellBudget; Initialized with "1", "1OOO", "1000", "2000", "0" & "0"
 * @returns return an encoded strategy with the values of orders0 & order1 converted as BigInt 
 */
export function testGetEncStrategy(
  base: TokenName,
  quote: TokenName,
  priceParams: encodeStrategyParams = defaultParams
): ConvertedStrategy {

  const baseToken = tokens[base];
  const quoteToken = tokens[quote];

  // const { buyMin, buyMax, sellMin, sellMax } = await getTokenStrategyPrices(baseToken.address, quoteToken.address);
  const { buyMin, buyMax, sellMin, sellMax, buyBudget, sellBudget } = priceParams;

  const strategy = buildStrategyObject(
    baseToken.address,
    quoteToken.address,
    baseToken.decimals,
    quoteToken.decimals,
    buyMin,
    buyMax,
    buyMax,
    buyBudget,
    sellMin,
    sellMin,
    sellMax,
    sellBudget,
  );

  const encStategy = encodeStrategy(strategy);
  const { order0, order1, token0, token1 } = encStategy;
  const convOrders = convertOrder([order0, order1]);

  return { token0, token1, order0: convOrders[0], order1: convOrders[1] };
};

