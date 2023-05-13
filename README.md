# DoraBag Solidity Contract

DoraBag is a Solidity smart contract that allows users to participate in a betting game where they can place bets on the usd conversion rate of Bitcoin. The winner is rewarded with interest and other particpants can withdraw their stake without any loss. The contract is owned by an owner who has the authority to start and stop betting rounds and announce winners. The contract integrates with various external contracts and services, such as Chainlink's price feed and Aave V2 lending protocol.

# Table of Contents

- [Constants](#constants)
- [Features](#features)
- [Contract Details](#contract-details)
  - [Dependencies](#dependencies)
  - [Structs](#structs)
  - [State Variables](#state-variables)
  - [Modifiers](#modifiers)
  - [Events](#events)
  - [Constructor](#constructor)
  - [Functions](#functions)
- [Usage](#usage)
- [Contract Deployment](#contract-deployment)
- [Set up](#set-up)


## Constants

The contract defines the following constants:

- `BETTING_PERIOD`: The duration for the betting period.
- `LOCK_IN_PERIOD`: The duration for the lock-in period.
- `MIN_STAKE`: The minimum amount of Ether required to be eligible for winning interest.

## Features

1. The owner initiates the bet. Users can place bets within `BETTING_PERIOD` from it's start time.
2. Betting period cannot be stopped before `BETTING_PERIOD` has passed.
3. Owner stops the bet after the betting period is over and there is a `LOCK_IN_PERIOD` lock-in period.
4. Users can place bets on the price of Bitcoin denominated in USD.
5. Users receive equivalent `DoraToken` for the staked `ETH` while placing the bet.
6. The contract tracks multiple betting rounds, each with a defined betting period and lock-in period.
7. Owner declares the winner after the lock-in period is over.
8. The contract determines the winner at the end of the lock-in period based on the closest bet to the actual Bitcoin price. To be eligible to be considered a participant, the user must have at least `MIN_STAKE` staked.
9. Users can withdraw their funds by depositing equivalent `DoraToken` which is then burnt.
10. The winner receives `DoraTokens` equivalent to the interest generated by the AAVE deposit and which can be withdrawn from the contract.

## Contract Details

- SPDX-License-Identifier: MIT
- Solidity Version: ^0.8.0

### Dependencies

The DoraBag contract relies on the following Solidity libraries and contracts:

1. [Chainlink](https://docs.chain.link/data-feeds/price-feeds): The contract uses the Chainlink `AggregatorV3Interface` to fetch the latest price of Bitcoin in USD.

2. OpenZeppelin: The contract imports various libraries and contracts from the OpenZeppelin library, including

- `Ownable` for ownership functionality
- `SafeMath` for safe arithmetic operations
- `IERC20` for interacting with ERC20 tokens.

3. [Aave V2](https://docs.aave.com/developers/v/2.0/the-core-protocol/weth-gateway): The contract integrates with the Aave V2 lending protocol to deposit and withdraw ETH. It uses the IAaveV2 interface to interact with the Aave protocol.
   - `IAaveV2`, `IDoraToken`, `ILendingPoolAddressesProvider`
4. `DoraToken`: Custom `DoraToken` based on ERC20 token. It is a receipt token equivalent to `ETH` depisited in the contract.

### Structs

The contract defines the following struct:

- `BettingRound`: Represents a betting round and contains the round number, winner's address, open status, and start time.

### State Variables

The contract includes the following state variables:

- `bettingRounds`: An array of `BettingRound` structs to store the information about each betting round.
- `bets`: A mapping that associates user addresses with their respective bets.
- `users`: An array to keep track of the addresses of users who have placed bets.
- `doraAddress`: The address of the DoraToken contract.
- Interfaces and Contracts: Instances of various interfaces and contracts used within the contract.

### Modifiers

The contract defines the following modifiers:

- `isCurrentRoundOpen`: Checks if the current betting round is open.
- `isCurrentRoundClosed`: Checks if the previous betting round is closed.
- `hasBettingTimeExpired`: Checks if the betting time has expired.
- `isLockInPeriodOver`: Checks if the lock-in period is over.
- `isBettingRoundEmpty`: Checks if there is an active betting round.

### Events

The contract defines the following events:

- `DoraTokenDeployed`: Emitted when the DoraToken contract is deployed.
- `BettingRoundStarted`: Emitted when a new betting round is started.
- `BettingRoundClosed`: Emitted when the current betting round is closed.
- `BetPlaced`: Emitted when a user places a bet.
- `WinnerAnnounced`: Emitted when the winner of a betting round is announced.
- `FundsWithdrawn`: Emitted when a user withdraws their funds.

### Constructor

The contract constructor accepts the addresses of various external contracts and initializes the contract's state variables and instances.

### Functions

The contract provides the following functions:

- `getBitcoinPrice()`: Retrieves the current Bitcoin price in USD from the price feed.
- `startBetting()`: Starts a new betting round.
- `stopBetting()`: Stops the current betting round.
- `findWinner()`: Finds the winner of the current betting round.
- `placeBet(uint256 _bitcoinGuesspriceInUSD)`: Places a bet in the current betting round.
- `withdrawFunds(uint256 _amount)`: Withdraws the user's funds from the Aave V2 lending pool.
- `getBettingRoundsLength()`: Returns the total number of betting rounds.

## Usage

To participate in the betting game, users should follow these steps:

1. Start a new betting round by calling `startBetting()`, if you are the owner of the contract.
2. Place a bet by calling `placeBet(uint256 _bitcoinGuesspriceInUSD)` and providing a non-zero Bitcoin price guess denominated in USD. Include the desired amount of ETH with the transaction.
3. Wait for the lock-in period to expire.
4. Owner call the `findWinner()` function after lock-in period is expired and determine the winner and receive `DoraTokens` if eligible (min stake should be atleast greater than or equal to `MIN_STAKE`).
5. Call `withdrawFunds(uint256 _amount)` to withdraw your funds and burn the corresponding amount of DoraTokens or let it stay in the contract and carry the stake to the next betting round.

## Contract Deployment

The contract is deployed on the Ethereum Goerli test network with the following initial parameters:

1. BTC_USD_FEED_ADDRESS: Address of the Chainlink BTC/USD price feed contract on Goerli.
2. LENDING_POOL_ADDRESS: Address of the Aave Lending Pool contract on Goerli.
3. AAVE_V2_ADDRESS: Address of the Aave V2 contract on Goerli.
4. AAVE_ATOKEN_ADDRESS: Address of the Aave aToken contract on Goerli.

The contract deploys a DoraToken instance upon deployment.

**Note**: The contract is currently configured to run on the Goerli test network. Make sure to adjust the addresses

## Set up

This deploy scripts deploys on Goerli forked network and simulates basic path.

```
$npm install
$npx hardhat compile // to complie
$npx hardhat test // to test
$npx hardhat run --network hardhat scripts/deploy.js // deploys on Goerli fork
```
