// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.

const hre = require("hardhat");

async function main() {
  const BTC_USD_FEED_ADDRESS = "0xA39434A63A52E749F02807ae27335515BA4b07F7";
  const LENDING_POOL_PROVIDER_ADDRESS = "0x5E52dEc931FFb32f609681B8438A51c675cc232d";
  const AAVE_V2_ADDRESS = "0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627";
  const AAVE_ATOKEN_ADDRESS = "0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5";

  const DoraBag = await hre.ethers.getContractFactory("DoraBag");
  const doraBag = await DoraBag.deploy(
    BTC_USD_FEED_ADDRESS,
    LENDING_POOL_PROVIDER_ADDRESS,
    AAVE_V2_ADDRESS,
    AAVE_ATOKEN_ADDRESS
  );

  await doraBag.deployed();

  console.log("DoraBag deployed to:", doraBag.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

