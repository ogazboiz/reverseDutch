// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin's ERC20 implementation
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AkpoloToken is ERC20 {
    // Constructor to initialize the token
    constructor(uint256 initialSupply) ERC20("AkpoloToken", "ATK") {
        // Mint the initial supply to the deployer
        _mint(msg.sender, initialSupply);
    }
}