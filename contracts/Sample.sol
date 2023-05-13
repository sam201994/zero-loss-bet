// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILendingPoolAddressesProvider {
    function getLendingPool() external view returns (address);
}

interface AToken {
    function balanceOf(address user) external view returns (uint256);
}

contract AaveBalance {
    AToken public aToken;

    constructor() {
        aToken = AToken(0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5);
    }

    function getBalance(address user) external view returns (uint256) {
        return aToken.balanceOf(user);
    }

    function getLendingPoolAddress() private view returns (address) {
        ILendingPoolAddressesProvider lendingPoolAddressesProvider = ILendingPoolAddressesProvider(
                0x5E52dEc931FFb32f609681B8438A51c675cc232d
            );

        return lendingPoolAddressesProvider.getLendingPool();
    }
}
