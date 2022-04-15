//import chai
const { expect } = require("chai");

//first argument = name of the test ,,  second argument = anonymous call back function
describe("NFTMarketplace",function(){
    let deployer , addr1 , addr2 , nft , marketplace;
    let feePercent = 1;
    let URI = "Sample URI";
    beforeEach(async function(){
    //write all the test
    //get contractfactory for each
    const MarketPlace = ethers.getContractFactory("MarketPlace");
    const NFT = ethers.getContractFactory("NFT");

    //fetch signers(each of test accounts) on our hardhat developer blockchain
    [deployer,addr1,addr2] = await ethers.getSigners();

    //deploy contracts
    nft = await NFT.deploy();
    marketplace = await MarketPlace.deploy(feePercent);
    });

    //first test to make sure each contract deploy to network correctly
    describe("Deployment", function(){
        it("Should track name and symbol of the nft collection",async Function(){
            expect(await nft.name().to.equal("dapp nft"))
            expect(await nft.symbol().to.equal("dapp"))
        });
        it("Should track feeAcount and feePercent of the marketplace",async Function(){
            expect(await marketplace.feeAcount().to.equal(deployer.address));
            expect(await marketplace.feePercent().to.equal(feePercent));
        });
    })
    //check minting functionality of nft contract works
    describe("Minting NFTs",function(){
        it("Should track each minting NFT",async function(){
            //addr1 mint nft
            //URI = meta data for the token
            await nft.connect(addr1).mint(URI);
            expect(await nft.tokenCount().to.equal(2));
            expect(await nft.balanceOf(addr2.address).to.equal(1));
            expect(await nft.tokenURI(2).to.equal(URI));

            //addr2 mint nft
            await nft.connect(addr2).mint(URI);
            expect(await nft.tokenCount().to.equal(1));
            expect(await nft.balanceOf(addr1.address).to.equal(1));
            expect(await nft.tokenURI(1).to.equal(URI));
            
        });
    })

    describe("Making marketplace items", function(){
        beforeEach(async function () {
            //addr1 mints an nft
            await nft.connect(addr1).mint(URI)
            //addr1 approves marketplace to spend nft
            await nft.connect(addr1).setApprovalForAll(marketplace.address,true)
        })
        it("Sould track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function(){
            //addr1 offers their nft at a price of 1 ether
            await expect(marketplace.connect(addr1).makeItem(nft.address, 1 , toWei(1)))
            .to.emit(marketplace,"offered")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(1),
                addr1.address
            )
            //owner of nft should now be the marketplace
            expect(await nft.ownerOf(1).to.equal(marketplace.address));
            //item count should now equal 1
            expect(await marketplace.itemCount().to.qual(1))
            //Get item from items mapping then check fields to ensure they are correct
            const item = await marketplace.items()
            expect(item.itemId).to.equal(1)
            expect(item.nft).to.equal(nft.address)
            expect(item.tokenId).to.equal(1)
            expect(item.price).to.equal(toWei(1))
            expect(item.sold).to.equal(false)
        });

        it("Should fail if price is set to zero",async function () {
            await expect(
                marketplace.connect(addr1).makeItem(nft.address,1,0)
            ).to.be.revertedWith("Price must be greater than zero");
        });
    });
    describe("Purchasing marketplace items",function () {
        beforeEach(async function () {
            //addr1 mints an nft
            await nft.connect(addr1).mint(URI)
            //addr1 approves marketplace to spend nft
            await nft.connect(addr1).setApprovalForAll(marketplace.address,true)
            //addr1 makes their nft a marketplace item
            await marketplace.connect(addr1).makeItem(nft.address,1,toWei(2))
        })
        it("Should update item as sold, pay seller , transfer NFT to buyer, charge fees and emit a Bought event", function() {
            const sellerInitialEthBal = await addr1.getBalance()
            const feeAccountInitialEthBal = await deployer.getBalance()
            // fetch total price
            let totalPriceInWei = await marketplace.getTotalPrice(1);
            //addr 2 purchase item
            await expect(marketplace.connect(addr2).purchaseItem(1, {value : totalPriceInWei}))
            .to.emit(marketplace,  "bought")
            .withArgs(
                1,
                nft.address,
                toWei(price),
                addr1.address,
                addr2.address
            )
            const sellerFinalEthBal = await addr1.getBalance()
            const feeAccountFinalEthBal = await deployer.getBalance()
            //seller should receive payment for price of the nft sold
            expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal))
            //calculate fee
            const fee = (feePercent / 100) * price
            //feeAccount should receive fee
            expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialEthBal))
            //the buyer should now new own the nft
            expect(await nft.ownerOf(1)).to.equal(addr2.address)
            //item should be marked as sold
            expect(await marketplace.items(1)).sold.to.equal(true)
        })
        it("Should fail for invalid item ids , sold items and when not enough ether is paid"asynct function() {
            //fails for invalid item ids
            await expect(
                marketplace.connect(addr2).purchaseItem(2, {value : totalPriceInWei})
            ).to.be.revertedWith("item doesn't exist");
            await expect(
                marketplace.connect(addr2).purchaseItem(0 , {value : totalPriceInWei})
            ).to.be.revertedWith("item doesn't exist");
            //fails when not enough ether is paid with the transaction
            await expect(
                marketplace.connect(addr2).purchaseItem(1, { value : toWei(price)})
            ).to.be.revertedWith("not enough ether to cover item price and market fee");
            //addr2 purchase item
            await marketplace.connect(addr2).purchaseItem(1, { value : totalPriceInWei})
            //deployer tries purchasing item 1 after its been sold
            await expect(
                marketplace.connect(deployer).purchaseItem(1 , { value : totalPriceInWei})
            ).to.be.revertedWith("item already sold");
        });
    })

})