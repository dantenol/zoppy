"use strict";

const axios = require("axios");
const fs = require("fs").promises;
const wpp = require("@open-wa/wa-automate")

const apiKey = "egcbXn0d6FRnbFvdvhkWkiS9P4DsfKxc";

const WAPI_URL = "http://localhost:8002/";

// axios.defaults.headers.post["api_key"] = apiKey;

const numberToAdd = "5511948983898@c.us";

let groupIds = [];
let wp;
// const groupIds = ["553799295193-1590175300@g.us"];
// const groupIds = require("./vmh1_groupIds.json")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function add(i) {
  const id = groupIds[i];
  if (!id) {
    return;
  }
  console.log(id);
  const e = await wp.addParticipant(id, numberToAdd)
  await sleep(500);
  const t = wp.promoteParticipant(id, numberToAdd)
  console.log(id, e, i);
  await sleep(1000);
  add(i + 1);
}

async function getGroups() {
  const gps = await fs.readFile("./groups.json", "utf-8");
  const parsed = JSON.parse(gps);
  const res = await Promise.all(
    parsed.map(async (g) => {
      const groups = await axios.post(WAPI_URL + "getChatById", {
        args: {
          contactId: g,
        },
      });
      return groups.data;
    })
  );
  await fs.writeFile("groups2.json", JSON.stringify(res, null, 2));
  console.log(res.length);
}

async function start() {
  const groups = await axios.post(WAPI_URL + "getAllGroups");
  const nbr = await axios.post(WAPI_URL + "getHostNumber");
  const me = nbr.data.response + "@c.us";
  console.log(me);
  groups.data.response.forEach((g) => {
    // const iAmAdmin = g.groupMetadata.participants.find(
    //   (p) => p.id._serialized === me && p.isAdmin ==- true")
    // );
    // const newContactIsIn = g.groupMetadata.participants.find(
    //   (p) => p.id._serialized === numberToAdd
    // );

    // if (!newContactIsIn && iAmAdmin) {
    groupIds.push(g.id);
    // }
  });
  console.log("adding in " + groupIds.length + " groups");
  await fs.writeFile("groups.json", JSON.stringify(groupIds, null, 2));
  // add(0);
}

// start();
// getGroups();

// (async function () {
//   const f = JSON.parse(await fs.readFile("groups2.json"));
//   const adms = [];
//   const me = "5511958167805@c.us"
//   f.forEach((g) => {
//     if (g.response.name.includes("Plantas")) {
//       adms.push(g.response.id)
//     }
//   });
//   console.log(adms.length);
//   groupIds = ["5511946258402-1606766594@g.us"]
//   add(0);
// })();

wpp.create({
  sessionId:'session',
  // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  useChrome: true,
  headless:false,

  // cacheEnabled:false,
  // devtools:true,
  //OR
  // devtools:{
  //   user:'admin',
  //   pass:'root'
  // },
  //example chrome args. THIS MAY BREAK YOUR APP !!!ONLY FOR TESTING FOR NOW!!!.
  // chromiumArgs:[
  //   '--aggressive-cache-discard',
  //   '--disable-cache',
  //   '--disable-application-cache',
  //   '--disable-offline-load-stale-cache',
  //   '--disk-cache-size=0'
  // ]
})
// create()
.then(client => {
  wp = client
  groupIds = ["5511946258402-1606766594@g.us"]
  add(0);
})