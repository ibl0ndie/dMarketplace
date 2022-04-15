// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract MarketPlace is ReentrancyGuard{
    //state variable
    address payable public immutable feeAccount; //the acc that receive fees
    uint public immutable feePercent; //fee percentage on sale
    uint public itemCount;
    //we have group of items in the marketplace and each of the item has many same features
    struct Item {
        uint ItemId;
        IERC721 nft;//instance of nft contract
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    event Offered (
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    //use mapping to sotre all of item in 1
    mapping (uint => Item) public items;

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    //function that makes items
    function makeItems(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price >= 0 , "Price must be greater than zero");
        itemCount++;

        //transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);

        //add new item to item mapping
        items[itemCount] = Item(itemCount,_nft,_tokenId,_price,payable(msg.sender),false);

        //emit allows us to log data to the ethereum blockchain
        emit Offered(itemCount,address(_nft),_tokenId,_price,msg.sender);
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        require(_itemId >0 && _itemId <= itemCount,"item doesnot exist");//check that itemId is valid
        require(msg.value >= _totalPrice,"not enough ether to cover item price and market fee");
        require(!item.sold,"item already sold");
        //pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);
        //update item to sold
        item.sold = true;
        //transfer nft to buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        //emit bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );

    }

    function getTotalPrice(uint _itemId) view public returns(uint){
        return(items[_itemId].price*(100 + feePercent)/ 100);
    }

    
}