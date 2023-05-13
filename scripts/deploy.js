const { ethers, network } = require("hardhat");

async function main() {
    const BTC_USD_FEED_ADDRESS = "0xA39434A63A52E749F02807ae27335515BA4b07F7";
    const LENDING_POOL_PROVIDER_ADDRESS = "0x5E52dEc931FFb32f609681B8438A51c675cc232d";
    const AAVE_V2_ADDRESS = "0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627";
    const AAVE_ATOKEN_ADDRESS = "0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5";

    // Retrieve the accounts
    const [deployer, account1, account2, account3, account4, account5] = await ethers.getSigners();

    // Compile the contract
    const DoraBag = await ethers.getContractFactory("DoraBag");

    // Deploy the contract
    const doraBag = await DoraBag.deploy(
        BTC_USD_FEED_ADDRESS,
        LENDING_POOL_PROVIDER_ADDRESS,
        AAVE_V2_ADDRESS,
        AAVE_ATOKEN_ADDRESS
    );

    await doraBag.deployed();

    console.log({ DoraBagAddress: doraBag.address });

    // Get the address of the DoraToken contract
    const DoraTokenAddress = await doraBag.getDoraTokenAddress();
    console.log({ DoraTokenAddress });

    // Send 5 ETH to the contract for mocking interest, to be distributed to the winner (TODO: get this from Aave)
    await deployer.sendTransaction({
        to: ethers.utils.getAddress(doraBag.address),
        value: ethers.utils.parseEther("5"),
    });

    const doraBagETHBalanceBefore = await ethers.provider.getBalance(doraBag.address);
    console.log({
        DoraBagBalance: ethers.utils.formatEther(doraBagETHBalanceBefore),
    });

    // Call the startBetting function
    await doraBag.startBetting();
    console.log("\n..................Betting has started..................\n");

    // Call the placeBet function from the first account - bet 2 ETH, guess 30000
    await placeBet("1", account1, "30000", "2", doraBag, DoraTokenAddress);

    // Call the placeBet function from the second account - bet 2 ETH, guess 21000
    await placeBet("2", account2, "21000", "2", doraBag, DoraTokenAddress);

    // Call the placeBet function from the third account - bet 2 ETH, guess 26000
    await placeBet("3", account3, "26000", "2", doraBag, DoraTokenAddress);

    // Call the placeBet function from the fourth account - bet 2 ETH, guess 23000
    await placeBet("4", account4, "23000", "2", doraBag, DoraTokenAddress);

    // Call the withdraw function from the second account - withdraw all
    await withdraw("2", account2, "2", doraBag, DoraTokenAddress);

    // Call the placeBet function from the fifth account - bet 2 ETH, guess 25000
    await placeBet("5", account5, "25000", "2", doraBag, DoraTokenAddress);

    // Call the withdraw function from the third account - withdraw 1.5 ETH
    await withdraw("3", account3, "1.5", doraBag, DoraTokenAddress);

    // Call the withdraw function from the fourth account - withdraw 0.1 ETH
    await withdraw("4", account4, "0.1", doraBag, DoraTokenAddress);

    // Call the stopBetting function after 20 seconds have passed
    await network.provider.send("evm_increaseTime", [20]);
    await doraBag.stopBetting();
    console.log("\n..................Betting has stopped..................\n");

    const doraBagETHBalanceAfter = await ethers.provider.getBalance(doraBag.address);
    console.log({
        DoraBagBalance: ethers.utils.formatEther(doraBagETHBalanceAfter),
    });

    // Call the findWinner function after 20 seconds have passed, log the winner
    await network.provider.send("evm_increaseTime", [20]);

    const bitcoinPrice = await doraBag.getBitcoinPrice();
    console.log({ BitcoinPrice: ethers.utils.formatUnits(bitcoinPrice, 8) });
    console.log("Bet closest to the price wins!");

    await doraBag.findWinner();
    console.log("\n..................Winner has been found..................\n");

    await getBalance(DoraTokenAddress, account1.address, "1");
    await getBalance(DoraTokenAddress, account2.address, "2");
    await getBalance(DoraTokenAddress, account3.address, "3");
    await getBalance(DoraTokenAddress, account4.address, "4");
    await getBalance(DoraTokenAddress, account5.address, "5");
}

async function getBalance(tokenAddress, accountAddress, name) {
    // Get the provider and signer from Hardhat
    const [sender] = await ethers.getSigners();

    // Get the ERC20 token contract instance
    const Token = await ethers.getContractAt("IERC20", tokenAddress, sender);

    // Call the balanceOf function
    const balance = await Token.balanceOf(accountAddress);
    const parsedBalance = ethers.utils.formatEther(balance);
    console.log(`Account${name} has ${parsedBalance} DoraToken`);
    return parsedBalance;
}

async function placeBet(name, signer, guessPrice, betAmount, doraBag, doraTokenAddress) {
    await doraBag.connect(signer).placeBet(guessPrice, {
        value: ethers.utils.parseEther(betAmount),
    });
    console.log(`Account${name} has placed a bet of ${betAmount} ETH with guess ${guessPrice} USD`);
    await getBalance(doraTokenAddress, signer.address, name);
    console.log("\n");
}

async function withdraw(name, account, amount, doraBag, doraTokenAddress) {
    await doraBag.connect(account).withdrawFunds(ethers.utils.parseEther(amount));
    console.log(`Account${name} has withdrawn ${amount} ETH`);
    const balance = await getBalance(doraTokenAddress, account.address, name);
    if (+balance < 1) {
        console.log(`Account${name} has less than 1 DoraToken, so they are out of the game`);
    }
    console.log("\n");
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
