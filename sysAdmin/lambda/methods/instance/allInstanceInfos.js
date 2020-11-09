"use strict";

const axios = require("axios");
const AWS = require("aws-sdk");

const { getItem } = require("../../helpers/db");
const error = require("../../helpers/error");
const response = require("../../helpers/response");

const ec2 = new AWS.EC2();
const TABLE = "zoppy-servers";

module.exports = async () => {
  const server = await getItem(false, TABLE);
  let status;

  const ids = [];
  const slugs = [];
  const servers = server.map((s) => {
    ids.push(s.instanceId);
    slugs.push(s.serverId);
    return { instance: s.instanceId, slug: s.serverId };
  });
  const params = {
    InstanceIds: ids,
  };

  const instance = await ec2.describeInstances(params).promise();
  const consolidatedServers = instance.Reservations.map((i) => {
    return i.Instances[0];
  });

  await Promise.all(
    servers.map(async (a, i) => {
      try {
        status = await axios(`https://${a.slug}.zoppy.app/api/chats/status`, {
          timeout: 5000,
        });
      } catch (error) {
        status = { data: error.code };
      }
      consolidatedServers[i].status = status.data;
    })
  );
  return response(consolidatedServers);
};
