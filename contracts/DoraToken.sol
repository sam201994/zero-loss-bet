// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title DoraToken
 * @dev A simple ERC20 token contract for DoraToken.
 * The contract provides functionality to mint and burn tokens.
 */
contract DoraToken is ERC20("DoraToken", "DORA"), Ownable {
    /**
     * @dev Mints new DoraTokens and assigns them to the specified address.
     * Only the contract owner can call this function.
     * Emits a Transfer event.
     * @param toAddress The address to receive the minted DoraTokens.
     * @param amount The amount of DoraTokens to mint.
     */
    function mint(address toAddress, uint256 amount) public onlyOwner {
        _mint(toAddress, amount);
    }

    /**
     * @dev Burns a specific amount of DoraTokens from the specified address.
     * Only the contract owner can call this function.
     * Emits a Transfer event.
     * @param account The address from which to burn DoraTokens.
     * @param amount The amount of DoraTokens to burn.
     */
    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }
}
