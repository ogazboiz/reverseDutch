# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

```

this are my interaction below


ERC20 Token deployed to: 0xD4752aaC818BCa52a9dcE957B4ad1757d4f1B96b
Auction deployed to: 0xC8EEd3F874F9Bd35457ec55956A03c5D82B36866
Approved auction to spend seller's tokens
Auction started
Waiting for some minutes...
Current Price after 1 minutes: 99.66 tokens
Waiting for another minutes...
Current Price after 20 minutes: 99.06 tokens
Buyer attempting to buy tokens...
Buyer 0x3210607AC8126770E850957cE7373ee7e59e3A29 purchased tokens at price: 99.06
Auction completed.

```