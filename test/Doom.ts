import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { balanceManipulation, balanceManipulationAll } from "./utils/balanceManipulation";
import { ethers } from "hardhat";
import { erc20abi } from "../contracts/erc20abi";
import { TokenName, tokens } from "../utils/tokenInfos";
import { testGetEncStrategy } from "../utils/createOrders";
import { bundleStrategies, bundleTrades } from "../utils/bundlers";
import { initSDK } from "../utils/carbonSDK";
// import { _carbonAbi } from "../typechain-types/factories/contracts/Doom.sol/CarbonController__factory";
import { parseUnits } from "@bancor/carbon-sdk/utils";
import { CarbonController__factory } from "../typechain-types";
import { hashStrategies, hashStrategy } from "../utils/hash";
import { HardhatEthersSigner } from "../utils/types";

const { SDK } = initSDK();

async function generateTradeData(target: string, value: string, source: string) {
  const data = await SDK.getTradeData(
    source,
    target,
    value.toString(),
    false
  );
  return data;
}

async function approveErc20(tokenName: TokenName, amount: BigInt, target: string, signer?: HardhatEthersSigner) {
  const token = tokens[tokenName];
  const contract = new ethers.Contract(token.address, erc20abi, signer);
  const tx = await contract.approve(target, amount);
  return tx.wait();
}

