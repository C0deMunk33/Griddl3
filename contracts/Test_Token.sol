// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;


import "./ERC20.sol";

contract Test_Token is ERC20 {
  constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_){}

  function mint(address target, uint256 amount) public  {
    _mint(target, amount);
  }
}
