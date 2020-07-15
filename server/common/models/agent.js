'use strict';

function titleCase(str) {
  const splitStr = str.toLowerCase().split(' ');
  for (let i = 0; i < splitStr.length; i++) {
    splitStr[i] =
      splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
}

const colors = [
  '#FBFF00',
  '#F82000',
  '#800B00',
  '#0F8001',
  '#808001',
  '#3600FF',
  '#160080',
  '#FD00FF',
  '#800080',
  '#1D8080',
];

module.exports = function (Agent) {
  Agent.beforeRemote('create', async (ctx) => {
    const body = ctx.req.body;
    body.fullName = titleCase(body.fullName);
    body.firstLetter = body.fullName[0];
    body.color = colors[Math.floor(Math.random() * colors.length)];
    body.createdAt = new Date();
  });

  Agent.afterRemote('create', async (ctx, data) => {
    const res = data.toJSON();
    if (!res.username) {
      data.updateAttributes({username: `${res.id}`});
    }
  });

  Agent.beforeRemote('login', async (ctx) => {
    const body = ctx.req.body;
    body.ttl = 31540000;
  });

  Agent.afterRemote('login', async (ctx, data) => {
    const AccessToken = Agent.app.models.AccessToken;
    const tokens = await AccessToken.find({
      where: {userId: data.userId},
      order: 'created DESC',
      skip: 1,
    });

    tokens.forEach((t) => t.destroy());
  });

  Agent.loadAgentsObj = async () => {
    const agents = await Agent.find();

    const agentsObj = {};
    agents.forEach((a) => {
      agentsObj[a.id] = {
        fullName: a.fullName,
        firstLetter: a.firstLetter,
        color: a.color,
        isSalesAgent: a.isSalesAgent,
        username: a.username,
      };
    });

    return agentsObj;
  };

  Agent.remoteMethod('loadAgentsObj', {
    description: 'Loads an object of agents with necessary props',
    returns: {root: true},
    http: {path: '/list', verb: 'get'},
  });

  Agent.patchAgentData = async (agent, data) => {
    const thisAgent = await Agent.findById(agent);
    const changed = await thisAgent.updateAttributes(data);
    return changed;
  };

  Agent.remoteMethod('patchAgentData', {
    description: 'Patches the agent with new data',
    accepts: [
      {arg: 'agent', type: 'string', required: true},
      {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
    ],
    returns: {root: true},
    http: {path: '/update/:agent', verb: 'patch'},
  });
};
