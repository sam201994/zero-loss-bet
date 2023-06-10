// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

import "./interfaces/IAaveV2.sol";
import "./interfaces/ILendingPoolAddressesProvider.sol";

import "./Ticket.sol";

contract BitcoinPrediction is Ticket {
    using SafeMath for uint256;

    // Interfaces
    AggregatorV3Interface private priceFeed;
    IAaveV2 private iAaveV2;
    IERC20 private iAToken;
    ILendingPoolAddressesProvider private lendingPoolAddressesProvider;

    // Constants
    uint256 immutable bettingPeriodEndsAt;
    uint256 immutable lockInPeriodEndsAt;
    uint256 immutable stakeAmount;

    address LENDING_POOL_ADDRESS;

    uint256 public winnerTicket;
    uint256 public winnerGuess;

    mapping(uint256 => uint256) bets;

    event BetPlaced(address indexed user, uint256 guessPrice, uint256 tokenId);

    constructor(
        uint256 _bettingPeriodEndsAt,
        uint256 _lockInPeriodEndsAt,
        uint256 _stakeAmount,
        address _BTC_USD_FEED_ADDRESS,
        address _AAVE_V2_ADDRESS,
        address _AAVE_ATOKEN_ADDRESS,
        address _LENDING_POOL_PROVIDER_ADDRESS
    ) {
        bettingPeriodEndsAt = _bettingPeriodEndsAt;
        lockInPeriodEndsAt = _lockInPeriodEndsAt;
        stakeAmount = _stakeAmount;

        priceFeed = AggregatorV3Interface(_BTC_USD_FEED_ADDRESS);
        iAaveV2 = IAaveV2(_AAVE_V2_ADDRESS);
        iAToken = IERC20(_AAVE_ATOKEN_ADDRESS);
        lendingPoolAddressesProvider = ILendingPoolAddressesProvider(_LENDING_POOL_PROVIDER_ADDRESS);
        LENDING_POOL_ADDRESS = getLendingPoolAddress();
    }

    function getBitcoinPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    function placeBet(uint256 _bitcoinGuesspriceInUSD) external payable {
        require(block.timestamp < bettingPeriodEndsAt, "bet staking period has ended");
        require(_bitcoinGuesspriceInUSD > 0, "Guess price cannot be 0");
        require(msg.value == stakeAmount, "invalid stake amount");

        uint256 tokenId = super.mint(msg.sender);
        bets[tokenId] = _bitcoinGuesspriceInUSD;

        iAaveV2.depositETH{ value: msg.value }(LENDING_POOL_ADDRESS, address(this), 0);
        emit BetPlaced(msg.sender, _bitcoinGuesspriceInUSD, tokenId);
    }

    function withdrawFunds(uint256 tokenId) external {
        require(
            block.timestamp < bettingPeriodEndsAt || block.timestamp > lockInPeriodEndsAt,
            "cannot withdraw funds in lockin preiod"
        );
        require(super.ownerOf(tokenId) == msg.sender, "this ticket does not belong to caller");

        uint256 amount = stakeAmount;
        IAaveV2 iAaveV2Temp = iAaveV2;

        if (tokenId == winnerTicket) {
            uint256 interest = _calculateInterest();
            amount += interest;
        }

        // call appprove function of aToken from this contract (DoraBag).
        iAToken.approve(address(iAaveV2Temp), amount);

        // call withdrawETH of AAVE contract from this contract (DoraBag).
        iAaveV2Temp.withdrawETH(LENDING_POOL_ADDRESS, amount, address(this));

        super._burn(tokenId);
        bets[tokenId] = 0;

        // transfer amount of ether to caller (msg.sender)
        address payable caller = payable(msg.sender);
        caller.transfer(amount);
    }

    function findWinner() external {
        require(block.timestamp > lockInPeriodEndsAt, "bet has not ended");

        uint256 currentTokenId = getCurrentTokenId();
        require(currentTokenId > 0, "There are no users");

        uint256 target = uint256(getBitcoinPrice()).div(10 ** 8);

        uint256 closestNumber;
        uint256 closestTicketId;

        uint256 minDifference = absDiff(bets[0], target);

        for (uint256 i = 1; i <= currentTokenId; i++) {
            uint256 currentUserBet = bets[i];
            if (currentUserBet != 0) {
                uint256 difference = absDiff(currentUserBet, target);
                if (difference < minDifference) {
                    minDifference = difference;
                    closestNumber = currentUserBet;
                    closestTicketId = i;
                }
            }
        }

        winnerTicket = closestTicketId;
        winnerGuess = closestNumber;
    }

    function _calculateInterest() internal view returns (uint256) {
        uint256 aaveBalanceOfMyContract = iAToken.balanceOf(address(this));

        uint256 totalSupplyOfTickets = super.totalSupply();

        uint256 totalTicketValue = (totalSupplyOfTickets * stakeAmount);

        uint256 interest = aaveBalanceOfMyContract - totalTicketValue;

        return interest;
    }

    function absDiff(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a.sub(b) : b.sub(a);
    }

    function getLendingPoolAddress() private view returns (address) {
        return lendingPoolAddressesProvider.getLendingPool();
    }

    receive() external payable {}
}
