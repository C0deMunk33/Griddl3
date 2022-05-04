// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "./Music_Core.sol";
import "./Locked_ERC20.sol";
import "./IERC1155Receiver.sol";

contract Griddl3_DAO_Core is Locked_ERC20, IERC1155Receiver {
  address immutable wxDai_address;
  struct artist_invitation {
    uint256[] ownership_token_ids;
    uint256[] token_amounts;
    uint256 dao_coin_offer;
    bool accepted;
    bool created;
    address artist_token;//Music_Core
    uint256 signing_bonus; // wxDai: 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d
  }
  mapping(address=> artist_invitation) invitations;

  uint256 locked_dao_offers = 0;
  uint256 locked_wxDai = 0;

  constructor(string memory name_, string memory symbol_, address wxdai_) Locked_ERC20(name_, symbol_) {
    _mint(address(this), 1000000);
    wxDai_address = wxdai_;
  }

  function onERC1155Received(
      address operator,
      address from,
      uint256 id,
      uint256 value,
      bytes calldata data
  ) external override returns (bytes4){
    return 0xf23a6e61;
  }
  function onERC1155BatchReceived(
      address operator,
      address from,
      uint256[] calldata ids,
      uint256[] calldata values,
      bytes calldata data
  ) external override returns (bytes4) {
    return 0xbc197c81;
  }


  function invite_artist(address artist, address artist_token, uint256[] memory ownership_token_ids, uint256[] memory requested_token_amounts, uint256 dao_coin_offer, uint256 signing_bonus) public {
    //TODO add vote
    require(balanceOf(address(this)) >= locked_dao_offers + dao_coin_offer, "not enough dao tokens");
    require(IERC20(wxDai_address).balanceOf(address(this)) >= locked_wxDai + signing_bonus, "not enough signing bonus");
    require(!invitations[artist].created, "this was already created");
    locked_wxDai += signing_bonus;
    locked_dao_offers += dao_coin_offer;
    invitations[artist] = artist_invitation(ownership_token_ids, requested_token_amounts, dao_coin_offer, false, true, artist_token, signing_bonus);

  }
  function remove_invitation(address artist) public {
    //TODO add vote
    require(invitations[artist].created && !invitations[artist].accepted);
    locked_wxDai -= invitations[artist].signing_bonus;
    locked_dao_offers -= invitations[artist].dao_coin_offer;
    delete(invitations[artist]);
  }
  function remove_artist(address artist) public {
    //TODO add vote
    require(invitations[artist].created && invitations[artist].accepted);
    _transfer(artist, address(this), invitations[artist].dao_coin_offer);
    Music_Core(invitations[artist].artist_token).safeBatchTransferFrom(address(this), msg.sender, invitations[artist].ownership_token_ids,  invitations[artist].token_amounts, "0x00");
    delete(invitations[artist]);
  }

  function award_bonus(address target, uint256 amount) public {
    //TODO add vote
    require(IERC20(wxDai_address).balanceOf(address(this)) >= locked_wxDai + amount);
    IERC20(wxDai_address).transfer(target, amount);
  }

  function award_dao_coins(address target, uint256 amount) public {
    //TODO add vote
    require(balanceOf(address(this)) >= locked_dao_offers + amount);
    _transfer(address(this), target, amount);
  }

  function leave_dao() public {
    require(invitations[msg.sender].created && invitations[msg.sender].accepted);

    _transfer(msg.sender, address(this), invitations[msg.sender].dao_coin_offer);

    Music_Core(invitations[msg.sender].artist_token).safeBatchTransferFrom(address(this), msg.sender,
            invitations[msg.sender].ownership_token_ids,  invitations[msg.sender].token_amounts, "0x00");
    delete(invitations[msg.sender]);
  }

  // must run appove first
  function join_dao() public {
    require(!invitations[msg.sender].accepted && invitations[msg.sender].created);
    // being accepted MUST come before any assignments or transfers
    invitations[msg.sender].accepted = true;

    locked_wxDai -= invitations[msg.sender].signing_bonus;
    locked_dao_offers -= invitations[msg.sender].dao_coin_offer;

    IERC20(wxDai_address).transfer(msg.sender, invitations[msg.sender].signing_bonus);
    _transfer(address(this), msg.sender, invitations[msg.sender].dao_coin_offer);
    Music_Core(invitations[msg.sender].artist_token).safeBatchTransferFrom(msg.sender,address(this), invitations[msg.sender].ownership_token_ids,
            invitations[msg.sender].token_amounts, "0x00");
  }

  function add_stake_ownership_tokens(uint256[] memory ownership_token_ids, uint256[] memory token_amounts) public {
    require(ownership_token_ids.length == token_amounts.length);
    require(invitations[msg.sender].accepted && invitations[msg.sender].created);
    Music_Core(invitations[msg.sender].artist_token).safeBatchTransferFrom(msg.sender, address(this), invitations[msg.sender].ownership_token_ids,
            invitations[msg.sender].token_amounts, "0x00");

    for(uint8 token_idx = 0; token_idx < ownership_token_ids.length; token_idx++){
      invitations[msg.sender].ownership_token_ids.push(ownership_token_ids[token_idx]);
      invitations[msg.sender].token_amounts.push(token_amounts[token_idx]);
    }

  }

  function claim_royalties(uint256[] memory ownership_token_ids) public {
    for(uint8 token_idx = 0; token_idx < ownership_token_ids.length; token_idx++){
      Music_Core(invitations[msg.sender].artist_token).calc_owed(address(this), ownership_token_ids[token_idx]);
    }

    Music_Core(invitations[msg.sender].artist_token).withdraw_owed();
  }


}
