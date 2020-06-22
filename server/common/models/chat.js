'use strict';
const moment = require('moment');
const sharp = require('sharp');
const wa = require('@open-wa/wa-automate');

require('axios-debug-log')({
  request: function (debug, config) {
    debug('Request with ', config);
  },
  response: function (debug, response) {
    debug('Response with ' + response.data, 'from ' + response.config.url);
  },
  error: function (debug, error) {
    // Read https://www.npmjs.com/package/axios#handling-errors for more info
    debug('Boom', error);
  },
});

let model, wp;

wa.create({
  licenseKey: '239D193F-26D442BD-AC392ED5-E9DB781F',
  headless: true, // Headless chrome
  devtools: false, // Open devtools by default
  useChrome: true, // If false will use Chromium instance
  debug: true, // Opens a debug session
  logQR: true,
}).then((client) => start(client));

async function start(wpp) {
  wp = wpp;

  wpp.onAnyMessage(async (msg) => {
    // console.log(msg);
    saveMsg(msg);
  });

  process.on('SIGINT', () => {
    wpp.close();
  });

  await loadAllMessages(wpp);
}

async function saveMsg(msg) {
  const Message = model.app.models.Message;
  const chat = await model.findById(msg.chatId);
  if (!chat) {
    const chat = msg.chat;
    await model.create({
      chatId: chat.id,
      name: chat.name || chat.contact.formattedName || chat.formattedTitle,
      type: chat.kind,
      lastMessageAt: msg.t * 1000,
      mute: false,
      pin: false,
    });
  } else {
    await chat.updateAttributes({lastMessageAt: new Date(msg.t * 1000)});
  }
  const savedMsg = await Message.create({
    messageId: msg.id,
    chatId: msg.chat.id,
    body: msg.body,
    sender: msg.sender && msg.sender.formattedName,
    type: msg.type,
    mine: msg.fromMe,
    timestamp: msg.t * 1000,
    quote: msg.quotedMsg || undefined,
    clientUrl: msg.clientUrl,
    mediaKey: msg.mediaKey,
    mimetype: msg.mimetype,
    caption: msg.caption,
  });
  console.log(savedMsg);
}

