"use strict";
const fs = require("fs").promises;

async function getAllGroupIds() {
  const file = (await fs.readFile("./vmh1_groups.json")).toString();
  const newFile = "[" + file.replace(/\n/gm, ",\n").slice(0, -2) + "]";
  const jsoned = JSON.parse(newFile);
  const ids = jsoned
    .filter((group) => (group.type === "group" ? true : false))
    .map((g) => g._id);
  console.log(JSON.stringify(ids));
}

getAllGroupIds();
