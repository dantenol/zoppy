"use strict";

const axios = require("axios");

const apiKey = "egcbXn0d6FRnbFvdvhkWkiS9P4DsfKxc";

axios.defaults.headers.post["api_key"] = apiKey;

const numberToAdd = "5511952889163@c.us";

const groupIds = ["553799295193-1590175300@g.us"];
// const groupIds = require("./vmh1_groupIds.json")

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function add(i) {
  const id = groupIds[i];
  if (!id) {
    return;
  }
  console.log(id);
  const group = await axios.post(
    "https://openwa-dnol.herokuapp.com/addParticipant",
    {
      args: {
        groupId: id,
        participantId: numberToAdd,
      },
    }
  );
  const admin = await axios.post(
    "https://openwa-dnol.herokuapp.com/promoteParticipant",
    {
      args: {
        groupId: id,
        participantId: numberToAdd,
      },
    }
  );
  console.log(id, group.data, admin.data);
  await sleep(1000);
  // add(i + 1);
}

function test() {
  add(0);
}

test();
