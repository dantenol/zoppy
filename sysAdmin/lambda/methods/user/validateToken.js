"use strict";

const { getItemById } = require("../../helpers/db");

module.exports = async (token) => {
  const tokenObj = await getItemById("tokenId", token, "zoppy-auth");
  if (!tokenObj) {
    return false;
  }
  const expired = tokenObj.createdAt + tokenObj.expiration < new Date().valueOf();
  if (expired) {
    return false;
  } else if (token === tokenObj.tokenId) {
    return true;
  }
};
