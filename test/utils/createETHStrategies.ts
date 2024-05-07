import { ethers } from "hardhat";
import { TokenName, tokens } from "../../utils/tokenInfos";
import { balanceManipulation } from "./balanceManipulation";
import { toBigInt } from "../../utils/converter";
import { erc20abi } from "../../contracts/erc20abi";
import { Toolkit } from "@bancor/carbon-sdk/strategy-management";
import { HardhatEthersSigner } from "../../utils/types";

async function approveTokenTransfer(tokenAddress: string, signer: HardhatEthersSigner, tokenAmount: BigInt) {
  const carbonController = "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1";
  const contract = new ethers.Contract(tokenAddress, erc20abi, signer) as any;
  const connect = contract.connect(signer);
  await connect.approve(carbonController, tokenAmount.toString());
}

export async function createEthStrategies(quotes: TokenName[], SDK: Toolkit, signer: HardhatEthersSigner) {
  const signerAddress = await signer.getAddress();
  const txs = [];
  const updatedERC20Balance = "10000000";
  console.log("a");
  for (const quote of quotes) {
    await balanceManipulation(quote, signerAddress, updatedERC20Balance);
    const buyMin = "1";
    const buyMax = "1000";
    const sellMin = "1000";
    const sellMax = "2000";
    console.log("aaaa")
    const tx = await SDK.createBuySellStrategy(
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".toLowerCase(),
      tokens[quote].address.toLowerCase(),
      buyMin,
      buyMax,
      buyMax,
      "100",
      sellMin,
      sellMin,
      sellMax,
      "100"
    );
    console.log("b");
    txs.push(toBigInt(tx) as any);
    const tokenAmountApproval = ethers.parseUnits(updatedERC20Balance);
    await approveTokenTransfer(tokens[quote].address, signer, tokenAmountApproval);
  }
  console.log("c");
  const receipts = await Promise.all(txs.map(tx => signer.sendTransaction(tx)));
  await Promise.all(receipts.map(receipt => receipt.wait()));
}