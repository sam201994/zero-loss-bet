// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

import "./interfaces/IAaveV2.sol";
import "./interfaces/IDoraToken.sol";
import "./interfaces/ILendingPoolAddressesProvider.sol";

import "./DoraToken.sol";

/**
 * @title DoraBag
 * @dev The DoraBag contract allows users to participate in a betting game by placing bets on the Bitcoin price.
 * The contract uses Aave V2 for lending and borrowing functionality and a custom DoraToken for tracking user balances.
 * The contract is owned by an owner who can start and stop betting rounds and announce winners.
 */

contract DoraBag is Ownable {
    using SafeMath for uint256;

    // Interfaces
    AggregatorV3Interface private priceFeed;
    IAaveV2 private iAaveV2;
    IERC20 private iAToken;
    ILendingPoolAddressesProvider private lendingPoolAddressesProvider;
    IDoraToken private iDoraToken;

    // Constants
    uint256 constant BETTING_PERIOD = 15 seconds;
    uint256 constant LOCK_IN_PERIOD = 15 seconds;
    uint256 constant MIN_STAKE = 1 ether;

    // Addresses
    address LENDING_POOL_ADDRESS;

    // Structs
    struct BettingRound {
        uint256 roundNumber;
        address winner;
        bool isOpen;
        uint256 startTime;
    }

    // State variables
    BettingRound[] public bettingRounds;
    mapping(address => uint256) bets;
    address[] public users;
    address doraAddress;

    // Modifiers
    modifier isCurrentRoundOpen() {
        require(
            (bettingRounds.length > 0 &&
                bettingRounds[getCurrentRoundIndex()].isOpen),
            "Betting is closed"
        );
        _;
    }

    modifier isCurrentRoundClosed() {
        if (bettingRounds.length > 0) {
            if (bettingRounds[getCurrentRoundIndex()].isOpen) {
                revert("Previous betting round is open");
            }
        }
        _;
    }

    modifier hasBettingTimeExpired() {
        require(
            block.timestamp >
                bettingRounds[getCurrentRoundIndex()].startTime +
                    BETTING_PERIOD,
            "Betting can't be stopped before 7 days"
        );
        _;
    }

    modifier isLockInPeriodOver() {
        require(
            block.timestamp >
                bettingRounds[getCurrentRoundIndex()].startTime +
                    BETTING_PERIOD +
                    LOCK_IN_PERIOD,
            "Bets are locked"
        );
        _;
    }

    modifier isBettingRoundEmpty() {
        require(bettingRounds.length > 0, "No betting round there");
        _;
    }

    // Events
    event DoraTokenDeployed(address a);
    event BettingRoundStarted(uint256 roundNumber, uint256 startTime);
    event BettingRoundClosed(uint256 roundNumber);
    event BetPlaced(
        address indexed user,
        uint256 betAmount,
        uint256 stakedAmount
    );
    event WinnerAnnounced(
        uint256 roundNumber,
        address winner,
        uint256 interest
    );
    event FundsWithdrawn(address indexed user, uint256 amount);

    /**
     * @dev Constructor function that initializes the contract with the necessary addresses and contracts.
     * @param _BTC_USD_FEED_ADDRESS The address of the BTC/USD price feed.
     * @param _LENDING_POOL_PROVIDER_ADDRESS The address of the Aave V2 lending pool addresses provider.
     * @param _AAVE_V2_ADDRESS The address of the Aave V2 protocol contract.
     * @param _AAVE_ATOKEN_ADDRESS The address of the Aave aToken contract.
     */
    constructor(
        address _BTC_USD_FEED_ADDRESS,
        address _LENDING_POOL_PROVIDER_ADDRESS,
        address _AAVE_V2_ADDRESS,
        address _AAVE_ATOKEN_ADDRESS
    ) {
        // address _BTC_USD_FEED_ADDRESS = address(0xA39434A63A52E749F02807ae27335515BA4b07F7);
        // address _LENDING_POOL_PROVIDER_ADDRESS = address(0x5E52dEc931FFb32f609681B8438A51c675cc232d);
        // address _AAVE_V2_ADDRESS = address(0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627);
        // address _AAVE_ATOKEN_ADDRESS = address(0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5);

        DoraToken doraToken = new DoraToken();
        doraAddress = address(doraToken);
        iDoraToken = IDoraToken(doraAddress);

        priceFeed = AggregatorV3Interface(_BTC_USD_FEED_ADDRESS);
        iAaveV2 = IAaveV2(_AAVE_V2_ADDRESS);
        iAToken = IERC20(_AAVE_ATOKEN_ADDRESS);
        lendingPoolAddressesProvider = ILendingPoolAddressesProvider(
            _LENDING_POOL_PROVIDER_ADDRESS
        );
        // LENDING_POOL_ADDRESS = getLendingPoolAddress();
        emit DoraTokenDeployed(address(doraToken));
    }

    /**
     * @dev Starts a new betting round. Only the contract owner can call this function.
     */

    function startBetting() external onlyOwner isCurrentRoundClosed {
        uint256 timestamp = block.timestamp;
        bettingRounds.push(
            BettingRound(bettingRounds.length + 1, address(0), true, timestamp)
        );
        emit BettingRoundStarted(bettingRounds.length + 1, timestamp);
    }

    /**
     * @dev Stops the current betting round. Only the contract owner can call this function.
     * Betting can only be stopped after the betting period has expired.
     */
    function stopBetting()
        external
        onlyOwner
        isCurrentRoundOpen
        hasBettingTimeExpired
    {
        bettingRounds[getCurrentRoundIndex()].isOpen = false;
        emit BettingRoundClosed(bettingRounds.length);
    }

    /**
     * @dev Finds the winner of the current betting round.
     * The winner is the user who placed the bet closest to the actual Bitcoin price divided by 10^8.
     * The winner receives the interest earned from the Aave V2 lending pool.
     * This function can only be called after the lock-in period has expired.
     */
    function findWinner() external isBettingRoundEmpty isLockInPeriodOver {
        require(users.length > 0, "There are no users");
        uint256 target = uint256(getBitcoinPrice()) / 10 ** 8;
        uint256 closestNumber;
        address closestUser;
        uint256 minDifference = absDiff(bets[users[0]], target);

        for (uint256 i = 1; i < users.length; i++) {
            if (isSufficientBalance(users[i])) {
                uint256 difference = absDiff(bets[users[i]], target);
                if (difference < minDifference) {
                    minDifference = difference;
                    closestNumber = bets[users[i]];
                    closestUser = users[i];
                }
            }
        }

        bettingRounds[getCurrentRoundIndex()].winner = closestUser;

        // TODO: get balance of aToken from AAVE and calculate interest using it
        // uint256 aaveBalanceOfMyContract = iAToken.balanceOf((address(this)));
        // uint256 totalSupplyOfDoraToken = iDoraToken.totalSupply();
        // uint256 interest = aaveBalanceOfMyContract - totalSupplyOfDoraToken;

        // harcoded interest for now, remove later
        uint256 interest = 5 ether;

        // Mint the equivalent amount of receipt tokens to the caller
        if (interest > 0 && closestUser != address(0)) {
            mintDoraToken(closestUser, interest);
        }
        emit WinnerAnnounced(bettingRounds.length, closestUser, interest);
    }

    /**
     * @dev Places a bet in the current betting round.
     * The user provides the guessed Bitcoin price in USD and sends the corresponding amount of Ether as the bet amount.
     * Only one bet is allowed per user.
     * The bet amount is deposited into the Aave V2 lending pool and the caller receives equivalent DoraTokens.
     * Emits a BetPlaced event.
     * @param _bitcoinGuesspriceInUSD The guessed Bitcoin price in USD.
     */
    function placeBet(
        uint256 _bitcoinGuesspriceInUSD
    ) external payable isCurrentRoundOpen {
        require(_bitcoinGuesspriceInUSD > 0, "Guess price cannot be 0");

        if (bets[msg.sender] == 0) {
            users.push(msg.sender);
        }

        bets[msg.sender] = _bitcoinGuesspriceInUSD;

        // TODO: Call AAVE V2 contract's depositETH function
        // (bool success, ) = address(iAaveV2).call{value: msg.value}(
        //     abi.encodeWithSignature(
        //         "depositETH(address,uint256)",
        //         LENDING_POOL_ADDRESS,
        //         0
        //     )
        // );
        // require(success, "Deposit to Aave failed");

        // Mint the equivalent amount of receipt tokens to the caller (msg.sender)
        mintDoraToken(msg.sender, msg.value);
        emit BetPlaced(msg.sender, _bitcoinGuesspriceInUSD, msg.value);
    }

    /**
     * @dev Withdraws the user's funds from the Aave V2 lending pool.
     * The user provides the amount of funds to withdraw.
     * The corresponding DoraTokens are burned and the Ether is transferred back to the user.
     * Emits a FundsWithdrawn event.
     * @param _amount The amount of funds to withdraw.
     */
    function withdrawFunds(uint256 _amount) external {
        // TODO: call appprove function of aToken from this contract (DoraBag).
        // iAToken.approve(LENDING_POOL_ADDRESS, _amount);

        // TODO: call withdrawETH of AAVE contract from this contract (DoraBag).
        // iAaveV2.withdrawETH(LENDING_POOL_ADDRESS, _amount, address(this));

        // burn DoraTokens of caller (msg.sender)
        iDoraToken.burn(msg.sender, _amount);

        // transfer _amount of ether to caller (msg.sender)
        address payable caller = payable(msg.sender);
        caller.transfer(_amount);

        emit FundsWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Retrieves the current Bitcoin price in USD from the price feed.
     * Returns the latest round data from the price feed contract.
     */
    function getBitcoinPrice() private view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Mints the specified amount of DoraTokens to the given recipient.
     * Calls the mint function of the DoraToken contract to mint new tokens.
     * Emits a Transfer event.
     * @param _recipient The recipient of the minted DoraTokens.
     * @param _amount The amount of DoraTokens to mint.
     */
    function mintDoraToken(address _recipient, uint256 _amount) private {
        // Mint the equivalent amount of receipt tokens to the caller
        iDoraToken.mint(_recipient, _amount);
    }

    /**
     * @dev Checks if the balance of the given account is sufficient to participate in the betting.
     * Returns true if the balance is greater than 1 Ether, false otherwise.
     * @param account The account to check the balance for.
     * @return A boolean indicating if the balance is sufficient.
     */
    function isSufficientBalance(address account) private view returns (bool) {
        IDoraToken dora = IDoraToken(doraAddress);
        uint256 balance = dora.balanceOf(account);
        return balance > MIN_STAKE;
    }

    /**
     * @dev Computes the absolute difference between two numbers.
     * Returns the absolute difference between `a` and `b`.
     * @param a The first number.
     * @param b The second number.
     * @return The absolute difference.
     */
    function absDiff(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a.sub(b) : b.sub(a);
    }

    /**
     * @dev Retrieves the index of the current betting round.
     * If the current round number is 0, returns 0.
     * Otherwise, returns the current round number minus 1.
     * @return The index of the current betting round.
     */
    function getCurrentRoundIndex() private view returns (uint256) {
        return bettingRounds.length - 1;
    }

    /**
     * @dev Retrieves the address of the Aave V2 lending pool.
     * @return The address of the lending pool.
     */
    function getLendingPoolAddress() private view returns (address) {
        return lendingPoolAddressesProvider.getLendingPool();
    }

    function getBettingRoundsLength() public view returns (uint256) {
        return bettingRounds.length;
    }

    function getDoraTokenAddress() external view returns (address) {
        return doraAddress;
    }

    receive() external payable {}
    /**
     * @dev Retrieves the total supply and the balance of the Aave aToken.
     * Returns a tuple with the total supply and the balance of the aToken in the contract.
     */
    // TODO: check if we require to call getAave, if not required then remove this
    // function getAave() external view returns (uint256, uint256) {
    //     uint256 totalSupply = iAToken.totalSupply();
    //     uint256 myBalance = iAToken.balanceOf(address(this));
    //     return (totalSupply, myBalance);
    // }
}
