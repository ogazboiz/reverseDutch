const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const hre = require("hardhat");

// Helper function to deploy contracts
async function deployContracts() {
    // Deploy ERC20 Token
    const ERC20Token = await hre.ethers.getContractFactory("AkpoloToken");
    const initialSupply = hre.ethers.parseUnits("1000", 18); // 1000 tokens
    const erc20Token = await ERC20Token.deploy(initialSupply);
    await erc20Token.waitForDeployment();

    // Get signers
    const [seller, buyer, otherBuyer] = await hre.ethers.getSigners();

    // Approve tokens for transfer to the auction contract
    // await erc20Token.connect(seller).approve(await auctionSwap.getAddress(), initialSupply);

    // Deploy ReverseDutchAuctionSwap Contract
    const initialPrice = hre.ethers.parseEther("10"); // Initial price: 10 Ether
    const duration = 3600; // Auction duration: 1 hour
    const priceDecreaseRate = hre.ethers.parseEther("0.01"); // Price decreases by 0.01 Ether per second
    const ReverseDutchAuctionSwap = await hre.ethers.getContractFactory("ReverseDutchAuctionSwap");
    const auctionSwap = await ReverseDutchAuctionSwap.deploy(
        await erc20Token.getAddress(),
        initialPrice,
        duration,
        priceDecreaseRate
    );
    await auctionSwap.waitForDeployment();
    await erc20Token.connect(seller).approve(await auctionSwap.getAddress(), initialSupply);


    return { auctionSwap, erc20Token, seller, buyer, otherBuyer };
}

describe("ReverseDutchAuctionSwap", function () {
    describe("Deployment", function () {
        it("should set the correct seller address during deployment", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);
            expect(await auctionSwap.seller()).to.equal(seller.address);
        });

        it("should start with the auction inactive", async function () {
            const { auctionSwap } = await loadFixture(deployContracts);
            expect(await auctionSwap.isAuctionActive()).to.be.false;
        });
    });

    describe("Auction Start", function () {
        it("should allow the seller to start the auction", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);

            // Start the auction
            await auctionSwap.connect(seller).startAuction();

            // Verify auction state
            expect(await auctionSwap.isAuctionActive()).to.be.true;
            expect((await auctionSwap.startTime()).toString()).not.to.equal("0");
        });

        it("should reject auction start from non-seller accounts", async function () {
            const { auctionSwap, buyer } = await loadFixture(deployContracts);

            // Attempt to start the auction as a non-seller
            await expect(auctionSwap.connect(buyer).startAuction())
                .to.be.revertedWith("Only seller can start auction");
        });
    });

    describe("Current Price", function () {
        it("should calculate the current price correctly", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);

            // Start the auction
            await auctionSwap.connect(seller).startAuction();

            // Wait for 10 seconds
            const timeElapsed = 10;
            await hre.ethers.provider.send("evm_increaseTime", [timeElapsed]);
            await hre.ethers.provider.send("evm_mine", []);

            // Get the current price
            const initialPrice = await auctionSwap.initialPrice();
            const priceDecreaseRate = await auctionSwap.priceDecreaseRate();
            const expectedPrice = initialPrice - (priceDecreaseRate * BigInt(timeElapsed));
            const currentPrice = await auctionSwap.getCurrentPrice();

            // Verify the current price
            expect(currentPrice.toString()).to.equal(expectedPrice.toString());
        });

        it("should return 0 if the auction has ended", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);

            // Start the auction
            await auctionSwap.connect(seller).startAuction();

            // Move time forward to after the auction ends
            const duration = await auctionSwap.duration();
            await hre.ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
            await hre.ethers.provider.send("evm_mine", []);

            // Get the current price
            const currentPrice = await auctionSwap.getCurrentPrice();
            expect(currentPrice.toString()).to.equal("0");
        });
    });

    describe("Buy Tokens", function () {
        it("should allow buyers to purchase tokens at the current price", async function () {
            const { auctionSwap, erc20Token, seller, buyer } = await loadFixture(deployContracts);

            // Start the auction
            await auctionSwap.connect(seller).startAuction();

            // Wait for 500 seconds
            const timeElapsed = 500;
            await hre.ethers.provider.send("evm_increaseTime", [timeElapsed]);
            await hre.ethers.provider.send("evm_mine", []);

            // Buy tokens
            await auctionSwap.connect(buyer).buyTokens();

            // Verify auction state
            expect(await auctionSwap.buyer()).to.equal(buyer.address);
            expect(await auctionSwap.isAuctionActive()).to.be.false;

            // Verify token transfer
            const sellerBalance = await erc20Token.balanceOf(seller.address);
            const buyerBalance = await erc20Token.balanceOf(buyer.address);
            expect(sellerBalance.toString()).to.equal("0"); // Seller's balance should be 0
            expect(buyerBalance.toString()).to.equal(hre.ethers.parseUnits("1000", 18).toString()); // Buyer receives all tokens
        });

        it("should reject token purchases if the auction is not active", async function () {
            const { auctionSwap, buyer } = await loadFixture(deployContracts);

            // Attempt to buy tokens without starting the auction
            await expect(auctionSwap.connect(buyer).buyTokens())
                .to.be.revertedWith("Auction not active");
        });

        it("should reject token purchases if the auction has ended", async function () {
            const { auctionSwap, seller, buyer } = await loadFixture(deployContracts);
        
            // Start the auction
            await auctionSwap.connect(seller).startAuction();
        
            // Move time forward to after the auction ends
            const duration = await auctionSwap.duration();
            await hre.ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
            await hre.ethers.provider.send("evm_mine", []);
        
            // Attempt to buy tokens after the auction ends
            await expect(auctionSwap.connect(buyer).buyTokens())
                .to.be.revertedWith("Auction ended"); // Updated revert reason
        });

        it("should allow only one buyer per auction", async function () {
            const { auctionSwap, seller, buyer, otherBuyer } = await loadFixture(deployContracts);

            // Start the auction
            await auctionSwap.connect(seller).startAuction();

            // Wait for 500 seconds
            const timeElapsed = 500;
            await hre.ethers.provider.send("evm_increaseTime", [timeElapsed]);
            await hre.ethers.provider.send("evm_mine", []);

            // First buyer purchases tokens
            await auctionSwap.connect(buyer).buyTokens();

            // Attempt to buy tokens as another buyer
            await expect(auctionSwap.connect(otherBuyer).buyTokens())
                .to.be.revertedWith("Auction already has a buyer");
        });

        it("should handle no buyer before auction ends", async function () {
            const { auctionSwap, seller, buyer, erc20Token } = await loadFixture(deployContracts);

            // Start the auction
            await auctionSwap.connect(seller).startAuction();

            // Move time forward to after the auction ends
            const duration = await auctionSwap.duration();
            await hre.ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
            await hre.ethers.provider.send("evm_mine", []);

            // Attempt to buy tokens after the auction ends
            await expect(auctionSwap.connect(buyer).buyTokens())
                .to.be.revertedWith("Auction not active");

            // Verify no tokens were transferred
            const sellerBalance = await erc20Token.balanceOf(seller.address);
            const buyerBalance = await erc20Token.balanceOf(buyer.address);
            expect(sellerBalance.toString()).to.equal(hre.ethers.parseUnits("1000", 18).toString()); // Seller retains all tokens
            expect(buyerBalance.toString()).to.equal("0"); // Buyer receives no tokens
        });
    });
});