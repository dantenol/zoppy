"use strict";

const AWS = require("aws-sdk");
const { getItemById } = require("../../helpers/db");

const ssm = new AWS.SSM();

const TABLE = "zoppy-servers";

module.exports = async (instances, { command, path }) => {
  let ins = instances;
  if (!Array.isArray(instances)) {
    const instance = await getItemById("serverId", instances, TABLE);
    console.log(instance);
    ins = [instance.instanceId];
  }
  console.log("RUNNING");
  const params = {
    DocumentName: "AWS-RunShellScript",
    InstanceIds: ins,
    Parameters: {
      commands: command,
      executionTimeout: ["3600"],
      workingDirectory: [path || "/home/ec2-user"],
    },
  };

  const comm = await ssm.sendCommand(params).promise();
  console.log(comm);
};
