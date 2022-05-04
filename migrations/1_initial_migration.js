const Migrations = artifacts.require("Migrations");
const Music_Core = artifacts.require("Music_Core");

const Test_Token = artifacts.require("Test_Token")
const Griddl3_DAO_Core = artifacts.require("Griddl3_DAO_Core");

module.exports = async function (deployer) {
  deployer.deploy(Migrations);
  await deployer.deploy(Music_Core, "test.com");
  await deployer.deploy(Test_Token, "tst", "tst");


  let music_core_instance = await Music_Core.deployed();
  let test_token_instance = await Test_Token.deployed();
  await deployer.deploy(Griddl3_DAO_Core, "Griddl3", "GDL3", test_token_instance.address);

  let griddl3_instance = await Griddl3_DAO_Core.deployed();
  
  let details = {
    address: music_core_instance.address,
    abi: music_core_instance.abi
  }

  const fs = require('fs');

  let data = JSON.stringify(details);
  fs.writeFileSync('./website/music_core_details.json', data);
  fs.writeFileSync('./website/public/music_core_details.json', data);
};
