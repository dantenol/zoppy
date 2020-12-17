"use strict";
const fs = require("fs").promises;
const axios = require("axios");

const WAPI_URL = "http://localhost:8002/"

async function start() {
  const groups = await axios.post( WAPI_URL + "getAllGroups");
  const urls = await Promise.all(groups.data.response.map(async (g) => {
    const url = await axios.post(WAPI_URL + "getGroupInviteLink", {
      args: {
        chatId: g.id
      }
    });
    return url.data.response
  }));
  await fs.writeFile("inviteUtls.json", JSON.stringify(urls, null, 2))
  console.log(urls);
}

start();
