'use strict';

function titleCase(str) {
  const splitStr = str.toLowerCase().split(' ');
  for (let i = 0; i < splitStr.length; i++) {
    splitStr[i] =
      splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
}

module.exports = function (Agent) {
  Agent.beforeRemote('create', async (ctx) => {
    const body = ctx.req.body;
    body.fullName = titleCase(body.fullName);
    body.firstLetter = body.fullName[0];
    body.createdAt = new Date();
  });

  Agent.beforeRemote('login', async (ctx) => {
    const body = ctx.req.body;
    body.ttl = 31540000;
  });
};
