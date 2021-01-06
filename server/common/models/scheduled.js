'use strict';

module.exports = function (Scheduled) {
  Scheduled.getScheduledByChat = async (chatId) => {
    const match = Scheduled.find();
    const withId = match.filter((m) => m.to.includes(chatId));
    return withId;
  };

  Scheduled.remoteMethod('getScheduledByChat', {
    accepts: {arg: 'chatId', type: 'string', required: true},
    description: 'find scheduled messages to chat',
    returns: {root: true},
    http: {path: '/:chatId', verb: 'get'},
  });

  Scheduled.checkMessagesToSend = async () => {
    const Chat = Scheduled.app.models.Chat;
    const msgs = await Scheduled.find({
      where: {and: [{scheduledTo: {lt: Date.now()}}, {sent: false}]},
    });
    // console.log('res at ', new Date(), msgs);
    msgs.forEach(async msg => {
      const m = await Chat.sendSingleText(msg.to, msg.message);
      console.log(m);
      msg.updateAttributes({sent: true})
    });
  };
};
