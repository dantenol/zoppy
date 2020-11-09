const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const { handler } = require("./index");

async function readFile(fileName) {
  const file = await fs.readFile(path.join(__dirname, fileName), "utf-8");
  return JSON.parse(file);
}

async function run() {
  const arg = await readFile(process.argv[2]);
  return await handler(arg);
}

run().then((r) => console.log("RESULT:\n", r));
