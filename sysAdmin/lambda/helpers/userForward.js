"use strict";

const create = require("../methods/user/create");
const login = require("../methods/user/login");

exports.postUser = async (body, path, query) => {
  if (path.length === 1 && path[0] === "signup") {
    return create(body)
  }
  if (path.length === 1 && path[0] === "login") {
    return login(body)
  }
}