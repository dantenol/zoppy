"use strict";

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const { getItem, post } = require("../../helpers/db");
const error = require("../../helpers/error");
const response = require("../../helpers/response");

const PRIMARY_KEY = "userId";
const TABLE_NAME = "zoppy-user";
const ONE_DAY = 1000 * 60 * 60 * 24;
const emailRegex = /^[a-z0-9.]+@[a-z0-9]+\.[a-z]+(\.[a-z]+)?$/gi;

module.exports = async (data) => {
  const { password, email } = data;
  if (!password || !email) {
    return error(422, "missing request data");
  }
  if (!email.match(emailRegex)) {
    return error(500, "invalid email");
  }
  const usr = (await getItem({email}, TABLE_NAME))[0];
  console.log(usr);
  const pwdCheck = await bcrypt.compare(password, usr.password);
  if (!pwdCheck) {
    return error(403, "invalid password");
  }
  delete usr.password;
  const authObj = {
    createdAt: new Date().valueOf(),
    expiration: 15 * ONE_DAY,
    userId: usr.userId,
    tokenId: uuidv4(),
  };
  const auth = await post(authObj, "tokenId", "zoppy-auth");
  console.log(auth);
  const res = { ...auth, user: usr };
  return response(res);
};
