// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

//import ERC721 from openzeppelin library
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    uint public TokenCount;
    
    constructor() ERC721("Blondie NFT","BNFT") {

    }

    //allow to mint nft   ...   METADATA of nft = _tokenURI
    function mint(string memory _tokenURI) external returns(uint) {
        TokenCount++; //increase token count by 1
        _safeMint(msg.sender, TokenCount); // mint a new nft by calling internal safe func
        //msg sender = caller of this contract
        _setTokenURI(TokenCount, _tokenURI);
        return (TokenCount);
    }
}