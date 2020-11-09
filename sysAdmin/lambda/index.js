"use strict";

const { getInstance, postInstance } = require("./helpers/instanceForward");
const error = require("./helpers/error");
const { postUser } = require("./helpers/userForward");

const proxyTree = {
  instance: {
    GET: getInstance,
    POST: postInstance,
  },
  user: {
    POST: postUser
  }
};

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const paths = event.path.split("/");
  const path = paths[1];
  const query = event.queryStringParameters;
  const otherPaths = paths.splice(2);
  const method = event.httpMethod;
  let funct;
  try {
    funct = proxyTree[path][method];
    if (typeof funct !== "function") {
      throw "not a function";
    }
  } catch (e) {
    return error(404, "method not found");
  }
  return await funct(body, otherPaths, query);
};
