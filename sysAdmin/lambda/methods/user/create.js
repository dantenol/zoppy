"use strict";

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const { post, getItem } = require("../../helpers/db");
const error = require("../../helpers/error");
const response = require("../../helpers/response");

const PRIMARY_KEY = "userId";
const TABLE_NAME = "zoppy-user";
const emailRegex = /^[a-z0-9.]+@[a-z0-9]+\.[a-z]+(\.[a-z]+)?$/gi;

module.exports = async (data) => {
  const { password, repeatPassword, email, name } = data;
  console.log(email);
  if (!password || !email || !name) {
    return error(422, "missing request data");
  }
  if (password !== repeatPassword) {
    return error(500, "password doesn't match");
  }
  if (!email.match(emailRegex)) {
    return error(500, "invalid email");
  }
  const dup = await getItem({ email }, TABLE_NAME);
  console.log(getItem);
  if (dup.length) {
    return error(500, "email already in use");
  }
  const pwd = await bcrypt.hash(password, 10);
  const usr = { name, userId: uuidv4(), email, password: pwd };
  const created = await post(usr, PRIMARY_KEY, TABLE_NAME);
  return response(created);
};
