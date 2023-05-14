const { ethers, network } = require("hardhat");
const { expect } = require("chai");

const { BTC_USD_FEED_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS } =
    network.config.constants;

describe("DoraBag Tests", function () {
    let deployer;
    let account1;
    let account2;
    let account3;
    let account4;
    let account5;

    let doraBag;
    let doraToken;

    beforeEach(async function () {
        // Retrieve the accounts
        [deployer, account1, account2, account3, account4, account5] = await ethers.getSigners();

        // Compile the contract
        const DoraBag = await ethers.getContractFactory("DoraBag");

        // Deploy the contract
        doraBag = await DoraBag.deploy(
            BTC_USD_FEED_ADDRESS,
            LENDING_POOL_PROVIDER_ADDRESS,
            AAVE_V2_ADDRESS,
            AAVE_ATOKEN_ADDRESS
        );

        await doraBag.deployed();

        // Get the address of the DoraToken contract
        const DoraTokenAddress = await doraBag.getDoraTokenAddress();

        // Send 5 ETH to the contract for mocking interest, to be distributed to the winner (TODO: get this from Aave)
        await deployer.sendTransaction({
            to: ethers.utils.getAddress(doraBag.address),
            value: ethers.utils.parseEther("5"),
        });
    });

    describe("startBetting", function () {
        // only owner can start betting
        it("should revert if not owner", async function () {
            await expect(doraBag.connect(account1).startBetting()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(doraBag.connect(deployer).startBetting()).to.emit(doraBag, "BettingRoundStarted");
        });

        // it should revert if betting has already started
        it("should revert if betting has already started", async function () {
            await doraBag.startBetting();
            await expect(doraBag.startBetting()).to.be.revertedWith("Previous betting round is open");
        });
    });

    describe("stopBetting", function () {
        // only owner can stop betting
        it("should revert if not owner", async function () {
            await expect(doraBag.connect(account1).stopBetting()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        // it should revert if betting has already stoped
        it("should revert if betting has already stoped", async function () {
            await expect(doraBag.stopBetting()).to.be.revertedWith("Betting is closed");
        });
    });
});
