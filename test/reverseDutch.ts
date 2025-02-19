const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const hre = require("hardhat");

async function deployContracts() {
    const ERC20Token = await hre.ethers.getContractFactory("AkpoloToken");
    const initialSupply = hre.ethers.parseUnits("1000", 18);
    const erc20Token = await ERC20Token.deploy(initialSupply);
    await erc20Token.waitForDeployment();

    const [seller, buyer, otherBuyer] = await hre.ethers.getSigners();

    const initialPrice = hre.ethers.parseEther("10");
    const duration = 3600;
    const priceDecreaseRate = hre.ethers.parseEther("0.01");
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
        it("sets correct seller", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);
            expect(await auctionSwap.seller()).to.equal(seller.address);
        });

        it("starts with auction inactive", async function () {
            const { auctionSwap } = await loadFixture(deployContracts);
            expect(await auctionSwap.isAuctionActive()).to.be.false;
        });
    });

    describe("Auction Start", function () {
        it("allows seller to start auction", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);
            await auctionSwap.connect(seller).startAuction();
            expect(await auctionSwap.isAuctionActive()).to.be.true;
        });

        it("rejects non-seller start", async function () {
            const { auctionSwap, buyer } = await loadFixture(deployContracts);
            await expect(auctionSwap.connect(buyer).startAuction()).to.be.revertedWith("Only seller can start auction");
        });
    });

    describe("Current Price", function () {
        it("calculates correctly", async function () {
            const { auctionSwap, seller } = await loadFixture(deployContracts);
            await auctionSwap.connect(seller).startAuction();
            await hre.ethers.provider.send("evm_increaseTime", [10]);
            await hre.ethers.provider.send("evm_mine", []);
            const initialPrice = await auctionSwap.initialPrice();
            const priceDecreaseRate = await auctionSwap.priceDecreaseRate();
            const expectedPrice = initialPrice - (priceDecreaseRate * BigInt(10));
            expect(await auctionSwap.getCurrentPrice()).to.equal(expectedPrice);
        });
    });

    describe("Buy Tokens", function () {
        it("allows purchase at current price", async function () {
            const { auctionSwap, erc20Token, seller, buyer } = await loadFixture(deployContracts);
            await auctionSwap.connect(seller).startAuction();
            await hre.ethers.provider.send("evm_increaseTime", [500]);
            await hre.ethers.provider.send("evm_mine", []);
            await auctionSwap.connect(buyer).buyTokens();
            expect(await auctionSwap.buyer()).to.equal(buyer.address);
            expect(await auctionSwap.isAuctionActive()).to.be.false;
            expect(await erc20Token.balanceOf(buyer.address)).to.equal(hre.ethers.parseUnits("1000", 18));
        });

        it("rejects purchase if auction not active", async function () {
            const { auctionSwap, buyer } = await loadFixture(deployContracts);
            await expect(auctionSwap.connect(buyer).buyTokens()).to.be.revertedWith("Auction not active");
        });
    });
});
