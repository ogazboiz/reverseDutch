const { ethers } = require("hardhat");

async function main() {
    const [seller] = await ethers.getSigners();

    // i deploy ERC20 Token
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    const token = await ERC20Token.deploy( ethers.parseUnits("1000", 18)); // 1000 tokens
    // await token.deployed();
    console.log("ERC20 Token deployed to:", token.target);

    
    const Auction = await ethers.getContractFactory("ReverseDutchAuctionSwap");
    const auction = await Auction.deploy(
        token.target, 
        // ethers.parseEther("100"), 
        ethers.parseUnits("100", 18),
        3600, 
        // ethers.parseEther("0.01") 
        ethers.parseUnits("0.01", 18),
    );
    // await auction.deployed();
    console.log("Auction deployed to:", auction.target);

    // Approve 
    await token.connect(seller).approve(auction.target,  ethers.parseUnits("1000", 18));
    console.log("Approved auction to spend seller's tokens");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});