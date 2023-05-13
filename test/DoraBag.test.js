const { ethers, network } = require("hardhat")
const { expect } = require("chai")

const BTC_USD_FEED_ADDRESS = "0xA39434A63A52E749F02807ae27335515BA4b07F7"
const LENDING_POOL_PROVIDER_ADDRESS =
    "0x5E52dEc931FFb32f609681B8438A51c675cc232d"
const AAVE_V2_ADDRESS = "0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627"
const AAVE_ATOKEN_ADDRESS = "0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5"

describe("DoraBag", function () {
    let deployer
    let account1
    let account2
    let account3
    let account4
    let account5

    let doraBag
    let doraToken

    beforeEach(async function () {
        // Retrieve the accounts
        ;[deployer, account1, account2, account3, account4, account5] =
            await ethers.getSigners()

        // Compile the contract
        const DoraBag = await ethers.getContractFactory("DoraBag")

        // Deploy the contract
        doraBag = await DoraBag.deploy(
            BTC_USD_FEED_ADDRESS,
            LENDING_POOL_PROVIDER_ADDRESS,
            AAVE_V2_ADDRESS,
            AAVE_ATOKEN_ADDRESS
        )

        await doraBag.deployed()

        // Get the address of the DoraToken contract
        const DoraTokenAddress = await doraBag.getDoraTokenAddress()

        // Send 5 ETH to the contract for mocking interest, to be distributed to the winner (TODO: get this from Aave)
        await deployer.sendTransaction({
            to: ethers.utils.getAddress(doraBag.address),
            value: ethers.utils.parseEther("5"),
        })
    })

    describe("startBetting", function () {
        // only owner can start betting
        it("should revert if not owner", async function () {
            await expect(
                doraBag.connect(account1).startBetting()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        // it should revert if betting has already started
        it("should revert if betting has already started", async function () {
            await doraBag.startBetting()
            await expect(doraBag.startBetting()).to.be.revertedWith(
                "Previous betting round is open"
            )
        })
    })
})
