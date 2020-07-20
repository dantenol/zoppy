'use strict';
const {v4: uuidv4} = require('uuid');

module.exports = function (Sales) {
  Sales.new = async (data) => {
    const Message = Sales.app.models.Message;
    const Agent = Sales.app.models.Agent;
    if (!data.chatId || !data.agentId) {
      throw 'Invalid chat or agent';
    }

    const agent = await Agent.findById(data.agentId);
    data.createdAt = new Date();
    const sale = await Sales.create(data);
    const msg = await Message.create({
      type: 'sale',
      chatId: data.chatId,
      timestamp: new Date(),
      messageId: uuidv4(),
      body:
        `${agent.fullName} fez uma venda de ${data.itemCount} item(s),` +
        ` no valor total de R$ ${('' + data.totalValue).replace('.', ',')}`,
    });
    console.log(msg);
    return msg;
  };

  Sales.remoteMethod('new', {
    description: 'Registers a sale',
    accepts: [
      {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
    ],
    returns: {root: true},
    http: {path: '/new', verb: 'post'},
  });
};
