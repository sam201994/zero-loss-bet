// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BitcoinPrediction.sol";

contract BitcoinPredictionFactoryContract {
    address immutable BTC_USD_FEED_ADDRESS;
    address immutable AAVE_V2_ADDRESS;
    address immutable AAVE_ATOKEN_ADDRESS;
    address immutable LENDING_POOL_PROVIDER_ADDRESS;

    event ImplementationCreated(address implementationAddress);

    constructor(
        address _BTC_USD_FEED_ADDRESS,
        address _LENDING_POOL_PROVIDER_ADDRESS,
        address _AAVE_V2_ADDRESS,
        address _AAVE_ATOKEN_ADDRESS
    ) {
        BTC_USD_FEED_ADDRESS = _BTC_USD_FEED_ADDRESS;
        AAVE_V2_ADDRESS = _AAVE_V2_ADDRESS;
        AAVE_ATOKEN_ADDRESS = _AAVE_ATOKEN_ADDRESS;
        LENDING_POOL_PROVIDER_ADDRESS = _LENDING_POOL_PROVIDER_ADDRESS;
    }

    function deployImplementation(
        uint256 _bettingPeriodEndsAt,
        uint256 _lockInPeriodEndsAt,
        uint256 _stakeAmount
    ) public {
        BitcoinPrediction bitcoinPredictionInstance = new BitcoinPrediction(
            _bettingPeriodEndsAt,
            _lockInPeriodEndsAt,
            _stakeAmount,
            BTC_USD_FEED_ADDRESS,
            AAVE_V2_ADDRESS,
            AAVE_ATOKEN_ADDRESS,
            LENDING_POOL_PROVIDER_ADDRESS
        );
        bitcoinPredictionInstance.transferOwnership(msg.sender);
        emit ImplementationCreated(address(bitcoinPredictionInstance));
    }
}
