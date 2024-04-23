import { ConvertedStrategy, PricePoint } from "./types";
import { getHistoryPrice } from "../enpoints";

const formatter = (input: number | string) => {
  return Number(input)
    .toFixed(20)
    .replace(/\.?0+$/, "");
}

export const timestamp = (day: number, month: number, year: number) => {
  return Math.floor(new Date(`${month}/${day}/${year}`).getTime() / 1000);
}

export const now = () => Math.floor(Date.now() / 1000);


export function getMean(array: number[] | string[]) {
  return array
    .map(value => Number(value))
    .reduce((value, acc) => acc + value, 0) / array.length;
}

export function getStandardDerivation(array: number[] | string[], center?: number) {
  const mean = center || getMean(array);
  let value = 0;
  for (let i = 0; i < array.length; i++) {
    value += (Number(array[i]) - mean) ** 2;
  }
  value = value / array.length;
  value = Math.sqrt(value);
  return value;
}

export function getStrategyPrices(array: number[], center?: number) {
  const mean = center || getMean(array);
  const standardDerivation = getStandardDerivation(array);
  //Endpoint `simulateCreateStrategy` does not support 0 for buyMin
  const mininmum = 1e-18;
  return {
    buyMin: formatter(Math.max(mininmum, mean - (standardDerivation * 3))),
    buyMax: formatter(mean),
    sellMin: formatter(mean),
    sellMax: formatter(mean + standardDerivation * 3),
  };
}

/**
 * 
 * @param baseToken token address in lower case
 * @param quoteToken token address in lower case
 */
export async function getTokenStrategyPrices(baseToken: string, quoteToken: string) {
  const historyPrice = await getHistoryPrice({
    baseToken,
    quoteToken,
    start: timestamp(1, 4, 2023),
    end: now()
  });
  const pricesPoints = historyPrice.map((point: PricePoint) => Number(point.open));
  const srategyPrices = getStrategyPrices(
    pricesPoints,
    pricesPoints.at(-1)
  );
  return srategyPrices;
}