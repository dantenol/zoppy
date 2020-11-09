"use strict";

const { post } = require("../../helpers/db");
const response = require("../../helpers/response");

const PRIMARY_KEY = "serverId";
const TABLE_NAME = "zoppy-servers";

module.exports = async (body) => {
  const data = await post(body, PRIMARY_KEY, TABLE_NAME);
  return response(data);
};
