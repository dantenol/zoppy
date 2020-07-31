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
    let text;
    if (data.type === 'sale') {
      text = `${agent.fullName} fez uma venda de ${data.itemCount} item(s),` +
      ` no valor total de R$ ${('' + data.totalValue).replace('.', ',')}`;
    } else if (data.type === 'bag') {
      text = `${agent.fullName} enviou uma malinha com ${data.itemCount} item(s).`;
    }
    const msg = await Message.create({
      type: 'sale',
      saleType: data.type,
      chatId: data.chatId,
      timestamp: new Date(),
      messageId: uuidv4(),
      agentId: data.agentId,
      body: text,
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
