export const tokens = {
  "DAI": {slot: 2, address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18},
  "BNT": {slot: 5, address: "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C", decimals: 18},
  "USDC": {slot: 9, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6},
  "SHIB": {slot: 0, address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18},
  "ETH": {slot: 0, address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18}
};

export type TokenInfos = keyof typeof tokens;