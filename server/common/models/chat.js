'use strict';

const wa = require('@open-wa/wa-automate');

let model;
let wp;

wa.create({
  headless: false, // Headless chrome
  devtools: false, // Open devtools by default
  useChrome: true, // If false will use Chromium instance
  debug: true, // Opens a debug session
  logQR: true,
}).then((client) => start(client));

async function start(wpp) {
  wp = wpp;

  wpp.onMessage(async (msg) => {
    console.log(msg);
  });
  process.on('SIGINT', function () {
    wpp.close();
  });

  await loadAllMessages(wpp);
}

async function loadAllMessages(client) {
  const Message = model.app.models.Message;
  const chats = await client.getAllChats();

  await model.deleteAll();
  await Message.deleteAll();

  await Promise.all(
    chats.map(async (chat) => {
      console.log(chat);
      await model.create({
        chatId: chat.id._serialized,
        name: chat.name,
        type: chat.kind,
        lastMessageAt: chat.t * 1000,
      });

      const allMessages = await client.loadAndGetAllMessagesInChat(
        chat.id._serialized,
        true,
      );

      await Promise.all(
        allMessages.map(async (msg) => {
          try {
            await Message.create({
              messageId: msg.id,
              chatId: msg.chatId._serialized,
              body: msg.body,
              sender: msg.sender.formattedName,
              type: msg.type,
              timestamp: msg.t * 1000,
            });
          } catch (error) {
            console.log(error, msg);
          }
        }),
      );
    }),
  );
}

async function getUnreadChats() {
  const newMsgs = await wp.getIndicatedNewMessages();

  return newMsgs;
}

async function setSeen(id) {
  const sen = await wp.sendSeen(id);

  return sen;
}

module.exports = function (Chat) {
  model = Chat;
  Chat.getAll = async () => {
    const unread = await getUnreadChats();

    const unreadObj = {};
    unread.forEach((chat) => {
      unreadObj[chat.id] = chat.indicatedNewMessages.length;
    });

    const conversatoins = await Chat.find({
      include: {
        relation: 'messages',
        scope: {
          limit: 1,
          order: 'timestamp DESC',
        },
      },
    });

    conversatoins.forEach((c, i) => {
      if (unreadObj[c.chatId]) {
        conversatoins[i].unread = unreadObj[c.chatId];
      }
    });

    return conversatoins;
  };

  Chat.remoteMethod('getAll', {
    description: 'Load all conversations',
    returns: {root: true},
    http: {path: '/all', verb: 'get'},
  });

  Chat.profilePicUrl = async (userId) => {
    const chat = await Chat.findById(userId);

    const profilePic = await wp.getProfilePicFromServer(userId);
    await chat.updateAttributes({profilePic});

    return profilePic;
  };

  Chat.remoteMethod('profilePicUrl', {
    accepts: {arg: 'userId', type: 'string', required: true},
    description: 'Get users profile pic url',
    returns: {root: true},
    http: {path: '/:userId/profilePic', verb: 'get'},
  });

  Chat.updateName = async (chatId, newName) => {
    const chat = await Chat.findById(chatId);

    await chat.updateAttribute({name: newName});
    return true;
  };

  Chat.remoteMethod('updateName', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'newName', type: 'string', required: true},
    ],
    description: 'Get users profile pic url',
    returns: {root: true},
    http: {path: '/:chatId/updateName', verb: 'patch'},
  });

  Chat.getMessages = async (chatId) => {
    const chat = await Chat.findById(chatId, {include: 'messages'});
    const msgs = chat.toJSON();

    return msgs.messages;
  };

  Chat.remoteMethod('getMessages', {
    accepts: [{arg: 'chatId', type: 'string', required: true}],
    description: 'load messages',
    returns: {root: true},
    http: {path: '/:chatId/messages', verb: 'get'},
  });

  Chat.markSeen = async (chatId) => {
    return await setSeen(chatId);
  };

  Chat.remoteMethod('markSeen', {
    accepts: [{arg: 'chatId', type: 'string', required: true}],
    description: 'Indicate contact that you saw the message',
    returns: {root: true},
    http: {path: '/:chatId/seen', verb: 'patch'},
  });
};
