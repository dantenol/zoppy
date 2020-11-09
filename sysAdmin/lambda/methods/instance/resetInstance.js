'use strict'

const { getItemById } = require("../../helpers/db")

const PRIMARY_KEY = "serverId";
const TABLE_NAME = "zoppy-servers";

module.exports = async (slug) => {
  const instance = await getItemById(PRIMARY_KEY, slug, TABLE_NAME);
  console.log(instance);
}