describe("Doom", function () {

  this.beforeAll(async () => {

    const signers = await ethers.getSigners();
    const addresses = await Promise.all([
      signers[0].getAddress(),
      signers[1].getAddress(),
      signers[2].getAddress(),
      signers[3].getAddress(),
      signers[4].getAddress(),
    ]);
    const promises = [];
    for (const address of addresses) {
      promises.push(balanceManipulationAll(address));
    }
    await Promise.all(promises);

  });

  // this.beforeAll(async () => {
  //   const [signer1, signer2, signer3] = await ethers.getSigners();
  //   const signer1Address = await signer1.getAddress();
  //   const signer3Address = await signer3.getAddress();

  //   await Promise.all([
  //     balanceManipulation("BNT", signer1Address),
  //     balanceManipulation("DAI", signer1Address),
  //     balanceManipulation('USDC', signer1Address),
  //     balanceManipulation("BNT", signer3Address),
  //     balanceManipulation("DAI", signer3Address),
  //     balanceManipulation('USDC', signer3Address),
  //   ]);
  //   await waitForSync;
  //   await createEthStrategies(["USDC", "BNT", "DAI"], SDK, signer3);
  // });


  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployDoomFixture() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Voucher = await ethers.getContractFactory("Voucher");
    const voucher = await Voucher.deploy();
    const voucherAddress = await voucher.getAddress();

    const CarbonController: CarbonController__factory = await (ethers.getContractFactory("contracts/carbon/CarbonController.sol:CarbonController") as any);
    const carbonController = await CarbonController.deploy(voucherAddress, "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1");

    const ccAddress = await carbonController.getAddress();
    const forkedCcAddress = "0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1";

    const Doom = await ethers.getContractFactory("Doom");
    const doom = await Doom.deploy(ccAddress);

    return { doom, carbonController, owner, otherAccount };
  }

  describe.skip("BalanceManipulation", () => {
    it("Should add some DAI to a test address", async () => {

      const DAI_ADDRESS = tokens['DAI'].address;
      const [signer] = await ethers.getSigners();
      const contract = new ethers.Contract(DAI_ADDRESS, erc20abi, signer);
      const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const balance = await contract['balanceOf'](testAddress);
      expect(balance).to.equal("0");

      await balanceManipulation("DAI", testAddress);

      const balance2 = await contract['balanceOf'](testAddress);
      expect(balance2).to.equal("100000000000000000000000");

    });

    it("Should add some BNT to a test address", async () => {

      const BNT_ADDRESS = tokens['BNT'].address;
      const [signer] = await ethers.getSigners();
      const contract = new ethers.Contract(BNT_ADDRESS, erc20abi, signer);
      const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const balance = await contract['balanceOf'](testAddress);
      expect(balance).to.equal("0");

      await balanceManipulation("BNT", testAddress);

      const balance2 = await contract['balanceOf'](testAddress);
      expect(balance2).to.equal("100000000000000000000000");

    });
  })

  describe.skip("Get strategy", () => {
    it("Should return the strategy from the carbon controller interface", async () => {
      const { doom } = await loadFixture(
        deployDoomFixture
      );
      const strategy = await doom.getStrategy(BigInt("84390026996392738938916902643078516441795"));
      expect(strategy.owner).to.equal("0xE11f6Dae13596f256496d872483DF88215ECA46B");
    });

  });

  describe.skip("Create ETH strategies", () => {
    it.skip("Should create several strategies selling tokens for ETH", async () => {

      const [signer] = await ethers.getSigners();
      // const controller = new ethers.Contract(config.carbonControllerAddress, _carbonAbi, signer);
      // const filter = controller.filters['StrategyCreated'];
      // const ids: BigInt[] = [];
      // controller.on(filter, (id) => ids.push(id));
      // await createEthStrategies(["USDC"], SDK, signer);
      // console.log("Done:", ids);

    });
  });

  describe.skip("Create strategy", () => {
    it.skip("Should create a carbon strategy using doom contract", async () => {
      const { doom } = await loadFixture(
        deployDoomFixture
      );

      const [signer] = await ethers.getSigners();
      const signerAddress = await signer.getAddress();

      await Promise.all([
        balanceManipulation("BNT", signerAddress),
        balanceManipulation("DAI", signerAddress),
      ]);

      const { order0, order1, token0, token1 } = testGetEncStrategy("BNT", "DAI");

      const tx = await doom.callCreateStrategy(
        token0,
        token1,
        [order0 as any, order1 as any]
      );

      const receipt = await tx.wait();
      console.log({ receipt });
    });

    it.skip("Should allow user to invest on an ETF with new structure", async () => {
      const { doom, carbonController } = await loadFixture(
        deployDoomFixture
      );

      const [signer, user1] = await ethers.getSigners();
      const signerAddress = await signer.getAddress();
      const user1Address = await user1.getAddress();

      await Promise.all([
        balanceManipulation("DAI", signerAddress),
        balanceManipulation("BNT", signerAddress),
        balanceManipulation("USDC", signerAddress),
        balanceManipulation("SHIB", signerAddress),
        balanceManipulation("DAI", user1Address),
        balanceManipulation("BNT", user1Address),
        balanceManipulation("USDC", user1Address),
        balanceManipulation("SHIB", user1Address),
      ]);

      const strat1 = testGetEncStrategy("ETH", "DAI");
      const strat2 = testGetEncStrategy("ETH", "BNT");
      const strat3 = testGetEncStrategy("ETH", "SHIB");
      const strat4 = testGetEncStrategy("ETH", "USDC");

      const bundledEthStrat = bundleStrategies([strat1, strat2, strat3, strat4]);
      const ethStratTx = await doom.multiCallCreateStrategy((bundledEthStrat as any));
      await ethStratTx.wait();

      console.log("After balance manip and eth strat setup");

      const strategy0 = testGetEncStrategy("BNT", "DAI");
      const strategy1 = testGetEncStrategy("USDC", "SHIB");

      const strategiesBundle = bundleStrategies([strategy0, strategy1]);
      const ethValue = ethers.parseUnits("1");

      let ccStragiesIds: bigint[] = [];
      let etfId: BigInt = BigInt(0);
      doom.on(doom.filters["StategiesIdList(uint256[])"], (ids) => {
        ccStragiesIds = [...ids];
      });
      doom.on(doom.filters["EtfIdCreated(uint256)"], (id) => {
        etfId = id;
      })

      const tx0 = await doom.multiCallCreateStrategy(
        strategiesBundle as any,
        { value: ethValue }
      );
      const receipt0 = await tx0.wait();

      const tokenAmountInvested = parseUnits('12', tokens['DAI'].decimals).toBigInt();

      const doomAddress = await doom.getAddress();
      const contract = new ethers.Contract(tokens['DAI'].address, erc20abi, signer);

      const tx1 = await contract.approve(doomAddress, tokenAmountInvested);
      const receipt1 = await tx1.wait();

      const balance = await contract.balanceOf(doomAddress);

      const tx2 = await doom.investo((etfId as any), tokens['DAI'].address, tokenAmountInvested, ccStragiesIds);
      const receipt2 = await tx2.wait();

      const strat = await doom.getStrategy(ccStragiesIds[0]);
    });

    it.skip("Should create multiples carbon strategy using doom contract", async () => {
      const { doom } = await loadFixture(
        deployDoomFixture
      );

      const [signer, user1] = await ethers.getSigners();
      const signerAddress = await signer.getAddress();

      const strategy0 = testGetEncStrategy("BNT", "DAI");
      const strategy1 = testGetEncStrategy("USDC", "BNT");

      const strategiesBundle = bundleStrategies([strategy0, strategy1]);
      const ethValue = ethers.parseUnits("1");

      const tx = await doom.multiCallCreateStrategy(
        strategiesBundle as any,
        { value: ethValue }
      );

      const receipt = await tx.wait();
      console.log(receipt?.logs);

      const eventLog = receipt?.logs.at(-1);
      const etfId = (eventLog as any).args[0];

      const balance = await doom.getBalance(signerAddress, etfId);
      console.log(balance)

      const source = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

      const data = await generateTradeData(tokens['USDC'].address, "1", source);

      const USDCBundle = {
        value: ethers.parseUnits("1"),
        source,
        target: tokens["USDC"].address,
        tradeActions: data.tradeActions,
        totalTargetAmount: data.totalTargetAmount
      };

      const doomUser1 = doom.connect(user1);
      const tradeBundle = bundleTrades([USDCBundle]);
      console.log({ tradeBundle });

      console.log("here")

      const txTrade = await doomUser1.tradeBySourceAmount(
        tradeBundle as any,
        etfId.toString(),
        { value: ethers.parseUnits("1") }
      );

      await txTrade.wait();

      console.log("and there")

    });

    it.skip("Should allow a user to invest on an ETF", async () => {
      const { doom } = await loadFixture(
        deployDoomFixture
      );

      console.log("here")
      const [signer, user1] = await ethers.getSigners();

      const strategy0 = testGetEncStrategy("BNT", "DAI");
      const strategy1 = testGetEncStrategy("USDC", "BNT");

      const strategiesBundle = bundleStrategies([strategy0, strategy1]);
      const ethValue = ethers.parseUnits("1");

      const tx = await doom.multiCallCreateStrategy(
        strategiesBundle as any,
        { value: ethValue }
      );

      const receipt = await tx.wait();
      // console.log(receipt?.logs);

      const eventLog = receipt?.logs.at(-1);
      const etfId = (eventLog as any).args[0];
      const source = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

      const dataUSDC = await generateTradeData(tokens['USDC'].address, "1", source);
      const dataBNT = await generateTradeData(tokens['BNT'].address, "1", source);
      const dataDAI = await generateTradeData(tokens['DAI'].address, "1", source);

      const USDCBundle = {
        value: ethers.parseUnits("1"),
        source,
        target: tokens["USDC"].address,
        tradeActions: dataUSDC.tradeActions,
        totalTargetAmount: dataUSDC.totalTargetAmount
      };
      const BNTBundle = {
        value: ethers.parseUnits("1"),
        source,
        target: tokens["BNT"].address,
        tradeActions: dataBNT.tradeActions,
        totalTargetAmount: dataBNT.totalTargetAmount
      };
      const DAIBundle = {
        value: ethers.parseUnits("1"),
        source,
        target: tokens["DAI"].address,
        tradeActions: dataDAI.tradeActions,
        totalTargetAmount: dataDAI.totalTargetAmount
      };

      const doomUser1 = doom.connect(user1);
      const tradeBundle = bundleTrades([USDCBundle, BNTBundle, DAIBundle]);

      const txTrade = await doomUser1.invest(
        tradeBundle as any,
        etfId,
        { value: ethers.parseUnits("3") }
      );
      const finalReceipt = await txTrade.wait();

      const userAddresss = await user1.getAddress();
      const balance = await doom.balanceOf(userAddresss, etfId);

      const [USDCShare, BNTShare, DAIShare] = await Promise.all([
        doom.getEtfTokenBalance(etfId, tokens["USDC"].address),
        doom.getEtfTokenBalance(etfId, tokens["BNT"].address),
        doom.getEtfTokenBalance(etfId, tokens["DAI"].address),
        doom.getEtfTokenBalance(etfId, tokens["ETH"].address)
      ])

      console.log({ USDCShare, BNTShare, DAIShare });

    });

  });


  describe("Update strategy price", () => {
    it("Should allow user to invest on an ETF with new structure", async () => {
      const { doom } = await loadFixture(
        deployDoomFixture
      );

      const strat1 = testGetEncStrategy("ETH", "DAI");
      const strat2 = testGetEncStrategy("ETH", "BNT");
      const strat3 = testGetEncStrategy("ETH", "SHIB");
      const strat4 = testGetEncStrategy("ETH", "USDC");

      const bundledEthStrat = bundleStrategies([strat1, strat2, strat3, strat4]);
      const ethStratTx = await doom.multiCallCreateStrategy((bundledEthStrat as any));
      await ethStratTx.wait();

      console.log("After balance manip and eth strat setup");

      const strategy0 = testGetEncStrategy("BNT", "DAI");
      const strategy1 = testGetEncStrategy("USDC", "SHIB");

      const strategiesBundle = bundleStrategies([strategy0, strategy1]);
      const ethValue = ethers.parseUnits("1");

      let ccStragiesIds: bigint[] = [];
      let etfId: BigInt = BigInt(0);
      doom.on(doom.filters["StategiesIdList(uint256[])"], (ids) => {
        ccStragiesIds = [...ids];
      });
      doom.on(doom.filters["EtfIdCreated(uint256)"], (id) => {
        etfId = id;
      })

      const tx0 = await doom.multiCallCreateStrategy(
        strategiesBundle as any,
        { value: ethValue }
      );
      const receipt0 = await tx0.wait();
      const promises = [];
      for (const id of ccStragiesIds) {
        promises.push(doom.getStrategy(id));
      };
      const etfStrategies = await Promise.all(promises);

      const updatedPriceParams = {
        buyMin: "10",
        buyMax: "1500",
        sellMin: "1500",
        sellMax: "3000",
        buyBudget: "0",
        sellBudget: "0"
      }

      const updatedStrategy = testGetEncStrategy("BNT", "DAI", updatedPriceParams);
      const updatedStrategy2 = testGetEncStrategy("USDC", "SHIB", updatedPriceParams);

      const updatedStrategyHash = hashStrategy(updatedStrategy);
      const updatedStrategyHash2 = hashStrategy(updatedStrategy2);

      const finalHash = hashStrategies([updatedStrategyHash, updatedStrategyHash2]);

      const doomAddress = await doom.getAddress();
      const currentStrategy0 = await doom.getStrategy("1701411834604692317316873037158841057285");
      const currentStrategy1 = await doom.getStrategy("2041694201525630780780247644590609268742");

      const ccStrategyUpdate = {
        id: '1701411834604692317316873037158841057285',
        owner: doomAddress,
        tokens: [updatedStrategy.token0, updatedStrategy.token1],
        orders: [updatedStrategy.order0, updatedStrategy.order1]
      }
      const ccStrategyUpdate1 = {
        id: '2041694201525630780780247644590609268742',
        owner: doomAddress,
        tokens: [updatedStrategy2.token0, updatedStrategy2.token1],
        orders: [updatedStrategy2.order0, updatedStrategy2.order1]
      }

      const [signer0, signer1, signer2, signer3, signer4] = await ethers.getSigners();

      const tokenAmountInvestedDai = parseUnits('12', tokens['DAI'].decimals).toBigInt();
      const tokenAmountInvestedBnt = parseUnits('6', tokens['BNT'].decimals).toBigInt();
      const tokenAmountInvestedShib = parseUnits('4', tokens['SHIB'].decimals).toBigInt();

      const doom1 = doom.connect(signer1);
      const doom2 = doom.connect(signer2);
      const doom3 = doom.connect(signer3);

      await approveErc20('DAI', tokenAmountInvestedDai, doomAddress, signer1);
      await approveErc20('BNT', tokenAmountInvestedBnt, doomAddress, signer2);
      await approveErc20('SHIB', tokenAmountInvestedBnt, doomAddress, signer3);

      const investTx1 = await doom1.investo(
        (etfId as any),
        tokens['DAI'].address,
        tokenAmountInvestedDai,
        ccStragiesIds
      );
      await investTx1.wait();
      const investTx2 = await doom2.investo(
        (etfId as any),
        tokens['BNT'].address,
        tokenAmountInvestedBnt,
        ccStragiesIds
      );
      await investTx2.wait();
      const investTx3 = await doom3.investo(
        (etfId as any),
        tokens['SHIB'].address,
        tokenAmountInvestedShib,
        ccStragiesIds
      );
      await investTx3.wait();

      const [signedMessage0, signedMessage1, signedMessage2, signedMessage3, signedMessage4] = await Promise.all([
        signer0.signMessage(finalHash),
        signer1.signMessage(finalHash),
        signer2.signMessage(finalHash),
        signer3.signMessage(finalHash),
        signer4.signMessage(finalHash),
      ]);

      const totalShares = await doom.updatePrice(
        (etfId as any),
        ([ccStrategyUpdate, ccStrategyUpdate1] as any),
        ([ccStrategyUpdate, ccStrategyUpdate1] as any),
        [signedMessage0, signedMessage1, signedMessage2, signedMessage3, signedMessage4]
      );

    });
    
  });

});
