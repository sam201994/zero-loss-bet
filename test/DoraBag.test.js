const { ethers, network } = require("hardhat");
const { expect } = require("chai");

const { BTC_USD_FEED_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS } =
    network.config.constants;

async function getBalance(tokenAddress, accountAddress) {
    // Get the provider and signer from Hardhat
    const [sender] = await ethers.getSigners();

    // Get the ERC20 token contract instance
    const Token = await ethers.getContractAt("IERC20", tokenAddress, sender);

    // Call the balanceOf function
    const balance = await Token.balanceOf(accountAddress);
    return balance.toString();
}

async function getTokenSupply(tokenAddress) {
    // Get the provider and signer from Hardhat
    const [sender] = await ethers.getSigners();

    // Get the ERC20 token contract instance
    const Token = await ethers.getContractAt("IERC20", tokenAddress, sender);

    // Call the balanceOf function
    const balance = await Token.totalSupply();
    return balance;
}

describe("DoraBag Tests", function () {
    let deployer;
    let account1;
    let account2;
    let account3;
    let account4;
    let account5;

    let doraBag;
    let doraTokenAddress;
    const initialAmount = "5";

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
        doraTokenAddress = await doraBag.getDoraTokenAddress();
        // Send 5 ETH to the contract for mocking interest, to be distributed to the winner (TODO: get this from Aave)

        await deployer.sendTransaction({
            to: ethers.utils.getAddress(doraBag.address),
            value: ethers.utils.parseEther(initialAmount),
        });
    });

    describe("startBetting func", function () {
        it("should revert if not owner", async function () {
            await expect(doraBag.connect(account1).startBetting()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(doraBag.connect(deployer).startBetting()).not.to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("should emit an evet BettingRoundStarted", async function () {
            await expect(doraBag.connect(deployer).startBetting()).to.emit(doraBag, "BettingRoundStarted");
        });

        it("should revert if betting has already started", async function () {
            await doraBag.startBetting();
            await expect(doraBag.startBetting()).to.be.revertedWith("Previous betting round is open");
        });
    });

    describe("stopBetting func", function () {
        it("should revert if not owner", async function () {
            await expect(doraBag.connect(account1).stopBetting()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(doraBag.connect(deployer).stopBetting()).not.to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("should emit an evet BettingRoundClosed", async function () {
            await doraBag.startBetting();
            await network.provider.send("evm_increaseTime", [20]);
            await expect(doraBag.connect(deployer).stopBetting()).to.emit(doraBag, "BettingRoundClosed");
        });

        it("It should revert if we try to stop the betting before the betting period has expired", async function () {
            await doraBag.startBetting();
            await network.provider.send("evm_increaseTime", [10]);
            await expect(doraBag.connect(deployer).stopBetting()).to.be.revertedWith(
                "Betting can't be stopped before betting period is over"
            );
        });

        it("should revert if betting has already stoped", async function () {
            await expect(doraBag.stopBetting()).to.be.revertedWith("Betting is closed");
        });
    });

    describe("placeBet func", function () {
        const betAmount = ethers.utils.parseEther("1");

        it("Should revert if there is no bet open", async function () {
            await expect(doraBag.connect(account3).placeBet(30000, { value: betAmount })).to.be.revertedWith(
                "Betting is closed"
            );
        });
        it("should be payable", async () => {
            await doraBag.startBetting();

            const transaction = await doraBag.connect(account3).placeBet(30000, { value: betAmount });
            const { events } = await transaction.wait();
            expect(events[1].event).to.equal("BetPlaced");
        });
        it("Should transfer ether to DoraBag and send equivalent DoraToken to function caller", async () => {
            await doraBag.startBetting();
            transaction = await doraBag.connect(account3).placeBet(30000, { value: betAmount });
            const balance = await getBalance(doraTokenAddress, account3.address);
            expect(balance).to.equal(betAmount.toString());
            const doraBagBalance = await ethers.provider.getBalance(doraBag.address);
            expect(doraBagBalance).to.equal(ethers.utils.parseEther(initialAmount).add(betAmount).toString());
        });
    });

    describe("withdrawFunds func", function () {
        const betAmount = ethers.utils.parseEther("1");
        const amount = ethers.utils.parseEther("0.5");

        it("should emit FundsWithdrawn", async () => {
            await doraBag.startBetting();
            await doraBag.connect(account4).placeBet(30000, { value: betAmount });

            const tx = await doraBag.connect(account4).withdrawFunds(amount);
            await expect(tx).to.emit(doraBag, "FundsWithdrawn").withArgs(account4.address, amount.toString());
        });
        it("Should transfer ether to function caller and burn the equivalent DoraToken", async () => {
            await doraBag.startBetting();
            await doraBag.connect(account4).placeBet(30000, { value: betAmount });

            const doraTokenSupplyBefore = await getTokenSupply(doraTokenAddress);
            const tx = await doraBag.connect(account4).withdrawFunds(amount);
            const doraTokenSupplyAfter = await getTokenSupply(doraTokenAddress);

            expect(doraTokenSupplyBefore.sub(amount).toString()).to.equal(doraTokenSupplyAfter.toString());

            const doraTokenBalance = await getBalance(doraTokenAddress, account4.address);
            expect(doraTokenBalance).to.equal(betAmount.sub(amount).toString());
        });
    });

    describe("findWinner func", function () {
        // check if betting round is empty
        it("should revert if betting round is empty", async () => {
            await expect(doraBag.findWinner()).to.be.revertedWith("No betting round there");
        });

        // check if current round is open and revert if it is
        it("should revert if current round is open", async () => {
            await doraBag.startBetting();
            await expect(doraBag.findWinner()).to.be.revertedWith("Previous betting round is open");
        });

        // check if lock in period is over
        it("should revert if lock in period is not over", async () => {
            await doraBag.startBetting();
            await doraBag.connect(account3).placeBet(30000, { value: ethers.utils.parseEther("1") });
            await network.provider.send("evm_increaseTime", [20]);
            await doraBag.stopBetting();
            await expect(doraBag.findWinner()).to.be.revertedWith("Bets are locked");
        });

        // should emit WinnerAnnounced event with correct args
        it("should emit WinnerAnnounced", async () => {
            await doraBag.startBetting();
            await doraBag.connect(account3).placeBet(30000, { value: ethers.utils.parseEther("2") });
            await network.provider.send("evm_increaseTime", [20]);
            await doraBag.stopBetting();
            await network.provider.send("evm_increaseTime", [20]);
            const tx = await doraBag.findWinner();
            await expect(tx)
                .to.emit(doraBag, "WinnerAnnounced")
                .withArgs(1, account3.address, ethers.utils.parseEther("5"));
        });

        // should mint DoraToken to the winner
        it("should mint DoraToken to the winner", async () => {
            await doraBag.startBetting();
            await doraBag.connect(account3).placeBet(30000, { value: ethers.utils.parseEther("2") });
            await network.provider.send("evm_increaseTime", [20]);
            await doraBag.stopBetting();
            await network.provider.send("evm_increaseTime", [20]);
            await doraBag.findWinner();
            const balance = await getBalance(doraTokenAddress, account3.address);
            expect(balance).to.equal(ethers.utils.parseEther("7"));
        });
    });
});
