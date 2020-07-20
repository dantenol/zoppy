'use strict';
const moment = require('moment');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
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

let model, wp, QRbuffer, myNumber, battery, charging, startedSetup;

const validMsgTypes = [
  'chat',
  'image',
  'ptt',
  'video',
  'ciphertext',
  'vcard',
  'document',
];

async function start(wpp) {
  wp = wpp;

  myNumber = (await wpp.getMe()).wid;
  console.log('My number %s', myNumber);
  wpp.onAnyMessage((msg) => {
    saveMsg(msg);
  });

  wpp.onBattery((b) => {
    console.log(b);
    battery = b;
  });
  wpp.onPlugged((b) => {
    console.log(b);
    charging = b;
  });

  wpp.onStateChanged((s) => {
    console.log(s);
    switch (s) {
      case 'CONFLICT':
        wpp.forceRefocus();
        break;
      case 'UNPAIRED':
        model.kill();
        model.setup();
        break;
      default:
        break;
    }
  });

  process.on('SIGINT', () => {
    wpp.close();
  });

  loadAllMessages(wpp);
}

wa.ev.on('qr.**', async (qrcode) => {
  QRbuffer = Buffer.from(
    qrcode.replace('data:image/png;base64,', ''),
    'base64',
  );
  console.log(QRbuffer);
});

async function createMessage(msg, latest, starting) {
  const Message = model.app.models.Message;
  const waMsg = await wp.getMessageById(msg.id);
  if (!validMsgTypes.includes(msg.type)) {
    return;
  }
  let time = waMsg.t;
  if (latest) {
    time = new Date().valueOf() / 1000;
  }
  try {
    const savedMsg = await Message.create({
      messageId: waMsg.id,
      chatId: waMsg.chatId._serialized,
      body: waMsg.body,
      sender:
        waMsg.sender.pushname ||
        waMsg.sender.formattedName ||
        waMsg.sender.id ||
        waMsg.sender,
      type: waMsg.type,
      mine: waMsg.sender.id === myNumber || waMsg.fromMe,
      timestamp: time * 1000,
      quote: waMsg.quotedMsg || undefined,
      clientUrl: waMsg.clientUrl,
      mediaKey: waMsg.mediaKey,
      mimetype: waMsg.mimetype,
      caption: waMsg.caption,
      starting,
    });
    return savedMsg;
  } catch (error) {
    console.log('duplicated %s', waMsg.id);
  }
}

async function saveMsg(msg) {
  if (!validMsgTypes.includes(msg.type)) {
    return;
  }
  const chat = await model.findById(msg.chatId);
  let previousTimestamp;
  if (!chat) {
    const waMsg = await wp.getMessageById(msg.id);
    const wpChat = waMsg.chat;
    console.log('new chat:');
    await model.create({
      chatId: msg.chatId,
      name:
        wpChat.name ||
        wpChat.pushname ||
        wpChat.contact.verifiedName ||
        wpChat.contact.formattedName ||
        wpChat.formattedTitle,
      type: wpChat.kind,
      lastMessageAt: wpChat.t * 1000,
      mute: false,
      pin: false,
      newConversation: true,
    });
  } else {
    previousTimestamp = chat.lastMessageAt;
    await chat.updateAttributes({lastMessageAt: new Date(msg.t * 1000)});
  }
  const newChatFromMe = msg.fromMe && !chat ? true : undefined;
  await createMessage(msg, true, newChatFromMe);
  const loaded = await wp.getAmountOfLoadedMessages();
  if (loaded > 3000) {
    console.log(loaded);
    await wp.cutMsgCache();
  }
  if (!ignoreChat(chat)) {
    if (!msg.fromMe || msg.from !== myNumber) {
      isConversion(msg);
    } else if (msg.fromMe && chat) {
      isStarting(msg, {
        previousTimestamp,
        newConversation: chat.newConversation,
      });
    }
  }
}

