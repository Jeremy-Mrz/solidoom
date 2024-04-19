import { ethers } from "hardhat";

async function main() {


  const doom = await ethers.deployContract("Doom");

  await doom.waitForDeployment();

  console.log(`Doom deployed to ${doom.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
