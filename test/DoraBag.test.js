const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { expect } = require("chai")

describe("DoraBag Contract", function () {
    let DoraBag
    let doraBag

    let deployer
    let bob
    let alice

    beforeEach(async function () {
        ;[deployer, bob, alice] = await ethers.getSigners()
        DoraBag = await ethers.getContractFactory("DoraBag")
        doraBag = await DoraBag.deploy()
        await doraBag.deployed()
    })

    describe("func stopBet", function () {
        it("Only owner can stop the bet", async function () {
            await expect(doraBag.connect(bob).stopBet()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            )
        })

        it("Bet can only be stopped for an ongoing round", async function () {
            await expect(doraBag.stopBet()).to.be.revertedWith(
                "Betting is open"
            )
        })

        it("Bet cannot be stopped before betting period is over (7 days)", async function () {
            await time.increase(BETTING_PERIOD - 1) // Increase time to less than 7 days
            await expect(doraBag.stopBet()).to.be.revertedWith(
                "Betting can't be stopped before 7 days"
            )
        })
    })

    describe("func startBet", function () {
        it("Only owner can start a bet", async function () {
            await expect(
                doraBag.connect(bob).startBettingRound()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("Bet can only be started if there is no current round ongoing", async function () {
            await doraBag.startBettingRound()
            await expect(doraBag.startBettingRound()).to.be.revertedWith(
                "Betting is open"
            )
        })

        it("Current round number should increase", async function () {
            await doraBag.startBettingRound()
            const currentRound = await doraBag.currentround()
            expect(currentRound).to.equal(1)
        })
    })

    describe("func withdrawFunds", function () {
        it("It should call approve function of AAVE aToken", async function () {
            const amount = ethers.utils.parseEther("1")
            await expect(doraBag.withdrawFunds(amount)).to.emit(
                doraBag.iAToken,
                "Approval"
            )
        })

        it("It should call withdrawETH function of AAVE V2 contract", async function () {
            const amount = ethers.utils.parseEther("1")
            await expect(doraBag.withdrawFunds(amount))
                .to.emit(doraBag.iAaveV2, "WithdrawETH")
                .withArgs(doraBag.LENDING_POOL_ADDRESS, amount, doraBag.address)
        })

        it("DoraToken of the caller should burn", async function () {
            const amount = ethers.utils.parseEther("1")
            const initialBalance = await doraBag.iDoraToken.balanceOf(
                deployer.address
            )

            await expect(doraBag.withdrawFunds(amount))
                .to.emit(doraBag.iDoraToken, "Transfer")
                .withArgs(
                    deployer.address,
                    ethers.constants.AddressZero,
                    amount
                )

            const finalBalance = await doraBag.iDoraToken.balanceOf(
                deployer.address
            )
            expect(finalBalance).to.equal(initialBalance.sub(amount))
        })

        it("Caller of the function should receive equivalent ether", async function () {
            const amount = ethers.utils.parseEther("1")
            const initialBalance = await deployer.getBalance()

            await expect(doraBag.withdrawFunds(amount)).to.changeEtherBalance(
                deployer,
                amount
            )

            const finalBalance = await deployer.getBalance()
            expect(finalBalance).to.equal(initialBalance.add(amount))
        })
    })

    //  describe("func getBitcoinPrice", function () {
    //   it("it should get the current bitcoin price in USD", async function () {
    //     const price = await doraBag.getBitcoinPrice();
    //     expect(price).to.be.a("number");
    //   });
    // });
})
