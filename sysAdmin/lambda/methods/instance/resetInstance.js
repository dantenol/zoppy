"use strict";
const AWS = require("aws-sdk");
const { getItemById } = require("../../helpers/db");
const error = require("../../helpers/error");
const response = require("../../helpers/response");
const runCommand = require("./runCommand");

const ec2 = new AWS.EC2();

const PRIMARY_KEY = "serverId";
const TABLE_NAME = "zoppy-servers";

module.exports = async (slug, reboot) => {
  const instance = await getItemById(PRIMARY_KEY, slug, TABLE_NAME);
  console.log(instance);
  if (reboot) {
    const params = { InstanceIds: [instance.InstanceId] };
    try {
      await ec2.rebootInstances(params).promise();
      return response(true);
    } catch (e) {
      return error(500, e);
    }
  } else {
    runCommand([instance.InstanceId], {
      command: [
        "cd app",
        "docker-compose down",
        "docker-compose up -d --build",
      ],
    });
  }
};
