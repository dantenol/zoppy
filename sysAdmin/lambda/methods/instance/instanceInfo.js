"use strict";

const axios = require("axios");
const AWS = require("aws-sdk");

const { getItemById } = require("../../helpers/db");
const error = require("../../helpers/error");
const response = require("../../helpers/response");

const ec2 = new AWS.EC2();
const TABLE = "zoppy-servers";

module.exports = async (body, slug) => {
  const server = await getItemById("serverId", slug, TABLE);
  let status;
  const data = {};
  if (!server) {
    return error(404, "serverId not found");
  }

  const instance = await ec2
    .describeInstances({ InstanceIds: [server.instanceId] })
    .promise();
  try {
    status = await axios(`https://${slug}.zoppy.app/api/chats/status`, {
      timeout: 10000,
    });
  } catch (error) {
    status = { data: error.code };
  }
  data.status = status.data;
  data.instanceState = instance.Reservations[0].Instances[0].State;
  return response(data);
};
