import { Toolkit } from '@bancor/carbon-sdk/strategy-management';
import { ChainCache, initSyncedCache } from '@bancor/carbon-sdk/chain-cache';
import { ContractsApi } from '@bancor/carbon-sdk/contracts-api';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

let api: ContractsApi;
let sdkCache: ChainCache;
let carbonSDK: Toolkit;
export const config = {
  carbonControllerAddress: "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1",
  voucherAddress: "0x3660F04B79751e31128f6378eAC70807e38f554E"
};

export const initSDK = () => {
  console.log("Initializing")
  const rpcUrl = "http://127.0.0.1:8545/";
  const provider = new StaticJsonRpcProvider( { url: rpcUrl, skipFetchSetup: true }, 1 );
  const config = {
    carbonControllerAddress: "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1",
    voucherAddress: "0x3660F04B79751e31128f6378eAC70807e38f554E"
  };
  api = new ContractsApi(provider, config);
  const { cache, startDataSync } = initSyncedCache(api.reader);
  sdkCache = cache;
  carbonSDK = new Toolkit(
    api,
    sdkCache
  );
  console.log("Initialized")
  return {
    SDK: carbonSDK,
    waitForSync: startDataSync(),
  };
};