import { Endpoint, HistoryPriceParams, CreateStrategyParams } from "./utils/types";

async function get(endpoint: Endpoint, params: HistoryPriceParams | CreateStrategyParams) {
  const url = new URL(`https://api.carbondefi.xyz/v1/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw(`[Endpoint]: ${endpoint}. [Params]: ${JSON.stringify(params)}. [Error] ${JSON.stringify(data)}`);
  return data;
}

export async function getHistoryPrice(params: HistoryPriceParams) {
  return get('history/prices', params);
}