'use strict';
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const wa = require('@open-wa/wa-automate');
const {worker} = require('cluster');

// require('axios-debug-log')({
//   request: function (debug, config) {
//     debug('Request with ', config);
//   },
//   response: function (debug, response) {
//     debug('Response with ' + response.data, 'from ' + response.config.url);
//   },
//   error: function (debug, error) {
//     // Read https://www.npmjs.com/package/axios#handling-errors for more info
//     debug('Boom', error);
//   },
// });

let model,
  wp,
  QRbuffer,
  myNumber,
  battery,
  charging,
  startedSetup,
  sts,
  settings;
const sentMessages = [];
const status = {
  connection: 'CONNECTED',
};

const validMsgTypes = [
  'chat',
  'image',
  'sticker',
  'audio',
  'ptt',
  'video',
  'ciphertext',
  'vcard',
  'document',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = function (Chat) {
  let io;
  wa.ev.on('qr.**', async (qrcode) => {
    // QRbuffer = Buffer.from(
    //   qrcode.replace('data:image/png;base64,', ''),
    //   'base64',
    // );
    // console.log(QRbuffer);
    io.sockets.emit('QR', qrcode);
  });

  wa.ev.on('**', async (data, sessionId, namespace) => {
    console.log('\n----------');
    console.log('EV', data, namespace, typeof data);
    console.log('----------');
    if (data === 'successfulScan') {
      io.sockets.emit('scanned');
    }
  });

  function isSent({chatId, body}) {
    return sentMessages.findIndex((m) => m.to === chatId && m.message === body);
  }

  Chat.loadSettings = async () => {
    settings = await Chat.app.models.Admin.get();
    console.log(settings);
  };

  async function query(string) {
    const pattern = new RegExp('.*' + string + '.*', 'i');
    return await Chat.find({
      where: {
        or: [
          {
            name: {like: pattern},
          },
          {
            chatId: {like: pattern},
          },
        ],
      },
      order: 'lastMessageAt DESC',
      limit: 50,
      include: {
        relation: 'messages',
        scope: {
          limit: 1,
          order: 'timestamp DESC',
        },
      },
    });
  }

  async function start(wpp) {
    if (!io && !Chat.app.io) {
      return setTimeout(() => {
        console.log('retrying');
        start(wpp);
      }, 500);
    } else {
      io = Chat.app.io;
      console.log('GOT IO');
    }

    Chat.loadSettings();
    io.on('connection', (socket) => {
      console.log('connected on Chat');
      socket.on('getChats', async () => {
        console.log('GET CHATS', new Date());
        const chats = await model.getAll();
        console.log('LOADED', new Date());
        let count = 0;
        const id = setInterval(() => {
          const sendingChats = chats.slice(count, count + 50);
          if (sendingChats.length) {
            socket.emit('loadedChats', {count, data: sendingChats});
            count += 50;
          } else {
            clearInterval(id);
          }
        }, 100);
      });
      socket.on('queryChat', async ({string, pinned}) => {
        const res = await query(string);
        socket.emit('queryResult', {res, pinned});
      });
    });
    io.sockets.emit('reload');

    const send = await wpp
      .getPage()
      .evaluate(() => window.WAPI.sendMessage.toString());
    console.log('WAPI', send);
    if (!send.includes('0x')) {
      wpp.kill();
      return Chat.setup();
    }
    wp = wpp;

    myNumber = (await wpp.getMe()).wid;
    console.log('My number %s', myNumber);
    wpp.onAnyMessage((msg) => {
      saveMsg(msg);
    });

    process.on('SIGINT', () => {
      wpp.close();
    });

    loadAllMessages(wpp);
    setStateListeners();
  }

  function setStateListeners() {
    wp.onBattery((b) => {
      battery = b;
      status.battery = b;
      io.sockets.emit('status', status);
    });
    wp.onPlugged((b) => {
      charging = b;
      status.charging = b;
      io.sockets.emit('status', status);
    });

    wp.onStateChanged(async (s) => {
      console.log(s);
      sts = s;
      status.connection = s;
      io.sockets.emit('status', status);
      switch (s) {
        case 'CONFLICT':
          console.log(12321312123);
          await wpp.forceRefocus();
          console.log(342);
          break;
        case 'UNPAIRED':
          wpp.kill(); // TESTAR
          break;
        default:
          break;
      }
    });
  }

  function assignAgent() {
    const agents = settings.agentsPool;
    const rand = Math.round(Math.random() * (agents.length - 1));
    return agents[rand];
  }

  async function createMessage(msg, latest, starting, newChat) {
    const Message = model.app.models.Message;
    const waMsg = await wp.getMessageById(msg.id);
    if (!validMsgTypes.includes(msg.type)) {
      return;
    }
    let time = waMsg.t;
    if (latest) {
      time = new Date().valueOf() / 1000;
    }
    let socketObj = {};
    if (newChat) {
      socketObj = newChat;
    }
    try {
      const savedMsg = await Message.create({
        messageId: waMsg.id,
        chatId: waMsg.chatId._serialized,
        body: waMsg.body,
        sender:
          waMsg.sender.pushname ||
          (waMsg.contact && waMsg.contact.verifiedName) ||
          (waMsg.contact && waMsg.contact.formattedName) ||
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
      socketObj.message = savedMsg;
      if (isSent(savedMsg) < 0 && savedMsg.timestamp > new Date() - 2000) {
        io.sockets.emit('newMessage', socketObj);
      }
      return savedMsg;
    } catch (error) {
      // console.log('duplicated %s', waMsg.id);
    }
  }

  async function saveMsg(msg) {
    if (!validMsgTypes.includes(msg.type)) {
      return;
    }
    const chat = await model.findById(msg.chatId);
    let previousTimestamp;
    let newChat;
    let agent;
    if (!chat) {
      const waMsg = await wp.getMessageById(msg.id);
      const wpChat = waMsg.chat;
      console.log('new chat:');
      if (!msg.fromMe && settings.randomizeNewChats) {
        agent = assignAgent();
      }
      try {
        newChat = await model.create({
          chatId: msg.chatId,
          name:
            wpChat.name ||
            wpChat.pushname ||
            (wpChat.contact && wpChat.contact.verifiedName) ||
            (wpChat.contact && wpChat.contact.formattedName) ||
            wpChat.formattedTitle,
          type: wpChat.kind,
          lastMessageAt: wpChat.t * 1000,
          mute: false,
          pin: false,
          newConversation: true,
          agentId: agent,
        });
      } catch (error) {
        console.log("CAN'T READ", msg, waMsg);
      }
      io.sockets.emit('newChat', newChat);
    } else {
      previousTimestamp = chat.lastMessageAt;
      await chat.updateAttributes({
        lastMessageAt: new Date(msg.t * 1000),
        profilePic: msg.chat.contact.profilePicThumbObj.eurl,
      });
    }
    const newChatFromMe = msg.fromMe && !chat ? true : undefined;
    if (!newChat) {
      newChat = chat;
    }
    await createMessage(msg, true, newChatFromMe, newChat);
    const loaded = await wp.getAmountOfLoadedMessages();
    if (loaded > 3000) {
      console.log(loaded);
      await wp.cutMsgCache();
    }
    // if (!ignoreChat(chat)) {
    //   if (!msg.fromMe || msg.from !== myNumber) {
    //     isConversion(msg);
    //   } else if (msg.fromMe && chat) {
    //     isStarting(msg, {
    //       previousTimestamp,
    //       newConversation: chat.newConversation,
    //     });
    //   }
    // }
  }

  async function loadAllMessages(client) {
    const Message = model.app.models.Message;
    const t0 = new Date().valueOf();
    const chats = await client.getAllChats();
    console.log('LOADED ALL CHATS IN', new Date() - t0);
    console.log(chats.length);

    let t = new Date();
    console.log(t);
    if (process.env.RESET === 'true') {
      await model.deleteAll();
      await Message.deleteAll();
    }

    const TREE_MONTHS = moment().subtract(3, 'M').valueOf() / 1000;
    await Promise.all(
      chats.map(async (oc, i) => {
        const t2 = new Date().valueOf();
        const currChat = await model.findById(oc.id);
        const chat = oc;
        const chatId = oc.id;

        if (currChat) {
          currChat.updateAttributes({lastMessageAt: chat.t * 1000});
        } else {
          try {
            if (!chat.kind) {
              return;
            }
            await model.create({
              chatId,
              name:
                chat.name ||
                chat.pushname ||
                (chat.contact && chat.contact.verifiedName) ||
                (chat.contact && chat.contact.formattedName) ||
                chat.formattedTitle,
              type: chat.kind,
              lastMessageAt: chat.t * 1000,
              profilePic: chat.contact.profilePicThumbObj.eurl,
              mute: Boolean(chat.mute),
              pin: chat.pin,
            });
          } catch (error) {
            console.log(error);
          }
        }

        if (chat.t < TREE_MONTHS || i > 500) {
          console.log('loaded only chat in', new Date() - t2);
          return;
        }
        let allMessages = await client.getAllMessagesInChat(chatId, true);
        // console.log(
        //   'loaded %d messages on chat %s',
        //   allMessages.length,
        //   chatId,
        // );

        if (!allMessages.length) {
          allMessages = await client.loadEarlierMessages(chatId);
        }

        await Promise.all(
          allMessages.map(async (msg) => {
            try {
              await createMessage(msg);
            } catch (error) {
              // console.log('duplicated %s', msg.id);
            }
          }),
        );
        console.log('loaded chat and messages in', new Date() - t2);
        client.cutMsgCache();
      }),
    );
    console.log('terminado', new Date(), new Date().valueOf() - t);
    io.sockets.emit('reload');
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
      console.log('CONVERSION');
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
      await model.upsertWithWhere(
        {chatId: msg.chatId},
        {newConversation: true},
      );
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

  Chat.refocus = async () => {
    return await wp.forceRefocus();
  };

  Chat.remoteMethod('refocus', {
    description: 'Force refocus to open-wa session',
    returns: {root: true},
    http: {path: '/refocus', verb: 'post'},
  });

  Chat.setup = async () => {
    if (wp) {
      throw new Error('WhatApp already set');
    } else if (startedSetup) {
      startedSetup = false;
      // await wa.kill();
      return Chat.setup();
    }
    io = Chat.app.io;
    startedSetup = true;
    let source = {executablePath: '/usr/bin/google-chrome-stable'};
    if (process.env.NODE_ENV === 'production') {
      source = {browserWSEndpoint: 'ws://browser:3000'};
    }
    wa.create({
      killProcessOnBrowserClose: false,
      restartOnCrash: start,
      licenseKey: '239D193F-26D442BD-AC392ED5-E9DB781F',
      disableSpins: true,
      // cacheEnabled: false,
      sessionDataPath: './session',
      headless: !process.env.HEADLESS,
      // devtools: false,
      ...source,
      // debug: true,
      logQR: true,
      autoRefresh: true,
      // qrRefreshS: 15,
      qrTimeout: 90,
      authTimeout: 90,
    }).then((client) => start(client));
  };

  Chat.remoteMethod('setup', {
    description: 'Start whatsapp web',
    returns: {root: true},
    http: {path: '/init', verb: 'post'},
  });

  // Chat.loadQR = async (res) => {
  //   if (wp) {
  //     throw new Error('WhatApp already set');
  //   } else if (!QRbuffer) {
  //     return false;
  //   }

  //   res.setHeader('Content-Type', 'image/png');
  //   res.setHeader('Content-Length', QRbuffer.length);

  //   res.send(QRbuffer);
  // };

  // Chat.remoteMethod('loadQR', {
  //   description: 'Retrieves QR code for setup',
  //   accepts: [
  //     {arg: 'res', type: 'object', required: true, http: {source: 'res'}},
  //   ],
  //   returns: {root: true},
  //   http: {path: '/qr', verb: 'get'},
  // });

  Chat.getAll = async () => {
    const unread = await getUnreadChats();

    const unreadObj = {};
    unread.forEach((chat) => {
      unreadObj[chat.id] = chat.indicatedNewMessages.length;
    });

    const conversations = await Chat.find({
      order: 'lastMessageAt DESC',
      limit: 200,
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

  async function saveMsgAll(msgs) {
    const Message = Chat.app.models.Message;
    const p = await Promise.all(
      msgs.map(async (m) => {
        return await Message.create({
          messageId: m.id,
          chatId: m.chatId._serialized,
          body: m.body,
          sender:
            m.sender.pushname ||
            (m.contact && m.contact.verifiedName) ||
            (m.contact && m.contact.formattedName) ||
            m.sender.id ||
            m.sender,
          type: m.type,
          mine: m.sender.id === myNumber || m.fromMe,
          timestamp: m.t * 1000,
          quote: m.quotedMsg || undefined,
          clientUrl: m.clientUrl,
          mediaKey: m.mediaKey,
          mimetype: m.mimetype,
          caption: m.caption,
        });
      }),
    );
    return p;
  }

  Chat.saveAllConversations = async () => {
    const conversations = await Chat.find();
    await Promise.all(
      conversations.map(async (c) => {
        const msgs = await wp.loadAndGetAllMessagesOnChat(c.chatId, true);
        await wp.cutMsgCache();
        return await saveMsgAll(msgs);
      }),
    );
    return conversations;
  };

  Chat.remoteMethod('saveAllConversations', {
    description: 'save all conversations',
    returns: {root: true},
    http: {path: '/saveAll', verb: 'post'},
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

  Chat.getMessages = async (chatId, filter = {skip: 0}) => {
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

    if (!msgs.messages.length) {
      const msgs = await Chat.loadMore(chatId);
      console.log('SKIP', filter.skip);
      console.log('RETURNED', msgs.all);
      let newMsgs;
      if (msgs.all) {
        newMsgs = msgs.msgs.slice(filter.skip);
      } else {
        newMsgs = msgs.msgs;
      }
      return newMsgs
        .filter((m) => !!m)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    } else {
      return msgs.messages;
    }
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
    const all = await wp.getAllMessagesInChat(chatId);
    console.log('EARLIER', earlierMsgs.length);
    console.log('ALL', all.length);
    if (earlierMsgs && earlierMsgs.length) {
      const msgs = await Promise.all(
        earlierMsgs.map(async (m) => {
          try {
            const msg = await createMessage(m);
            return msg;
          } catch (error) {
            console.log(error);
          }
        }),
      );
      return {msgs};
    } else {
      const msgs = await Promise.all(
        all.map(async (m) => {
          try {
            const sm = await createMessage(m);
            return sm;
          } catch (error) {
            console.log(error);
          }
        }),
      );
      return {msgs, all: true};
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
    sentMessages.push({to, message});
    const t = new Date();
    console.log(t);
    const wpMsg = await wp.sendText(to, message);
    console.log('FINISHED', new Date().valueOf() - t);
    if (typeof wpMsg === 'string') {
      const msg = await Message.findById(wpMsg);
      if (msg) {
        const newMsg = {...msg.toJSON()};
        await msg.updateAttributes({
          agentId: from || req.accessToken.userId,
        });
        newMsg.customId = customId;
        newMsg.agentId = from || req.accessToken.userId;
        io.sockets.emit('sentMessage', newMsg);
        const msgIdx = isSent(to, message);
        sentMessages.splice(msgIdx, 1);
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
          msg.agentId = from || req.accessToken.userId;
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

  Chat.sendAudio = async (chatId, req) => {
    const k = Object.keys(req.files)[0];
    const file = req.files[k];
    const base64 = Buffer.from(file.data).toString('base64');
    const uri = `data:audio/mp3;base64,${base64}`;
    const wpMsg = await wp.sendFile(chatId, uri, 'ptt.mp3', '');
    console.log(wpMsg);
    return wpMsg;
  };

  Chat.remoteMethod('sendAudio', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'req', type: 'object', http: {source: 'req'}},
    ],
    description: 'Send voice note to chat',
    returns: {root: true},
    http: {path: '/:chatId/sendAudio', verb: 'post'},
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

    let mediaData;
    try {
      if (msg.type === 'sticker') {
        const stickerDecryptable = await wp.getStickerDecryptable(messageId);
        mediaData = await wa.decryptMedia(stickerDecryptable);
      } else {
        mediaData = await wa.decryptMedia(msg);
      }
    } catch (error) {
      console.log('FAILED TO LOAD' + messageId);
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

  const possibleExtensions = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'mp4',
    '3pg',
    'mkv',
    'flv',
    'avi',
  ];

  Chat.uploadMedia = async (chatId, req, message) => {
    const Message = model.app.models.Message;
    const {caption} = message;
    console.log('caption', caption);
    console.log(req.files);
    const k = Object.keys(req.files)[0];
    const file = req.files[k];
    const extension = file.mimetype.split('/')[1];
    if (!possibleExtensions.includes(extension)) throw 'invalid file type';
    const now = new Date().valueOf();
    const base64 = Buffer.from(file.data).toString('base64');
    const uri = `data:image/${extension};base64,${base64}`;
    console.log('sending image', new Date());
    const wpMsg = await wp.sendImage(
      chatId,
      uri,
      now,
      caption || null,
      null,
      true,
    );
    console.log('IMAGE SENT', new Date());

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
    try {
      if (!chat) {
        throw 'Invalid chatId';
      }
      const usr = await Agent.findById(customId || req.accessToken.userId);

      if (settings.preventChatChange && !remove && chat.agentId) {
        throw 'Você não tem permissão para pegar a venda!';
      }
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
      io.sockets.emit('setAgent', upd);
      return upd;
    } catch (error) {
      console.log(error);
    }
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
      chatId.substring(0, 4) + chatId.substring(5, chatId.length);
    const noNine = (await wp.checkNumberStatus(removeNine)).canReceiveMessage;
    const nine = (await wp.checkNumberStatus(chatId)).canReceiveMessage;
    if (noNine) {
      return removeNine;
    } else if (nine) {
      return chatId;
    } else {
      return false;
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
    const status = await wp.getConnectionState();
    if (wp) {
      conn = (await wp.isConnected()) || status;
    }

    battery = await wp.getBatteryLevel();
    return {
      battery,
      charging,
      online: conn,
      status: sts,
      connection: status,
    };
  };

  Chat.remoteMethod('status', {
    description: 'Get device status',
    returns: {root: true},
    http: {path: '/status', verb: 'get'},
  });

  Chat.reset = async () => {
    const Message = Chat.app.models.Message;
    if (!wp) {
      await Chat.deleteAll();
      await Message.deleteAll();
      return true;
    }
    return false;
  };

  Chat.remoteMethod('reset', {
    description: 'reset',
    returns: {root: true},
    http: {path: '/reset', verb: 'post'},
  });

  Chat.findChat = async (id) => {
    return await query(id);
  };

  Chat.remoteMethod('findChat', {
    accepts: [{arg: 'query', type: 'string', required: true}],
    description: 'finds chat by chatId',
    returns: {root: true},
    http: {path: '/findChat/:query', verb: 'get'},
  });
};
