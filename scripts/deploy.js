// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat")
const { ethers, deployments, getNamedAccounts } = require("hardhat")

async function main() {
    const BTC_USD_FEED_ADDRESS = "0xA39434A63A52E749F02807ae27335515BA4b07F7"
    const LENDING_POOL_PROVIDER_ADDRESS =
        "0x5E52dEc931FFb32f609681B8438A51c675cc232d"
    const AAVE_V2_ADDRESS = "0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627"
    const AAVE_ATOKEN_ADDRESS = "0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5"

    // Retrieve the accounts
    const [deployer, account1, account2, account3, account4, account5] =
        await hre.ethers.getSigners()

    const initialEtherAmount = ethers.utils.parseEther("4")

    // Compile the contract
    const DoraBag = await hre.ethers.getContractFactory("DoraBag")

    const doraBag = await DoraBag.deploy(
        BTC_USD_FEED_ADDRESS,
        LENDING_POOL_PROVIDER_ADDRESS,
        AAVE_V2_ADDRESS,
        AAVE_ATOKEN_ADDRESS
    )

    // // Wait for the contract to be mined
    // // // Call to check the balance of DoraToken for all accounts
    // doraBag.on("DoraTokenDeployed", async (doraAddress) => {
    //     console.log("DoraToken deployed at:", doraAddress)
    //     // Perform any desired operations with Contract B
    //     const balance1 = await doraAddress.balanceOf(account1.address)
    //     const balance2 = await doraAddress.balanceOf(account2.address)
    //     const balance3 = await doraAddress.balanceOf(account3.address)
    //     const balance4 = await doraAddress.balanceOf(account4.address)
    //     const balance5 = await doraAddress.balanceOf(account5.address)

    //     console.log("Account 1 Balance:", balance1.toString())
    //     console.log("Account 2 Balance:", balance2.toString())
    //     console.log("Account 3 Balance:", balance3.toString())
    //     console.log("Account 4 Balance:", balance4.toString())
    //     console.log("Account 5 Balance:", balance5.toString())
    // })

    await doraBag.deployed()

    console.log("doraBag.address", doraBag.address)

    const amount = ethers.utils.parseEther("2") // 1 Ether

    await deployer.sendTransaction({
        to: ethers.utils.getAddress(doraBag.address),
        value: amount,
    })
    console.log("Transferred Ether from signer1 to signer2")

    const doraBagETHBalanceBefore = await ethers.provider.getBalance(
        doraBag.address
    )
    console.log(
        "ETH Balance of DoraBag before betting has started",
        ethers.utils.formatEther(doraBagETHBalanceBefore)
    )

    // Call the startBetting function
    await doraBag.startBetting()

    // Call the placeBet function from the first account - bet 2 ETH, guess 30000
    await doraBag
        .connect(account1)
        .placeBet(30000, { value: ethers.utils.parseEther("2") })

    // Call the placeBet function from the second account - bet 2 ETH, guess 21000
    await doraBag
        .connect(account2)
        .placeBet(21000, { value: ethers.utils.parseEther("2") })
    // Call the placeBet function from the third account - bet 2 ETH, guess 26000
    await doraBag
        .connect(account3)
        .placeBet(26000, { value: ethers.utils.parseEther("2") })
    // Call the placeBet function from the fourth account - bet 2 ETH, guess 23000
    await doraBag
        .connect(account4)
        .placeBet(23000, { value: ethers.utils.parseEther("2") })

    // Call the withdraw function from the second account - withdraw all
    await doraBag.connect(account2).withdrawFunds(ethers.utils.parseEther("2"))

    // Call the placeBet function from the fifth account - bet 2 ETH, guess 25000
    await doraBag
        .connect(account5)
        .placeBet(25000, { value: ethers.utils.parseEther("2") })

    // Call the withdraw function from the third account - withdraw 1.5 ETH
    await doraBag
        .connect(account3)
        .withdrawFunds(ethers.utils.parseEther("1.5"))

    // Call the stopBetting function after 20 seconds have passed
    await hre.network.provider.send("evm_increaseTime", [20])
    await doraBag.stopBetting()

    const doraBagETHBalanceAfter = await ethers.provider.getBalance(
        doraBag.address
    )
    console.log(
        "ETH Balance of DoraBag after betting has stopped",
        ethers.utils.formatEther(doraBagETHBalanceAfter)
    )

    const deployerETHBalance = await ethers.provider.getBalance(
        deployer.address
    )
    console.log(
        "ETH Balance of deployer",
        ethers.utils.formatEther(deployerETHBalance)
    )
    const doraAddress = doraBag.getDoraTokenAddress()

    await getBalance(doraAddress, account1.address, "1")
    await getBalance(doraAddress, account2.address, "2")
    await getBalance(doraAddress, account3.address, "3")
    await getBalance(doraAddress, account4.address, "4")
    await getBalance(doraAddress, account5.address, "5")

    // Call the findWinner function after 20 seconds have passed, log the winner
    await hre.network.provider.send("evm_increaseTime", [20])
    const winner = await doraBag.findWinner()


    await getBalance(doraAddress, account1.address, "1")
    await getBalance(doraAddress, account2.address, "2")
    await getBalance(doraAddress, account3.address, "3")
    await getBalance(doraAddress, account4.address, "4")
    await getBalance(doraAddress, account5.address, "5")
}

async function getBalance(tokenAddress, accountAddress, name) {
    // // ERC20 token contract address
    // const tokenAddress = "<TOKEN_ADDRESS>";

    // // Address to check the balance for
    // const accountAddress = "<ACCOUNT_ADDRESS>";

    // Get the provider and signer from Hardhat
    const [sender] = await hre.ethers.getSigners()

    // Get the ERC20 token contract instance
    const Token = await hre.ethers.getContractAt("IERC20", tokenAddress, sender)

    // Call the balanceOf function
    const balance = await Token.balanceOf(accountAddress)
    console.log(`${name} has ${balance} DoraToken`)
    return balance.toString()
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
