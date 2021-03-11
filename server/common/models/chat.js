'use strict';
const moment = require('moment');
const fs = require('fs');
const random = require('random');
const path = require('path');
const wa = require('@open-wa/wa-automate');
const {default: PQueue} = require('p-queue');
const mime = require('mime-types');

const pkg = require('../../package.json');

const queue = new PQueue({concurrency: 1});
const tripleQueue = new PQueue({concurrency: 3});

require('axios-debug-log')({
  request: function (debug, config) {
    debug('Request with ', config);
  },
  response: function (debug, response) {
    debug(
      'Response with ' + JSON.stringify(response.data),
      'from ' + response.config.url,
    );
  },
  error: function (debug, error) {
    // Read https://www.npmjs.com/package/axios#handling-errors for more info
    debug('Boom', error);
  },
});

let model,
  wp,
  QRbuffer,
  myNumber,
  battery,
  charging,
  startedSetup,
  sts,
  lastSent,
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
    const isSent = sentMessages.findIndex(
      (m) => m.to === chatId && m.message === body,
    );
    if (isSent >= 0) {
      const e = sentMessages[isSent].agentId;
      return e.toJSON();
    }
    return -1;
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

  async function validateSocket(access_token) {
    const AccessToken = Chat.app.models.AccessToken;
    const tokn = await AccessToken.findById(access_token);
    console.log(tokn);
    return Boolean(tokn);
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
    io.on('connection', async (socket) => {
      if (!socket.handshake.query || !socket.handshake.query.access_token) {
        console.log('failed socket connectoin');
        return socket.disconnect();
      }
      const canConnect = await validateSocket(
        socket.handshake.query.access_token,
      );
      if (!canConnect) {
        console.log('failed socket connectoin');
        return socket.disconnect();
      }
      socket.on('getChats', async () => {
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
        socket.emit('queryResult', {res, pinned, string});
      });
    });
    // io.sockets.emit('reload');

    const send = await wpp
      .getPage()
      .evaluate(() => window.WAPI.sendMessage.toString());
    console.log('WAPI', send);
    // if (!send.includes('0x')) {
    //   wpp.kill();
    //   return Chat.setup();
    // }
    wp = wpp;

    myNumber = (await wpp.getMe()).wid;
    console.log('My number %s', myNumber);
    if (myNumber !== settings.myNumber) {
      await Chat.app.models.Admin.change({myNumber});
      await Chat.deleteAll();
      await Chat.app.models.Message.deleteAll();
      console.log('DELETED ALL MESSAGES FROM OLD NUMBER');
    }
    // wpp.onAnyMessage((msg) => {
    //   if (!settings.importSettings) {
    //     saveMsg(msg);
    //   }
    // });

    process.on('SIGINT', () => {
      wpp.close();
    });

    loadAllMessages(wpp);
    setStateListeners();
    clearWAMessage();
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

    // wp.onGlobalParticipantsChanged((e) => {
    //   console.log(e);
    // });

    // wp.onStateChanged(async (s) => {
    //   console.log(s);
    //   sts = s;
    //   status.connection = s;
    //   io.sockets.emit('status', status);
    //   if (s === 'CONFLICT' || s === 'UNLAUNCHED') {
    //     console.log(wp.forceRefocus.toString());
    //     wp.forceRefocus();
    //   }

    //   if (s === 'UNPAIRED') {
    //     console.log('LOGGED OUT!!!!');
    //     Chat.kill();
    //   }
    // });
  }

  function assignAgent() {
    const agents = settings.agentsPool;
    const r = random.uniformInt(0, agents.length - 1);
    return agents[r()];
  }

  async function createMessage(msg, latest, starting, newChat) {
    const Message = model.app.models.Message;
    let waMsg = await wp.getMessageById(msg.id);
    if (!waMsg && msg.chat.lastReceivedKey) {
      waMsg = msg;
    }
    if (!validMsgTypes.includes(msg.type)) {
      return;
    }
    let time = waMsg.t;
    let savedMsg;
    if (latest) {
      time = new Date().valueOf() / 1000;
    }
    let socketObj = {};
    if (newChat) {
      socketObj = newChat;
    }
    try {
      let chatId = waMsg.chatId;
      if (typeof chatId === 'object') {
        chatId = waMsg.chatId._serialized;
      }
      let quote;
      if (waMsg.quotedMsg) {
        const data = waMsg.quotedMsgObj;
        quote = {
          body: data.body,
          sender: data.sender.formattedName,
          id: data.id,
          mine: data.fromMe,
          clientUrl: data.clientUrl,
          mediaKey: data.mediaKey,
          caption: data.caption,
          duration: data.duration,
        };
      }
      savedMsg = await Message.create({
        messageId: waMsg.id,
        chatId,
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
        quote,
        clientUrl: waMsg.clientUrl,
        mediaKey: waMsg.mediaKey,
        mimetype: waMsg.mimetype,
        caption: waMsg.caption,
        duration: waMsg.duration,
        starting,
      });
      socketObj.message = savedMsg;
      const sent = isSent(savedMsg);
      if (sent < 0 && savedMsg.timestamp > new Date() - 2000) {
        io.sockets.emit('newMessage', socketObj);
      } else if (
        // TODO waiting WA fix
        typeof sent === 'string' &&
        savedMsg.timestamp > new Date() - 2000
      ) {
        savedMsg.agentId = sent.toString();
        io.sockets.emit('sentMessage', savedMsg);
      }
      return savedMsg;
    } catch (error) {
      // console.log('duplicated %s', waMsg.id);
    }
  }

  async function saveMessageById(id) {
    const msg = await wp.getMessageById(id);
    console.log(msg);
    if (msg) saveMsg(msg);
  }

  async function saveMsg(msg) {
    if (!validMsgTypes.includes(msg.type) || msg.from.includes('status')) {
      return;
    }
    const chat = await model.findById(msg.chatId._serialized || msg.chatId);
    // console.log(chat);
    let previousTimestamp;
    let newChat;
    let agent;
    if (!chat) {
      const waMsg = await wp.getMessageById(msg.id);
      const wpChat = waMsg.chat;
      let url;
      console.log('new chat:');
      if (!msg.fromMe && settings.randomizeNewChats) {
        agent = assignAgent();
      }
      // if (wpChat.kind === 'group') {
      //   url = await retrieveGroupLink(msg.chatId);
      // }
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
          url,
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

  let ldd = 0;

  // async function loadMsgs(id) {
  //   try {
  //     return await wp.loadEarlierMessages(id);
  //   } catch (error) {
  //     console.log(error);
  //     return [];
  //   }
  // }

  function loadCounter(total, chatId) {
    if (total) {
      io.sockets.emit('loadedMessage', {total});
    } else {
      io.sockets.emit('loadedAMessage', {partial: ++ldd});
    }
  }

  async function saveMedia(message, chat) {
    if (message.mimetype) {
      const filename = path.resolve(
        __dirname,
        '../../media/',
        `${chat} - ${message.t}.${mime.extension(message.mimetype)}`,
      );
      let mediaData;
      try {
        mediaData = await wa.decryptMedia(message);
      } catch (error) {
        console.log('FAILED TO LOAD MEDIA');
      }
      if (!mediaData) {
        try {
          mediaData = await decryptMedia(
            await wp.forceStaleMediaUpdate(message.id),
          );
        } catch (error) {
          console.log('FAILED AGAIN');
          return;
        }
      }
      // const imageBase64 = `data:${message.mimetype};base64,${mediaData.toString(
      //   'base64'
      // )}`;
      // await client.sendImage(
      //   message.from,
      //   imageBase64,
      //   filename,
      //   `You just sent me this ${message.type}`
      // );
      fs.writeFile(filename, mediaData, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log('The file was saved!');
      });
    }
  }

  async function loadAllMessages(client) {
    const Message = model.app.models.Message;
    const t0 = new Date().valueOf();
    const chats = await client.getAllChatIds();
    console.log('LOADED ALL CHATS IN', new Date() - t0);
    console.log(chats.length);
    const {importSettings} = settings;

    loadCounter(chats.length);
    let t = new Date();
    console.log(t);
    if (process.env.RESET === 'true' || importSettings) {
      await model.deleteAll();
      await Message.deleteAll();
      console.log("CLEAR");
    }

    const THREE_MONTHS = moment().subtract(3, 'M').valueOf() / 1000;
    let customDate = THREE_MONTHS;
    if (importSettings && importSettings.customStartDate) {
      customDate = importSettings.customStartDate.valueOf() / 1000;
    }
    const allMsgs = chats.map(async (id) => {
      let oc;
      try {
        oc = await client.getChatById(id);
      } catch (error) {
        console.log("FAILED", id);
        return
      }
      // TODO use while loop
      // let i = 0;
      // while (i < chats.length) {
      // const oc = chats[i];
      const t2 = new Date().valueOf();
      const currChat = await model.findById(oc.id);
      const chat = oc;
      const chatId = oc.id;

      if (currChat) {
        let agentId;
        if (!currChat.agentId && settings.randomizeNewChats) {
          agentId = assignAgent();
        }
        await currChat.updateAttributes({
          lastMessageAt: chat.t * 1000,
          agentId,
        });
      } else {
        try {
          let url;
          // if (!chat.kind) {
          //   return;
          // } else if (chat.kind === 'group') {
          //   url = await retrieveGroupLink(chatId);
          // }
          if (importSettings && importSettings.searchRegex) {
            const regex =new RegExp(importSettings.searchRegex);
            if (!regex.test(chat.formattedTitle)) {
              // console.log("skipped", chat.formattedTitle);
              return
            }
          }
          if (importSettings && !importSettings.includeGroups) {
            if (chat.kind === 'group') {
              // console.log("skipped", chat.formattedTitle);
              return
            }
          }
          console.log(chat.formattedTitle);
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
            url,
          });
        } catch (error) {
          console.log(123231, error);
        }
      }

      if (chat.t < customDate) {
        console.log('loaded only chat in', new Date() - t2);
        loadCounter(null, chatId);
        return;
      }
      let allMessages;
      try {
        allMessages = await client.getAllMessagesInChat(chatId, true);
      } catch (error) {
        console.log(7664732, error);
      }
      // console.log(
      //   'loaded %d messages on chat %s',
      //   allMessages.length,
      //   chatId,
      // );
      let ix = 0;
      let noMoreMessages;
      let multiRun = true;
      while (ix < 300 && !noMoreMessages && multiRun) {
        if (!allMessages.length) {
          allMessages = await tripleQueue.add(async () => {
            const t4load = new Date().valueOf();
            console.log('GETTING MSG');
            const newMsgs = await wp.loadEarlierMessages(chatId);
            console.log(
              'TOOK %d TO LOAD OLDER MSGS',
              new Date().valueOf() - t4load,
            );
            return newMsgs;
          });
        }
        if (!allMessages.length) {
          noMoreMessages = true;
          console.log('NO MORE MESSAGES', chatId);
        } else {
          // console.log(chatId, allMessages.length);
          const createMsgs = allMessages.map(async (m) => {
            try {
              await createMessage(m);
              // if (importSettings) {
              //   saveMedia(m, chatId);
              // }
            } catch (error) {
              // noMoreMessages = true;
              // console.log(error);
            }
            ix++;
          });
          allMessages = [];
          await Promise.all(createMsgs);
          multiRun = importSettings && importSettings.customStartDate && multiRun;
        }
      }
      if (ix >= 300) {
        console.log('message cap', ix);
      } else if (noMoreMessages) {
        console.log('loaded all msgs');
      } else if (!multiRun) {
        console.log('single run');
      }
      console.log('loaded chat and messages in', new Date() - t2, chatId);
      loadCounter(null, chatId);
      client.cutMsgCache();
      // i++;
      // }
    });
    await Promise.all(allMsgs);

    console.log('terminado', new Date(), new Date().valueOf() - t);
    console.log(customDate);
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
    return wp.forceRefocus();
  };

  Chat.remoteMethod('refocus', {
    description: 'Force refocus to open-wa session',
    returns: {root: true},
    http: {path: '/refocus', verb: 'post'},
  });

  Chat.setup = async (data) => {
    console.log(data);
    console.log('starting');
    settings = await Chat.app.models.Admin.get();
    console.log(settings);
    if (wp) {
      throw new Error('WhatApp already set');
    } else if (startedSetup) {
      // startedSetup = false;
      return;
      // await wa.kill();
      // return Chat.setup();
    }
    if (data && data.reset === true) {
      try {
        fs.unlinkSync(
          path.resolve(__dirname, '../../session/session.data.json'),
        );
      } catch (error) {
        console.log(error);
      }
    }
    startedSetup = true;
    io = Chat.app.io;
    if (!io) {
      console.log('no socket found. retrying');
      await sleep(100);
      startedSetup = false;
      return Chat.setup({});
    }
    let source = {executablePath: '/usr/bin/google-chrome-stable'};
    if (process.env.NODE_ENV === 'production') {
      source = {browserWSEndpoint: 'ws://browser:3000'};
    }
    if (settings.preventAutoInit && !data.force) {
      startedSetup = false;
      console.log('stopped due to auto init block');
      return;
    }
    try {
      const client = await wa.create({
        killProcessOnBrowserClose: false,
        restartOnCrash: start,
        licenseKey: '239D193F-26D442BD-AC392ED5-E9DB781F',
        disableSpins: true,
        hostNotificationLang: 'pt-br',
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
      });
      start(client);
    } catch (error) {
      console.log('Failed to start: ' + error);
      startedSetup = false;
    }
  };

  Chat.remoteMethod('setup', {
    description: 'Start whatsapp web',
    accepts: {
      arg: 'body',
      type: 'object',
      required: false,
      http: {source: 'body'},
    },
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
    const conversations = await wp.getAllChatIds();
    await Promise.all(
      conversations.map(async (c) => {
        const msgs = await wp.loadAndGetAllMessagesInChat(c, true);
        await wp.cutMsgCache();
        try {
          return await saveMsgAll(msgs);
        } catch (error) {
          console.log('failed to save', c);
        }
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

  Chat.kill = async (body) => {
    const {noRevoke} = body;
    try {
      if (!noRevoke) {
        fs.unlinkSync(
          path.resolve(__dirname, '../../session/session.data.json'),
        );
      }
      await wp.kill();
      startedSetup = false;
      wp = undefined;
      return true;
    } catch (error) {
      console.log(error);
      return error;
    }
  };

  Chat.remoteMethod('kill', {
    accepts: {
      arg: 'body',
      type: 'object',
      required: false,
      http: {source: 'body'},
    },
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

  Chat.sendSingleText = async (to, message) => {
    console.log(to, message);
    try {
      if (Array.isArray(to)) {
        const ids = await Promise.all(
          to.map(async (gId) => {
            return await sendMsgLoop(message, gId);
          }),
        );
        return ids;
      } else {
        return await queue.add(async () => await wp.sendText(to, message));
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  Chat.sendMessage = async (req, to, message, from, customId, quoted) => {
    const Message = model.app.models.Message;
    const agentId = from || req.accessToken.userId;
    sentMessages.push({to, message, agentId});
    const t = new Date();
    let wpMsg;
    console.log('QUOTE', quoted);
    if (quoted) {
      wpMsg = await queue.add(
        async () => await wp.reply(to, message, quoted, true),
      );
      console.log('answerId', wpMsg);
    } else {
      wpMsg = await queue.add(async () => await wp.sendText(to, message));
    }
    console.log('FINISHED', new Date().valueOf() - t, wpMsg);
    if (typeof wpMsg === 'string') {
      const msg = await Message.findById(wpMsg);
      if (msg) {
        const newMsg = {...msg.toJSON()};
        await msg.updateAttributes({
          agentId,
        });
        newMsg.customId = customId;
        newMsg.agentId = agentId;
        // io.sockets.emit('sentMessage', newMsg); TODO fix for proper WA fix
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
      {arg: 'quoted', type: 'string', required: false},
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
    const wpMsg = await wp.sendPtt(chatId, uri);
    console.log(wpMsg);
    saveMessageById(wpMsg);
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

      res.setHeader('Content-Type', msg.mimetype.split(';')[0]);
      res.setHeader('Content-Length', mediaData.length);

      // console.log(mediaData.toString('base64'));
      res.send(mediaData);
    } catch (error) {
      console.log('FAILED TO LOAD' + messageId);
    }
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

  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

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
    console.log('IMAGE SENT', new Date(), wpMsg);

    // const msgId = await new Promise((resolve) => {
    //   const interval = setInterval(async () => {
    //     const msg = await Message.findById(wpMsg);
    //     if (msg) {
    //       resolve(msg);
    //       clearInterval(interval);
    //     }
    //   }, 100);
    // });

    const recievedMsg = await saveMessageById(wpMsg);
    return true;
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
    try {
      if (!wp) {
        throw 'no wp yet';
      }
      const status = await wp.getConnectionState();
      let conn = (await wp.isConnected()) || status;

      battery = await wp.getBatteryLevel();
      return {
        battery,
        charging,
        online: conn,
        status: sts,
        connection: status,
        version: pkg.version,
      };
    } catch (error) {
      console.log(error);
      return error;
    }
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

  async function clearWAMessage() {
    const myChat = await wp.getChatById(myNumber);
    console.log('ME: ', myChat); //TODO: corrigir sempre retorna false
    if (!myChat) {
      return;
    }
    try {
      const msgs = await wp.getAllMessagesInChat(myNumber, true);
      console.log('CHAT', msgs);
      if (msgs.length === 1) {
        wp.deleteChat(myNumber);
      } else if (msgs.length) {
        console.log(msgs[msgs.length - 1]);
        const e = await wp.deleteMessage(
          myNumber,
          msgs[msgs.length - 1].id,
          true,
        );
        console.log(e);
      }
    } catch (error) {
      console.log('PAU PRA APAGAR MENSAGEM', error);
    }
  }

  Chat.deleteMsg = async (chatId, msgs) => {
    const Message = model.app.models.Message;
    try {
      await wp.deleteMessage(chatId, msgs, false);
    } catch (error) {
      console.log('Failed to delete message', error);
      throw 'cannot delete messages';
    }
    msgs.forEach((id) => {
      try {
        Message.destroyById(id);
      } catch (error) {
        console.log(error);
      }
    });
    io.sockets.emit('deleteMsgs', {chatId, deleted: msgs});
    return msgs;
  };

  Chat.remoteMethod('deleteMsg', {
    accepts: [
      {arg: 'chatId', type: 'string', required: true},
      {arg: 'msgs', type: 'array', required: true, http: {source: 'body'}},
    ],
    description: 'finds chat by chatId',
    returns: {root: true},
    http: {path: '/:chatId/deleteMessages', verb: 'delete'},
  });

  async function getGroups(launchName) {
    const {launch} = await Chat.app.models.Admin.get();
    let pattern;
    if (launch[launchName]) {
      pattern = launch[launchName].namePattern;
    } else {
      throw 'No lauch found';
    }

    const regex = new RegExp('.*' + pattern + '.*', 'i');
    const chats = await Chat.find({
      where: {and: [{name: {like: regex}}, {type: 'group'}]},
    });
    return chats;
  }

  Chat.launchGroupsParticipants = async (launchName) => {
    const chats = await getGroups(launchName);
    const participants = {};
    await Promise.all(
      chats.map(async (group) => {
        try {
          const n = await wp.getGroupMembersId(group.id);
          participants[group.id] = {
            name: group.name,
            participants: n.length,
            lastMessage: group.lastMessageAt,
            url: group.url,
          };
          return;
        } catch (error) {
          console.log(error);
        }
      }),
    );
    return participants;
  };

  Chat.remoteMethod('launchGroupsParticipants', {
    accepts: {arg: 'name', type: 'string', http: {source: 'query'}},
    description: 'count launch group participants',
    returns: {root: true},
    http: {path: '/launch/countAllGroupParticipants', verb: 'get'},
  });

  async function sendMsgLoop(msg, to) {
    try {
      sentMessages.push({to, msg});
      const msgId = await queue.add(async () => await wp.sendText(to, msg));
      return msgId;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  Chat.launchSendMessages = async ({msg, groups}) => {
    console.log(lastSent, lastSent > new Date().valueOf);
    if (lastSent > new Date().valueOf - 60000) {
      throw 'Need to wait 60 seconds to send message';
    }
    lastSent = new Date().valueOf();
    const id = await Promise.all(
      groups.map(async (gId) => {
        return await sendMsgLoop(msg, gId);
      }),
    );
    console.log(id);
    return id;
  };

  Chat.remoteMethod('launchSendMessages', {
    accepts: [
      {
        arg: 'body',
        type: 'object',
        required: true,
        http: {source: 'body'},
        required: true,
      },
    ],
    description: 'count launch group participants',
    returns: {root: true},
    http: {path: '/launch/sendBulkMsg', verb: 'post'},
  });

  async function retrieveGroupLink(gId) {
    try {
      const url = await wp.getGroupInviteLink(gId);
      return url;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  Chat.launchCreateGroup = async (launchName, {groupNumber}) => {
    const admin = Chat.app.models.Admin;
    const curr = await admin.get();
    const {defaultNumber, newGroupName, latestGroupNumber} = curr.launch[
      launchName
    ];
    if (!newGroupName) {
      throw 'No launch found';
    }
    const nextGroupNumber = groupNumber || latestGroupNumber + 1;
    const newGroupNameN = newGroupName.replace('&#', nextGroupNumber);
    const gp = await wp.createGroup(newGroupNameN, defaultNumber);
    await sleep(1000);
    const gId = gp.gid._serialized;
    if (Array.isArray(defaultNumber)) {
      defaultNumber.forEach((n) => wp.promoteParticipant(gId, n));
    } else {
      await wp.promoteParticipant(gId, defaultNumber);
    }
    await wp.setGroupToAdminsOnly(gId, true);
    await sleep(500);
    await sendMsgLoop('Grupo criado!', gId);
    const newData = {...curr.launch};
    newData[launchName].latestGroupNumber = nextGroupNumber;
    await admin.change({
      launch: newData,
    });
    return gId;
  };

  Chat.remoteMethod('launchCreateGroup', {
    accepts: [
      {arg: 'name', type: 'string', http: {source: 'query'}, required: true},
      {arg: 'body', type: 'object', http: {source: 'body'}},
    ],
    description: 'Creates a new group',
    returns: {root: true},
    http: {path: '/launch/createGroup', verb: 'post'},
  });

  Chat.dumpGroup = async (gId) => {
    const ids = await wp.getGroupMembersId(gId);
    await Promise.all(
      ids.map(async (i) => {
        if (i !== myNumber) {
          await wp.removeParticipant(gId, i);
        }
        return;
      }),
    );
    await wp.leaveGroup(gId);
    sleep(500);
    await wp.deleteChat(gId);
    return true;
  };

  Chat.remoteMethod('dumpGroup', {
    accepts: {
      arg: 'gid',
      type: 'string',
      required: true,
    },
    description: 'clears and delete a group',
    returns: {root: true},
    http: {path: '/launch/:gId/dump', verb: 'post'},
  });

  Chat.getReaders = async (msgId) => {
    const Message = Chat.app.models.Message;
    const msg = await Message.findById(msgId);
    const sentAt = new Date(msg.timestamp);
    const readers = await wp.getMessageReaders(msgId);
    const parsed = readers.map((r) => {
      return {
        timestamp: new Date(r.t * 1000),
        number: r.id,
        timeToOpen: new Date(r.t * 1000).valueOf() - sentAt.valueOf(),
      };
    });
    return parsed;
  };

  Chat.remoteMethod('getReaders', {
    accepts: {
      arg: 'messageId',
      type: 'string',
      required: true,
    },
    description: 'get message readers data',
    returns: {root: true},
    http: {path: '/launch/:messageId/readers', verb: 'get'},
  });

  Chat.getLaunchs = async () => {
    const data = await Chat.app.models.Admin.get();
    return data.launch;
  };

  Chat.remoteMethod('getLaunchs', {
    description: 'gets all launchs',
    returns: {root: true},
    http: {path: '/launch/list', verb: 'get'},
  });
};
