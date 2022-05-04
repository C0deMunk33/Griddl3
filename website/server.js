
const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');
const path = require("path")
app.use(express.static('public'))

// ganache-cli -m "scissors nose double repair tiger exhibit hockey check broccoli motion morning must"

const https = require("https")
function getJSON(url) {
    return new Promise(function(resolve, reject) {
        const req = https.get(url, res => {
            let json = '';
            res.on('data', function(chunk) { json += chunk; });
            res.on('end', function() { resolve(JSON.parse(json)); });
        });
        req.on('error', function(err) { console.log(err); });
    });
};

async function download_file(url, path_){
  await fs.promises.mkdir(path.dirname(path_), {recursive: true})
  const file = fs.createWriteStream(path_);
  const request = https.get(url, function(response) {
    response.pipe(file);
  });
}

// get MasterCreated
const Web3 = require("web3");
let web3_instance = new Web3("https://rpc.gnosischain.com/")
const music_core_details = require("./music_core_details.json")
let music_core_instance = new web3_instance.eth.Contract(music_core_details.abi, music_core_details.address)

let ipfs_gateway = "https://ipfs.io/ipfs/"
let file_path = "./tokens/"
let known_tokens = [];
let known_tokens_map = {}
async function pull_files(){
  console.log("pulling files...")

  let master_events = await music_core_instance.getPastEvents("Master_Created",
  {
    fromBlock:"20943953",
    toBlock:"latest"
  })

  for(let event_idx = 0; event_idx < master_events.length; event_idx++){

    let master_event = master_events[event_idx].returnValues
    console.log("checking: " + master_event.ipfs_cid)
    if(known_tokens_map[master_event.ipfs_cid] === undefined){

      if(fs.existsSync((file_path + master_event.ipfs_cid) )){

        //load from local
        let rawdata = fs.readFileSync(file_path + master_event.ipfs_cid + "/metadata.json");
        let metadata = JSON.parse(rawdata);

        known_tokens_map[master_event.ipfs_cid] = {
          metadata:metadata,
          token_id: master_event.token_id,
          ownership_token_id: master_event.ownership_token_id
        }
        known_tokens.push(master_event.ipfs_cid)
      } else {
        // load metadata
        let metadata = await getJSON(ipfs_gateway + master_event.ipfs_cid + "/metadata.json");
        //console.log(metadata)
        let md_path = file_path + master_event.ipfs_cid + "/metadata.json";
        await fs.promises.mkdir(path.dirname(md_path), {recursive: true})
        let data = JSON.stringify(metadata);
        fs.writeFileSync(md_path, data);


        for(let music_idx = 0; music_idx < metadata.tracks.length; music_idx++){
          let track = metadata.tracks[music_idx];
          let filename = ipfs_gateway + master_event.ipfs_cid + "/" + track.filename;
          console.log("Downloading: " + filename)
          await download_file(filename, file_path + master_event.ipfs_cid + "/" + track.filename)
        }

        console.log("Downloading: thumbnail...")
        await download_file( ipfs_gateway + master_event.ipfs_cid + "/" + metadata.thumbnail, file_path + master_event.ipfs_cid + "/" + metadata.thumbnail);
        console.log("Downloading: cover...")
        await download_file(ipfs_gateway + master_event.ipfs_cid + "/" + metadata.cover, file_path + master_event.ipfs_cid + "/" + metadata.cover)

        known_tokens_map[master_event.ipfs_cid] = {
          metadata:metadata,
          token_id: master_event.token_id,
          ownership_token_id: master_event.ownership_token_id
        }
        known_tokens.push(master_event.ipfs_cid)
      }
    }
  }

  console.log("done")
  setTimeout(()=>{
    pull_files();
  }, 60000);
}

const archiver = require('archiver');
pull_files();

app.get("/tokens/:token_id", (req,res)=>{ // returns metadata
  let token_id = req.params.token_id
  if(known_tokens_map[token_id] !== undefined){
    res.send(known_tokens_map[token_id].metadata)
  } else {
    res.sendStatus(404);
  }
});

app.get("/download/:token_id", async (req, res) => {
  let token_id = req.params.token_id

  let folder_path = file_path + token_id + "/";
  if(fs.existsSync(folder_path)){
    console.log("exists!")
    // check if token_id.zip exists,
    let zip_name = (path.resolve(file_path+ token_id + ".zip") );

    if(!fs.existsSync(zip_name)){
       // zip folder_path to zip_name

       const output = fs.createWriteStream(zip_name);
       const archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level.
        });
      archive.directory(folder_path, false);
      archive.pipe(output)
      archive.finalize();

      var end = new Promise(function(resolve, reject) {
          output.on('close', () => {
            console.log("zip file created")
            resolve(output)
          });
          output.on('end', () => {
            console.log("zip file created")
            resolve(output)
          });
          archive.on('error', reject); // or something like that. might need to close `hash`
      });

      await end;
    }

    res.sendFile(zip_name)
  }

})

app.get("/tokens/:token_id/:path", (req,res)=>{
  let token_id = req.params.token_id
  let file_name = req.params.path
  let full_path = file_path + token_id + "/" + file_name;
  //console.log(full_path)
  if(fs.existsSync(full_path)){
    //console.log("qq")
    if(file_name.split(".")[1] === "mp3"){
      res.setHeader("content-type", "audio/mpeg");
    } else if(file_name.split(".")[1] === "png") {
      res.setHeader("content-type", "image/png");
    }

    let stream = fs.createReadStream(full_path);
    stream.pipe(res);
    stream.on("error", (e)=>{
      console.log(e)
    })
  } else {
    res.sendStatus(404);
  }
})



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
