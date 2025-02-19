import { ethers } from "hardhat";

async function main() {
    const [seller, buyer] = await ethers.getSigners();

    // Deploy ERC20 Token
    const ERC20Token = await ethers.getContractFactory("AkpoloToken");
    const token = await ERC20Token.deploy(ethers.parseUnits("1000", 18)); // 1000 tokens
    await token.waitForDeployment();
    console.log("ERC20 Token deployed to:", await token.getAddress());

    // Deploy Auction Contract
    const Auction = await ethers.getContractFactory("ReverseDutchAuctionSwap");
    const auction = await Auction.deploy(
        await token.getAddress(),
        ethers.parseUnits("100", 18), 
        3600, // 1 hour
        ethers.parseUnits("0.01", 18) 
    );
    await auction.waitForDeployment();
    console.log("Auction deployed to:", await auction.getAddress());

    // Approve Auction Contract to spend seller's tokens
    await token.connect(seller).approve(await auction.getAddress(), ethers.parseUnits("1000", 18));
    console.log("Approved auction to spend seller's tokens");

    // Start Auction
    let tx = await auction.connect(seller).startAuction();
    await tx.wait();
    console.log("Auction started");

    // Wait for 10 minutes (simulate time passage)
    console.log("Waiting for some minutes...");
    await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 500));

    // Get Current Price after 10 minutes
    let currentPrice = await auction.getCurrentPrice();
    console.log("Current Price after 1 minutes:", ethers.formatUnits(currentPrice, 18), "tokens");

    // Wait for another 10 minutes
    console.log("Waiting for another minutes...");
    await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000));

    // Get Current Price after 20 minutes
    currentPrice = await auction.getCurrentPrice();
    console.log("Current Price after 20 minutes:", ethers.formatUnits(currentPrice, 18), "tokens");

    // Buyer Buys Tokens
    console.log("Buyer attempting to buy tokens...");
    tx = await auction.connect(buyer).buyTokens();
    await tx.wait();
    console.log(`Buyer ${buyer.address} purchased tokens at price:`, ethers.formatUnits(currentPrice, 18));

    console.log("Auction completed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