async function loadAllMessages(client) {
  const Message = model.app.models.Message;
  const chats = await client.getAllChats();

  await model.deleteAll();
  await Message.deleteAll();

  await Promise.all(
    chats.map(async (chat) => {
      const chatId = chat.id;

      await model.create({
        chatId,
        name: chat.name || chat.contact.pushname || chat.formattedTitle,
        type: chat.kind,
        lastMessageAt: chat.t * 1000,
        mute: Boolean(chat.mute),
        pin: chat.pin,
      });

      let allMessages = await client.getAllMessagesInChat(chatId, true);
      console.log(chatId, allMessages.length);

      if (!allMessages.length) {
        allMessages = await client.loadEarlierMessages(chatId);
        console.log(chatId, allMessages.length);
      }

      await Promise.all(
        allMessages.map(async (msg) => {
          try {
            await Message.create({
              messageId: msg.id,
              chatId,
              body: msg.body,
              sender: msg.sender && msg.sender.formattedName,
              type: msg.type,
              mine: msg.fromMe,
              timestamp: msg.t * 1000,
              quote: msg.quotedMsg || undefined,
              clientUrl: msg.clientUrl,
              mediaKey: msg.mediaKey,
              mimetype: msg.mimetype,
              caption: msg.caption,
            });
          } catch (error) {
            console.log(error);
          }
        }),
      );
    }),
  );
  console.log('terminado', new Date());
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
  Chat.disableRemoteMethodByName('prototype.__delete__messages');
  Chat.disableRemoteMethodByName('prototype.__destroyById__messages');
  Chat.disableRemoteMethodByName('prototype.__findById__messages');
  Chat.disableRemoteMethodByName('prototype.__get__messages');
  Chat.disableRemoteMethodByName('prototype.__create__messages');
  Chat.disableRemoteMethodByName('prototype.__updateById__messages');
  Chat.disableRemoteMethodByName('prototype.__count__messages');

  model = Chat;
  Chat.getAll = async () => {
    const unread = await getUnreadChats();

    const unreadObj = {};
    unread.forEach((chat) => {
      unreadObj[chat.id] = chat.indicatedNewMessages.length;
    });

    const conversatoins = await Chat.find({
      order: 'lastMessageAt DESC',
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

  Chat.getMessages = async (chatId, filter) => {
    const chat = await Chat.findById(chatId, {
      include: {
        relation: 'messages',
        scope: {
          ...filter,
          order: 'timestamp DESC',
          limit: 50,
        },
      },
    });
    const msgs = chat.toJSON();

    if (msgs.messages.length < 50) {
      Chat.loadMore(chatId);
    }

    return msgs.messages;
  };

  Chat.remoteMethod('getMessages', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'filter', type: 'object', http: {source: 'query'}},
    ],
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

  Chat.updateName = async (id, name) => {
    const chat = await Chat.findById(id);
    chat.updateAttributes({customName: name});

    return true;
  };

  Chat.remoteMethod('updateName', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'name', type: 'string', required: true},
    ],
    description: 'Indicate contact that you saw the message',
    returns: {root: true},
    http: {path: '/:chatId/name', verb: 'patch'},
  });

  Chat.loadMore = async (chatId) => {
    const Message = model.app.models.Message;
    const earlierMsgs = await wp.loadEarlierMessages(chatId);
    if (earlierMsgs && earlierMsgs.length) {
      await Promise.all(
        earlierMsgs.map(async (m) => {
          try {
            const msg = await Message.create({
              messageId: m.id,
              chatId,
              body: m.body,
              sender: m.sender && m.sender.formattedName,
              type: m.type,
              mine: m.fromMe,
              timestamp: m.t * 1000,
              quote: m.quotedMsg || undefined,
              clientUrl: m.clientUrl,
              mediaKey: m.mediaKey,
              mimetype: m.mimetype,
              caption: m.caption,
            });
            return msg;
          } catch (error) {
            console.log(error);
          }
        }),
      );

      // TODO clear cache if its over 2000 messages
      // getAmountOfLoadedMessages and cutMsgCache
    }
  };

  Chat.remoteMethod('loadMore', {
    accepts: [{arg: 'chatId', type: 'string', required: true}],
    description: 'Loads more messages',
    returns: {root: true},
    http: {path: '/:chatId/loadMore', verb: 'get'},
  });

  Chat.sendMessage = async (to, message) => {
    const Message = model.app.models.Message;
    const wpMsg = await wp.sendText(to, message);
    if (wpMsg) {
      const msg = await Message.findById(wpMsg);

      return msg;
    }
    return true;
  };

  Chat.remoteMethod('sendMessage', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'message', type: 'string', required: true},
    ],
    description: 'Send message to chat',
    returns: {root: true},
    http: {path: '/:chatId/send', verb: 'post'},
  });

  Chat.checkRecentMessages = async (since) => {
    const newMsgs = await Chat.find({
      order: 'lastMessageAt DESC',
      where: {lastMessageAt: {gt: moment(since, 'x').toDate()}},
      include: {
        relation: 'messages',
        scope: {
          order: 'timestamp DESC',
          where: {timestamp: {gt: moment(since, 'x').toDate()}},
        },
      },
    });

    if (!newMsgs.length) {
      return false;
    }

    return newMsgs;
  };

  Chat.remoteMethod('checkRecentMessages', {
    accepts: [{arg: 'since', type: 'string', required: true}],
    description: 'Send message to chat',
    returns: {root: true},
    http: {path: '/latest/:since', verb: 'get'},
  });

  Chat.loadFile = async (res, messageId) => {
    const Message = model.app.models.Message;

    const msg = await Message.findById(messageId);

    const mediaData = await wa.decryptMedia(msg);

    // const fileBase64 = `data:${msg.mimetype.replace(
    //   / /g,
    //   '',
    // )};base64,${mediaData.toString('base64')}`;

    console.log(mediaData);
    if (msg.type === 'sticker') {
      const img = await sharp('image.webp').png().toBuffer();
      console.log(img);
    }

    res.setHeader('Content-Type', msg.mimetype.split(';')[0]);
    res.setHeader('Content-Length', mediaData.length);

    // console.log(mediaData.toString('base64'));
    res.send(mediaData);
  };

  Chat.remoteMethod('loadFile', {
    accepts: [
      {arg: 'res', type: 'object', required: true, http: {source: 'res'}},
      {arg: 'messageId', type: 'string', required: true},
    ],
    description: 'Send message to chat',
    returns: {root: true},
    http: {path: '/download/:messageId', verb: 'get'},
  });

  Chat.uploadMedia = async (chatId, req, message) => {
    const Message = model.app.models.Message;
    const {caption} = message;
    console.log('caption', caption);
    console.log(req.files);
    const k = Object.keys(req.files)[0];
    const file = req.files[k];
    const extension = file.mimetype.split('/')[1];
    if (extension !== 'png' && extension !== 'jpg' && extension !== 'jpeg')
      throw 'invalid file type';
    const now = new Date().valueOf();
    const base64 = Buffer.from(file.data).toString('base64');
    const uri = `data:image/${extension};base64,${base64}`;
    const wpMsg = await wp.sendImage(
      chatId,
      uri,
      now,
      caption || null,
      null,
      true,
    );

    const msgId = await new Promise((resolve) => {
      const interval = setInterval(async () => {
        const msg = await Message.findById(wpMsg);
        if (msg) {
          resolve(msg);
          clearInterval(interval);
        }
      }, 100);
    });

    return msgId;
  };

  Chat.remoteMethod('uploadMedia', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'message', type: 'object', required: true, http: {source: 'body'}},
    ],
    description: 'Send media to chat',
    returns: {root: true},
    http: {path: '/:chatId/sendMedia', verb: 'post'},
  });

  Chat.claimChat = async (req, chatId, remove) => {
    const Agent = model.app.models.Agent;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw 'Invalid chatId';
    }
    const usr = await Agent.findById(req.accessToken.userId);

    let upd;
    if (remove) {
      upd = await chat.updateAttributes({
        agentId: null,
        agentLetter: null,
      });
    } else {
      upd = await chat.updateAttributes({
        agentId: req.accessToken.userId,
        agentLetter: usr.firstLetter,
      });
    }

    return upd;
  };

  Chat.remoteMethod('claimChat', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'remove', type: 'boolean'},
    ],
    description: 'Claim chat',
    returns: {root: true},
    http: {path: '/:chatId/claim', verb: 'patch'},
  });
};
