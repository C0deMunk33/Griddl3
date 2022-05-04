const Music_Core = artifacts.require("Music_Core");
const Griddl3_DAO_Core = artifacts.require("Griddl3_DAO_Core");
const Test_Token = artifacts.require("Test_Token");

contract("Music_Core", accounts => {
  it("should run through things", async () => {
    let music_core_instance = await Music_Core.deployed();
    let ipfs_cid = "QmXjJtHHc6q39uhMikUy9YbRwJMZnnzvfJi4LJLxW28Erb";

    // create master
    let master_receipt = await music_core_instance.create_master(ipfs_cid, {from: accounts[0]})
    let master_token_id = master_receipt.logs[1].args.token_id
    let ownership_token_id = master_receipt.logs[1].args.ownership_token_id

    // send half ownership
    let ownership_transfer_receipt = await music_core_instance
      .safeTransferFrom(accounts[0], accounts[1], ownership_token_id, "5000", "0x00", {from: accounts[0]})


      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
      console.log(master_token_id.toString())
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

    // create sale
    let create_sale_receipt = await music_core_instance
      .create_sale("test", [master_token_id.toString()], [1], "1000000000000000000", 5);

    let sale_id = create_sale_receipt.logs[0].args.sale_id

    // buy
    let buy_receipt = await music_core_instance.buy(sale_id, {from: accounts[2], value: "1000000000000000000"})

    // send half ownership
    let ownership_transfer_receipt_2 = await music_core_instance
      .safeTransferFrom(accounts[0], accounts[5], ownership_token_id, "5000", "0x00", {from: accounts[0]})
    await music_core_instance.calc_owed(accounts[1], ownership_token_id)

    let owed_0 = await music_core_instance.get_owed(accounts[0])
    let owed_1 = await music_core_instance.get_owed(accounts[1])

    console.log(owed_0.toString())
    console.log(owed_1.toString())
    console.log("bal: " + (await web3.eth.getBalance(accounts[0])).toString())
    let withdraw_owed_receipt = await music_core_instance.withdraw_owed({from:accounts[0]});
    let owed_0_2 = await music_core_instance.get_owed(accounts[0])
    console.log(owed_0_2.toString())

    console.log("bal: " + (await web3.eth.getBalance(accounts[0])).toString())

  });
});

//invite artist
//boot artist
//
contract("Griddl3_DAO_Core", accounts => {
  it("should test the dao?", async() => {
      let music_core_instance = await Music_Core.deployed();
      let griddl3_instance = await Griddl3_DAO_Core.deployed();
      let test_token_instance = await Test_Token.deployed();
      let ipfs_cid = "QmXjJtHHc6q39uhMikUy9YbRwJMZnnzvfJi4LJLxW28Edb";

      // create master
      let master_receipt = await music_core_instance.create_master(ipfs_cid, {from: accounts[0]})
      let master_token_id = master_receipt.logs[1].args.token_id
      let ownership_token_id = master_receipt.logs[1].args.ownership_token_id
      console.log(music_core_instance.address)
      //invite artist, request 100 of master_token_id
      await test_token_instance.mint(griddl3_instance.address, "1000")
      await griddl3_instance.invite_artist(accounts[0], music_core_instance.address, [ownership_token_id], [1], 1, "1000");
      await music_core_instance.setApprovalForAll(griddl3_instance.address, true);
      await griddl3_instance.join_dao();

      await griddl3_instance.leave_dao();
  })
})