async function loadAllMessages(client) {
  const Message = model.app.models.Message;
  const chats = await client.getAllChats();

  if (process.env.RESET === 'true') {
    await model.deleteAll();
    await Message.deleteAll();
  }

  await Promise.all(
    chats.map(async (chat) => {
      const chatId = chat.id;
      const currChat = await model.findById(chatId);

      if (currChat) {
        currChat.updateAttributes({lastMessageAt: chat.t * 1000});
      } else {
        try {
          await model.create({
            chatId,
            name: chat.name || chat.contact.pushname || chat.formattedTitle,
            type: chat.kind,
            lastMessageAt: chat.t * 1000,
            profilePic: chat.contact.profilePicThumbObj.eurl,
            mute: Boolean(chat.mute),
            pin: chat.pin,
          });
        } catch (error) {
          console.log('duplicated %s', chatId);
        }
      }

      let allMessages = await client.getAllMessagesInChat(chatId, true);
      console.log('loaded %d messages on chat %s', allMessages.length, chatId);

      if (!allMessages.length) {
        allMessages = await client.loadEarlierMessages(chatId);
      }

      await Promise.all(
        allMessages.map(async (msg) => {
          try {
            await createMessage(msg);
          } catch (error) {
            console.log('duplicated %s', msg.id);
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

async function isConversion(msg) {
  const Message = model.app.models.Message;
  const msgs = await Message.find({
    where: {chatId: msg.chatId},
    order: 'timestamp DESC',
    sort: 'timestamp DESC',
    limit: 2,
  });
  const last = msgs.find((m) => m.messageId !== msg.id);
  console.log('LAST: ', last, moment(last.t * 1000).isSame(moment(), 'day'));
  if (moment(last.t * 1000).isSame(moment(), 'day') && last.starting) {
    await Message.upsertWithWhere(
      {messageId: last.messageId},
      {answered: true},
    );
    const r = await model.upsertWithWhere(
      {chatId: msg.chatId},
      {newConversation: false},
    );
    console.log('IS CONVERSION', r);
  }
}

async function isStarting(msg, {previousTimestamp, newConversation}) {
  const Message = model.app.models.Message;
  const last = moment(previousTimestamp);
  console.log(
    'STARTING',
    last.isBefore(moment().startOf('D').subtract(2, 'D'), 'D'),
  );
  if (last.isBefore(moment().startOf('D').subtract(2, 'D'), 'D')) {
    await Message.upsertWithWhere({messageId: msg.id}, {starting: true});
    await model.upsertWithWhere({chatId: msg.chatId}, {newConversation: true});
  } else if (last.isSame(moment(), 'D') && newConversation) {
    await Message.upsertWithWhere({messageId: msg.id}, {starting: true});
    await Message.upsertWithWhere(
      {
        and: [
          {chatId: msg.chatId},
          {timestamp: {gt: moment().startOf('D').toDate()}},
          {messageId: {neq: msg.id}},
        ],
      },
      {starting: false},
    );
    console.log('CHANGED STARTING MESSAGE');
  }
}

function ignoreChat(chat) {
  const Admin = model.app.models.Admin;
  if (!chat || chat.chatId.includes('@g')) {
    return true;
  }
  // const admin = Admin.findOne();
  // if (admin.ignoreNumbers.includes(chat.chatId)) {
  //   return false;
  // }
}

module.exports = function (Chat) {
  model = Chat;
  Chat.disableRemoteMethodByName('prototype.__delete__messages');
  Chat.disableRemoteMethodByName('prototype.__destroyById__messages');
  Chat.disableRemoteMethodByName('prototype.__findById__messages');
  Chat.disableRemoteMethodByName('prototype.__get__messages');
  Chat.disableRemoteMethodByName('prototype.__create__messages');
  Chat.disableRemoteMethodByName('prototype.__updateById__messages');
  Chat.disableRemoteMethodByName('prototype.__count__messages');

  Chat.isSet = async () => {
    return Boolean(wp);
  };

  Chat.remoteMethod('isSet', {
    description: 'Checks if whatsapp is set',
    returns: {root: true},
    http: {path: '/online', verb: 'get'},
  });

  Chat.setup = async () => {
    if (wp) {
      throw new Error('WhatApp already set');
    } else if (startedSetup) {
      startedSetup = false;
      // await wa.kill();
      return Chat.setup();
    }
    startedSetup = true;
    wa.create({
      killProcessOnBrowserClose: false,
      restartOnCrash: start,
      licenseKey: '239D193F-26D442BD-AC392ED5-E9DB781F',
      disableSpins: true,
      sessionDataPath: './session',
      headless: true,
      devtools: false,
      executablePath: '/usr/bin/google-chrome-stable',
      debug: true,
      logQR: true,
      qrRefreshS: 15,
      qrTimeout: 40,
    }).then((client) => start(client));
  };

  Chat.remoteMethod('setup', {
    description: 'Start whatsapp web',
    returns: {root: true},
    http: {path: '/init', verb: 'post'},
  });

  Chat.loadQR = async (res) => {
    if (wp) {
      throw new Error('WhatApp already set');
    } else if (!QRbuffer) {
      return false;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', QRbuffer.length);

    res.send(QRbuffer);
  };

  Chat.remoteMethod('loadQR', {
    description: 'Retrieves QR code for setup',
    accepts: [
      {arg: 'res', type: 'object', required: true, http: {source: 'res'}},
    ],
    returns: {root: true},
    http: {path: '/qr', verb: 'get'},
  });

  Chat.getAll = async () => {
    const unread = await getUnreadChats();

    const unreadObj = {};
    unread.forEach((chat) => {
      unreadObj[chat.id] = chat.indicatedNewMessages.length;
    });

    const conversations = await Chat.find({
      order: 'lastMessageAt DESC',
      include: {
        relation: 'messages',
        scope: {
          limit: 1,
          order: 'timestamp DESC',
        },
      },
    });

    conversations.forEach((c, i) => {
      if (unreadObj[c.chatId]) {
        conversations[i].unread = unreadObj[c.chatId];
      }
    });

    return conversations;
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

  Chat.kill = async () => {
    //TODO try catch
    try {
      fs.unlinkSync(path.resolve(__dirname, '../../session/session.data.json'));
    } catch (error) {
      console.log(error);
    }
    await wp.kill();
    wp = undefined;

    return true;
  };

  Chat.remoteMethod('kill', {
    description: 'Stops the WA server',
    returns: {root: true},
    http: {path: '/stop', verb: 'post'},
  });

  Chat.loadMore = async (chatId) => {
    const earlierMsgs = await wp.loadEarlierMessages(chatId);
    if (earlierMsgs && earlierMsgs.length) {
      await Promise.all(
        earlierMsgs.map(async (m) => {
          try {
            const msg = await createMessage(m);
            return msg;
          } catch (error) {
            console.log(error);
          }
        }),
      );
    }
  };

  Chat.remoteMethod('loadMore', {
    accepts: [{arg: 'chatId', type: 'string', required: true}],
    description: 'Loads more messages',
    returns: {root: true},
    http: {path: '/:chatId/loadMore', verb: 'get'},
  });

  Chat.forceReloadChat = async (chatId) => {
    const messages = await wp.getAllMessagesInChat(chatId, true);
    messages.forEach((m) => {
      console.log(m);
      // usar upsert
    });
  };

  Chat.remoteMethod('forceReloadChat', {
    accepts: [{arg: 'chatId', type: 'string', required: true}],
    description: 'Force reload all messages on chat looking for missing ones',
    returns: {root: true},
    http: {path: '/:chatId/reload', verb: 'post'},
  });

  Chat.sendMessage = async (req, to, message, from, customId) => {
    const Message = model.app.models.Message;
    const wpMsg = await wp.sendText(to, message);
    if (typeof wpMsg === 'string') {
      const msg = await Message.findById(wpMsg);
      if (msg) {
        const newMsg = await msg.updateAttributes({
          agentId: from || req.accessToken.userId,
        });
        newMsg.customId = customId;
        return newMsg;
      }
    } else {
      console.log('NO ID');
      try {
        const msg = await new Promise((resolve) => {
          const started = new Date();
          const interval = setInterval(async () => {
            const tryMsg = await Message.findOne({
              where: {chatId: to, mine: true},
            });
            console.log('trying...');
            if (tryMsg) {
              clearInterval(interval);
              console.log('took me %d ms', new Date() - started);
              resolve(tryMsg);
            } else if (new Date() - started > 1000) {
              clearInterval(interval);
              resolve(false);
            }
          }, 100);
        });
        console.log('MESSAGE: ', msg);
        if (msg) {
          msg.updateAttributes({agentId: from || req.accessToken.userId});
          await model.claimChat(req, to);
        }
        return msg;
      } catch (error) {
        console.log(error);
      }
    }
  };

  Chat.remoteMethod('sendMessage', {
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'message', type: 'string', required: true},
      {arg: 'from', type: 'string', required: false},
      {arg: 'customId', type: 'number', required: false},
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

    // console.log(mediaData);
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

  Chat.claimChat = async (req, chatId, remove, customId) => {
    const Agent = model.app.models.Agent;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw 'Invalid chatId';
    }
    const usr = await Agent.findById(customId || req.accessToken.userId);

    let upd;
    if (remove) {
      upd = await chat.updateAttributes({
        agentId: null,
        agentLetter: null,
      });
    } else {
      upd = await chat.updateAttributes({
        agentId: usr.id,
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
      {arg: 'customId', type: 'string'},
    ],
    description: 'Claim chat',
    returns: {root: true},
    http: {path: '/:chatId/claim', verb: 'patch'},
  });

  Chat.checkNum = async (chatId) => {
    const removeNine =
      chatId.substring(0, 5) + chatId.substring(6, chatId.length);
    const noNine = (await wp.checkNumberStatus(removeNine)).canReceiveMessage;
    if (noNine) {
      return true;
    } else {
      return (await wp.checkNumberStatus(chatId)).canReceiveMessage;
    }
  };

  Chat.remoteMethod('checkNum', {
    accepts: [{arg: 'chatId', type: 'string', required: true}],
    description: 'Validate WhatsApp number',
    returns: {root: true},
    http: {path: '/:chatId/check', verb: 'get'},
  });

  Chat.status = async () => {
    let conn = false;
    if (wp) {
      wp = (await wp.isConnected()) || (await wp.getConnectionState());
    }

    return {
      battery,
      charging,
      online: conn,
    };
  };

  Chat.remoteMethod('status', {
    description: 'Get device status',
    returns: {root: true},
    http: {path: '/status', verb: 'get'},
  });
};
