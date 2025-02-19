// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin's ERC20 implementation
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ReverseDutchAuctionSwap {
    // State variables
    address public seller; 
    IERC20 public token; 
    uint256 public initialPrice; 
    uint256 public startTime; 
    uint256 public duration; 
    uint256 public priceDecreaseRate; 
    bool public isAuctionActive; 
    address public buyer; 

    // Events
    event AuctionStarted(uint256 initialPrice, uint256 duration);
    event AuctionEnded(address buyer, uint256 finalPrice);

    // Constructor
    constructor(
        address _tokenAddress,
        uint256 _initialPrice,
        uint256 _duration,
        uint256 _priceDecreaseRate
    ) {
        seller = msg.sender; 
        token = IERC20(_tokenAddress);
        initialPrice = _initialPrice; 
        duration = _duration; 
        priceDecreaseRate = _priceDecreaseRate;
    }

    // Start the auction
    function startAuction() external {
        require(msg.sender == seller, "Only seller can start auction");
        require(!isAuctionActive, "Auction already active");
        startTime = block.timestamp; 
        isAuctionActive = true;
        emit AuctionStarted(initialPrice, duration);
    }

    // Get the current price
    function getCurrentPrice() public view returns (uint256) {
        require(isAuctionActive, "Auction not active");
        uint256 elapsedTime = block.timestamp - startTime; 
        if (elapsedTime >= duration) return 0; 
        uint256 priceDecrease = elapsedTime * priceDecreaseRate; 
        return initialPrice - priceDecrease; 
    }

    // Buy tokens at the current price
    function buyTokens() external {
        require(isAuctionActive, "Auction not active");
        require(buyer == address(0), "Auction already has a buyer");

        uint256 currentPrice = getCurrentPrice(); 
        require(currentPrice > 0, "Auction ended");

        buyer = msg.sender;
        isAuctionActive = false; 

        // Transfer tokens from seller to buyer
        token.transferFrom(seller, buyer, token.balanceOf(seller));

        emit AuctionEnded(buyer, currentPrice);
    }
}