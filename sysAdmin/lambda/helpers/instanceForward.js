"use strict";

const allInstanceInfos = require("../methods/instance/allInstanceInfos");
const createInstance = require("../methods/instance/createInstance");
const instanceInfo = require("../methods/instance/instanceInfo");
const resetInstance = require("../methods/instance/resetInstance");
const validateToken = require("../methods/user/validateToken");
const { getItem } = require("./db");
const error = require("./error");
const response = require("./response");

const PRIMARY_KEY = "serverId";
const TABLE_NAME = "zoppy-servers";

exports.getInstance = async (n, path, query) => {
  const valid = await validateToken(query.accessToken);
  if (!valid) {
    return error(403, "invalid token");
  }
  if (path[0] === "allServers") {
    return allInstanceInfos();
  }
  if (path.length === 1) {
    return instanceInfo(PRIMARY_KEY, path[0], TABLE_NAME);
  }
  if (!path.length) {
    const res = await getItem(query, TABLE_NAME);
    return response(res);
  } else {
    return error(404, "invalid scope. Zero or one paths required");
  }
};

exports.postInstance = async (body, path, query) => {
  const valid = await validateToken(query.accessToken);
  if (!valid) {
    return error(403, "invalid token");
  }
  if (path.length === 2 && path[1] === "reset") {
    return resetInstance(path[0]);
  }
  if (!path.length && body) {
    return createInstance(body);
  } else {
    return error(422, "Invalid request");
  }
};
