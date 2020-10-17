import React, { useState, useEffect } from "react";
import axios from "axios";
import _ from "lodash";
import "moment/locale/pt-br";
import io from "socket.io-client";
import { useImmer } from "use-immer";

import { url, params, webVersion } from "./connector";

import useInterval from "./hooks/useInterval";
import classes from "./App.module.css";
import Conversations from "./Conversations";
import notificationSound from "./assets/audio/notification.ogg";
import { idToPhone } from "./hooks/helpers";

import red from "./assets/images/red.svg";
import green from "./assets/images/green.svg";
import yellow from "./assets/images/yellow.svg";
import blue from "./assets/images/blue.svg";
import orange from "./assets/images/orange.svg";
import purple from "./assets/images/purple.svg";
import Chat from "./Chat";
import Modal from "./modal";

const colors = [red, green, yellow, blue, orange, purple];
const initialChats = JSON.parse(localStorage.chats || 0);
const initialSettings = JSON.parse(localStorage.settings || 0) || {
  manageUsersLocally: false,
  salesOptions: false,
};
const admin = JSON.parse(localStorage.adminSettings || 0);

window.webVersion = webVersion;

let socket, addedChats;
const App = () => {
  const [chats, setChats] = useImmer(initialChats || []);
  const [currentChat, setCurrentChat] = useState();
  const [selectedChatIndex, setSelectedChatIndex] = useState();
  const [modal, setModal] = useState(null);
  const [newChat, setNewChat] = useState(null);
  const [urlChecked, setUrlChecked] = useState(false);
  const [page, setPage] = useState("conversations");
  const [lowBattery, setLowBattery] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [URLMessageNumber, setURLMessageNumber] = useState("");
  const [URLMessageText, setURLMessageText] = useState("");
  const [adminSettings, setAdminSettings] = useState(admin || {});
  const isMobile = window.innerWidth <= 600;
  const audio = new Audio(notificationSound);
  const me = localStorage.salesAgentId || localStorage.userId;
  window.me = me;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const checkOnline = async () => {
    try {
      const isSetup = (await axios(`${url}chats/online`, params)).data;
      if (isSetup) {
        getStatus();
        await loadChats(socket);
        getUser(); // TODO carregar as configs do user
        window.socket = socket;
      } else {
        alert(
          "Ops, sua conexão foi perdida. Continue para sincronizar novamente."
        );
        clearLoginData();
        window.location.reload(true);
      }
    } catch (error) {
      if (error.response.status === 401) {
        alert(
          "Fizemos alguns ajustes por aqui, e você vai ter que logar novamente"
        );
        clearLoginData();
        window.location.reload(true);
      }
    }
  };

  const evaluateStatus = (data) => {
    const onlineStates = ["TIMEOUT", "CONNECTED", "PAIRING", "OPENING"];
    if (!onlineStates.includes(data.connection)) {
      console.log("OFFLINE", data);
      setModal({ type: "offline", reason: data.connection });
      axios.post(`${url}/chats/refocus`, {}, params);
    } else if (
      onlineStates.includes(data.connection) &&
      modal &&
      modal.type === "offline"
    ) {
      setModal(false);
    } else if (!data.charging && data.battery < 20) {
      setLowBattery(true);
    } else if (data.charging || data.battery > 20) {
      setLowBattery(false);
    }
  };

  const getStatus = async () => {
    const { data } = await axios(`${url}chats/status`, params);
    evaluateStatus(data);
  };

  const cacheConversations = () => {
    const parsed = chats.map(
      ({
        displayName,
        agentLetter,
        chatId,
        lastMessageAt,
        type,
        messages,
        profilePic,
      }) => ({
        displayName,
        agentLetter,
        chatId,
        lastMessageAt,
        type,
        messages: [messages[0]],
        filtered: true,
        firstClick: false,
        profilePic,
      })
    );
    localStorage.setItem("chats", JSON.stringify(parsed));
  };

  const goTo = (path) => {
    switch (path) {
      case "conversations":
        setPage("conversations");
        window.location.hash = "";
        break;
      case "chat":
        setPage("chat");
        window.location.hash = "chat";
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.agents = JSON.parse(localStorage.agents || 0);
    if (localStorage.access_token) {
      checkOnline();
      socket = io("https://localhost:3001", {
        secure: true,
        query: {
          access_token: localStorage.access_token,
        },
      });
      socket.on("reload", () => {
        window.location.reload(true);
      });
      socket.on("status", (data) => {
        console.log(data);
        evaluateStatus(data);
      });
    } else {
      localStorage.clear();
      setModal({
        type: "login",
      });
    }
    if (!localStorage.settings) {
      localStorage.setItem(
        "settings",
        JSON.stringify({
          manageUsersLocally: false,
          salesOptions: false,
        })
      );
      // window.location.reload(true);
    } else if (
      window.location.pathname === "/" &&
      JSON.parse(localStorage.settings).manageUsersLocally
    ) {
      setModal({ type: "selectUser" });
    }
    window.addEventListener("load", function () {
      window.history.pushState({ noBackExitsApp: true }, "");
    });
    window.addEventListener("hashchange", navigator);
  }, []);

  useEffect(() => {
    console.log("UPDATED");
    if (!socket) {
      return;
    }
    socket.on("loadedChats", (res) => {
      console.log(res);
      addChatWithoutDuplicate(res.data);
    });
    return () => {
      socket.off("loadedChats");
    };
  }, [adminSettings]);

  useEffect(() => {
    if (socket) {
      socket.on("newMessage", (data) => {
        console.log("recieved", data);
        addMessageToConversations(data);
      });
      socket.on("sentMessage", (data) => {
        addSentMessageToConversations(data);
      });
      socket.on("queryResult", (res) => {
        handleDBQuery(res);
      });
      socket.on("setAgent", (data) => {
        handleChangeAgent(data);
      });
    }
    if (newChat && chats[0].chatId === newChat.chatId) {
      updateAfterNewChat(chats[0].chatId);
    }
    return () => {
      if (socket) {
        socket.off("newMessage");
        socket.off("setAgent");
        socket.off("sentMessage");
        socket.off("queryResult");
      }
    };
  }, [chats, newChat]);

  useEffect(() => {
    let idx = findIdxById(currentChat);
    if (selectedChatIndex !== idx) {
      setSelectedChatIndex(idx);
    }
    if (chats.length && !urlChecked) {
      setUrlChecked(true);
      checkUrl();
    }
    cacheConversations();
  }, [chats]);

  useInterval(() => {
    if (modal && modal.type === "offline") {
      getStatus();
    }
  }, 5000);

  const navigator = () => {
    const path = window.location.hash;

    if (!path) {
      setPage("conversations");
    } else if (path === "#chat") {
      setPage("chat");
    }
  };

  const loadChats = async (socketS) => {
    loadAgents();
    loadSettings();
    console.log("requesting chats");
    socketS.emit("getChats");
  };

  const findIdxById = (id, chatsArr = chats) => {
    return chatsArr.findIndex((c) => c.chatId === id);
  };

  const updateChat = (obj, id) => {
    let idx = findIdxById(id);
    setChats((draft) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && idx >= 0) {
          const p = obj[key];
          draft[idx][key] = p;
        }
      }
    });
  };

  const getChat = async (id) => {
    const res = await axios(`${url}chats/findChat/${id}`, params);
    if (res.data.length) {
      handleDBQuery([res.data]);
    }
  };

  const checkUrl = async () => {
    const search = window.location.search.substring(1);
    let number, removeNine, parsed, formatted;
    if (search) {
      const parsed = JSON.parse(
        '{"' + search.replace(/&/g, '","').replace(/=/g, '":"') + '"}',
        (key, value) => (key === "" ? value : decodeURIComponent(value))
      );
      number = /^55(\d{2})([89]?)(\d{4})(\d{4})$/g.exec(parsed.phone);
      setURLMessageText(parsed.text);
      console.log(parsed.text);
    } else {
      const thisURL = window.location.pathname.split("/")[1];
      if (thisURL.length < 12) {
        return;
      }
      number = /^55(\d{2})([89]?)(\d{4})(\d{4})$/g.exec(thisURL);
    }
    if (!number) {
      return;
    }
    parsed = 55 + number[1] + number[2] + number[3] + number[4] + "@c.us";
    formatted = `(${number[1]}) ${number[2] || 9}${number[3]}-${number[4]}`;
    removeNine = parsed.substring(0, 4) + parsed.substring(5, parsed.length);
    setURLMessageNumber(formatted);
    if (findIdxById(removeNine) >= 0) {
      selectChat(removeNine);
    } else if (findIdxById(parsed) >= 0) {
      selectChat(parsed);
    } else {
      setModal({
        type: "newChat",
        newNumber: formatted,
      });
      getChat(number[3] + number[4]);
    }
    window.history.pushState({}, "Zoppy", "/");
    window.location.hash = "";
  };

  const selectChat = async (id) => {
    let index = findIdxById(id);
    setSelectedChatIndex(index);
    const curr = chats[index];
    setNewChat(false);
    loadOldMessages(null, id);
    setCurrentChat(curr.chatId);
    goTo("chat");
    let pic = {};

    try {
      pic = await axios(`${url}chats/${curr.chatId}/profilePic`, params);
    } catch (error) {
      console.log("fail to load pic");
    }
    const obj = { unread: 0, profilePic: pic.data || curr.profilePic };
    if (settings.isAdmin) {
      delete obj.unread;
    }
    if (curr.firstClick) {
      const msgs = await loadMessages(curr.chatId);

      updateChat({ messages: msgs, firstClick: false, ...obj }, curr.chatId);
    } else {
      updateChat(obj, curr.chatId);
    }
    if (!settings.isAdmin) {
      axios.patch(`${url}chats/${curr.chatId}/seen`, {}, params);
    }
  };

  const handleChangeName = async (name, id = currentChat) => {
    try {
      await axios.patch(
        `${url}chats/${id}/name`,
        {
          name,
        },
        params
      );

      const idx = findIdxById(id);
      setChats((draft) => {
        draft[idx].displayName = name;
      });
    } catch (error) {
      console.log(error);
    }
  };

  const loadMessages = async (id) => {
    const msgs = await axios(`${url}chats/${id}/messages`, params);
    return msgs.data;
  };

  const addMessageToConversations = (data) => {
    let sound;
    const msg = data.message;

    const idx = findIdxById(msg.chatId, chats);
    console.log(idx, data);
    if (!adminSettings.viewOthersChats && data.agentId && data.agentId !== me) {
      return;
    }
    if (idx < 0) {
      data.profilePic = colors[Math.floor(Math.random() * 6)];
      data.displayName = idToPhone(msg.chatId);
      data.firstClick = true;
      data.more = true;
      data.unread = 1;
      data.filtered = true;
      data.messages = [msg];
      data.chatId = msg.chatId;
      if (!msg.mine) {
        audio.play();
      }
      setChats((draft) => {
        draft.unshift(data);
      });
      return;
    }

    if (data.chatId !== currentChat && msg.type !== "sale") {
      const notifyable = !chats[idx].agentId || chats[idx].agentId === me;
      if (
        notifyable &&
        msg.timestamp >= chats[idx].lastMessageAt &&
        !msg.mine
      ) {
        sound = true;
      }
    }

    let unreadCount = chats[idx].unread;
    if (idx !== selectedChatIndex && !msg.mine) {
      if (unreadCount) {
        unreadCount += 1;
      } else {
        unreadCount = 1;
      }
    }

    setChats((draft) => {
      draft[idx].messages.unshift(data.message);
      draft[idx].lastMessageAt =
        data.message.timestamp || new Date().toISOString();
      draft[idx].unread = unreadCount;
      draft.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    });

    sound && audio.play();
    if (selectedChatIndex >= 0 && idx > selectedChatIndex) {
      setSelectedChatIndex(selectedChatIndex + 1);
    }
  };

  const handleRecieveChats = ({ data, count }) => {
    const chts = data.map((c) => {
      const image = colors[Math.floor(Math.random() * 6)];
      c.profilePic = c.profilePic || image;
      c.firstClick = true;
      c.filtered = true;
      c.more = true;
      c.displayName = c.customName || c.name;
      if (c.messages.length && c.messages[0].mine) {
        c.unread = 0;
      }
      return c;
    });

    if (!count) {
      console.log("STARTING");
      setChats(() => chts);
    } else {
      setChats((draft) => {
        draft.push(...chts);
        draft.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
      });
    }
  };

  const updateAfterNewChat = (chatId) => {
    console.log(findIdxById(chatId));
    console.log(chats[0]);
    handleSetAgent(false, chatId);
    setSelectedChatIndex(0);
    selectChat(chatId);
  };

  const addSentMessageToConversations = (msg) => {
    const data = { chatId: msg.chatId, message: msg };

    const idx = findIdxById(data.chatId);
    if (newChat && msg.agentId === me) {
      console.log("adding");
    } else if (idx < 0 && !adminSettings.viewOthersChats) {
      return;
    }
    if (idx < 0) {
      data.profilePic = colors[Math.floor(Math.random() * 6)];
      data.displayName = idToPhone(data.chatId);
      data.filtered = true;
      data.messages = [msg];
      setChats((draft) => {
        draft.unshift(data);
      });
      return;
    }

    const waitingMessageIdx = chats[idx].messages.findIndex(
      (m) => m.sending && m.body === msg.body
    );
    setChats((draft) => {
      _.remove(draft[idx].messages, (d) => d.messageId === msg.messageId);
      if (waitingMessageIdx >= 0) {
        draft[idx].messages[waitingMessageIdx] = msg;
      } else {
        draft[idx].messages.unshift(msg);
      }
      draft[idx].lastMessageAt = msg.timestamp || new Date().toISOString();
      draft[idx].unread = 0;
      draft[idx].messages.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)); // TODO improve it
      draft.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    });
    if (waitingMessageIdx >= 0) {
      setSelectedChatIndex(0);
    }
  };

  const addWithoutDuplicate = (msgArr) => {
    const idx = findIdxById(msgArr[0].chatId);
    setChats((draft) => {
      if (draft[idx] && draft[idx].messages[0] === "none") {
        draft[idx].messages.splice(0, 1);
      }
      msgArr.forEach((m) => {
        const i = draft[idx].messages.findIndex(
          (c) => c.messageId === m.messageId
        );
        if (i < 0) {
          draft[idx].messages.push(m);
        }
      });
    });
  };

  const addChatWithoutDuplicate = (chatArr, skipDuplicate) => {
    console.log(adminSettings);
    const onlyMine = !adminSettings.viewOthersChats;
    setChats((draft) => {
      if (!addedChats) {
        addedChats = 1;
        draft.splice(0, draft.length);
      }
      chatArr.forEach((o) => {
        const c = { ...o };
        const image = colors[Math.floor(Math.random() * 6)];
        const i = draft.findIndex((oc) => oc.chatId === c.chatId);
        c.profilePic = c.profilePic || image;
        c.filtered = true;
        c.displayName = c.name;
        c.more = true;
        c.firstClick = true;
        c.displayName = c.customName || c.name;
        if (onlyMine && c.agentId && window.me !== c.agentId) {
          return;
        }
        if (!c.messages || !c.messages.length) {
          c.messages = ["none"];
        } else if (c.messages.length && c.messages[0].mine) {
          c.unread = 0;
        }
        if (i < 0) {
          draft.push(c);
        } else if (!skipDuplicate) {
          draft[i] = c;
        }
      });
      draft.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
      const myPos = draft.findIndex((c) => c.chatId === currentChat);
      setSelectedChatIndex(myPos);
    });
  };

  const loadOldMessages = async (e, chatId = currentChat) => {
    const idx = findIdxById(chatId);
    const curr = [...chats];
    let msgsNumber = curr[idx].messages.length;
    if (curr[idx].messages[0] === "none") {
      msgsNumber = 0;
    }
    const msgs = await axios(
      `${url}chats/${chatId}/messages?filter={"skip":${msgsNumber}}`,
      params
    );

    if (!msgs.data.length) {
      console.log("no msgs");
      updateChat({ more: false }, chatId);
    } else {
      addWithoutDuplicate(msgs.data);
    }
  };

  const backgroundContactQuery = async (to) => {
    const removeNine = to.substring(0, 4) + to.substring(5, to.length);
    socket.emit("queryChat", { string: removeNine });
  };

  const handleNewContact = async (name, to) => {
    const removeNine = to.substring(0, 4) + to.substring(5, to.length);
    const idx2 = findIdxById(removeNine);
    if (idx2 >= 0) {
      selectChat(removeNine);
      setModal(false);
      return;
    }
    const idx = findIdxById(to);
    if (idx >= 0) {
      selectChat(to);
      setModal(false);
      return;
    }
    const contact = await axios.get(`${url}chats/${to}/check`, params);
    if (!contact.data) {
      alert("Esse número não tem WhatsApp! Tente novamente");
      setModal(false);
      setModal({ type: "newChat" });
      return;
    }
    const chat = {
      profilePic: colors[Math.floor(Math.random() * 6)],
      chatId: contact.data,
      displayName: name,
      messages: ["none"],
      type: "chat",
      timestamp: 0,
    };
    goTo("chat");
    setNewChat(chat);
    setModal(false);
  };

  const send = async (rawMessage, to = currentChat, attempt = 0) => {
    let from;
    const message = rawMessage.trim();
    // setLastSentMessage(new Date());
    if (!message) {
      return;
    }
    if (newChat) {
      to = newChat.chatId;
    }
    if (settings.manageUsersLocally && localStorage.salesAgentId) {
      from = localStorage.salesAgentId;
    }
    console.log("sending");
    let id = new Date().valueOf();
    const data = {
      messageId: id,
      mine: true,
      agentId: me,
      body: message,
      timestamp: new Date().toISOString(),
      sending: true,
      type: "chat",
      sender: "Você",
      chatId: to,
    };
    if (to === currentChat) {
      const idx = selectedChatIndex;
      if (!chats[idx].agentId) {
        handleSetAgent();
      }
      setChats((draft) => {
        draft[idx].messages.unshift(data);
      });
    } else {
      setNewChat({ ...newChat, messages: [data] });
    }

    try {
      await axios.post(
        `${url}chats/${to}/send`,
        {
          message,
          from,
          customId: id,
        },
        params
      );
    } catch (error) {
      console.log(error.response);
      if (attempt < 3) {
        setTimeout(async () => {
          await send(message, to, attempt + 1);
        }, 200);
      } else {
        throw error;
      }
    }
  };

  const handleSendAudio = async (e) => {
    const file = e;
    const formData = new FormData();
    formData.append("", file);

    const msg = await axios.post(
      `${url}chats/${currentChat}/sendAudio`,
      formData,
      {
        ...params,
        headers: {
          accept: "application/json",
          "Content-Type": "application/form-data",
        },
      }
    );
    console.log(msg);
  };

  const handleShowMedia = (type, id) => {
    setModal({ type, id });
  };

  const handleUploadModal = (e) => {
    e.persist();
    console.log(e.target.files[0]);
    setModal({
      data: e.target.files[0],
      type: "photoUpload",
      format: e.target.files[0].type.includes("video") ? "video" : "photo",
    });
    e.target.value = null;
  };

  const handleNewContactModal = () => {
    setModal({
      type: "newChat",
      newNumber: URLMessageNumber,
    });
    setURLMessageNumber("");
  };

  const selectUser = (user) => {
    localStorage.setItem("salesAgentId", user);
    const thisUser = window.agents[user];
    localStorage.setItem("salesAgentProfile", JSON.stringify(thisUser));
    setModal(false);
  };

  const handleSendImage = async (caption) => {
    const file = modal.data;
    const formData = new FormData();
    formData.append("", file);
    formData.append("caption", caption);

    const msg = await axios.post(
      `${url}chats/${currentChat}/sendMedia`,
      formData,
      {
        ...params,
        headers: {
          accept: "application/json",
          "Content-Type": "application/form-data",
        },
      }
    );

    // const idx = findIdxById(currentChat);

    // setChats((draft) => {
    //   draft[idx].messages.unshift(msg.data);
    // });
    setModal(false);
    return true;
  };

  const login = async (email, pwd) => {
    let type = "username";
    if (email.includes("@")) {
      type = "email";
    }
    try {
      const res = await axios.post(`${url}agents/login`, {
        [type]: email,
        password: pwd,
      });
      localStorage.setItem("access_token", res.data.id);
      localStorage.setItem("userId", res.data.userId);
      const isSetup = (
        await axios(`${url}chats/online`, {
          params: {
            access_token: res.data.id,
          },
        })
      ).data;
      console.log(isSetup);
      if (isSetup) {
        localStorage.setItem("connected", true);
        window.location.reload(true);
      } else {
        // const sure = window.confirm(
        //   "O celular está desconectado da Zoppy. Confira sua conexão. Caso esteja com o celular em mãos e queira configurar novamente, pressione ok"
        // );
        // if (!sure) {
        //   window.alert("Avise o responsável sobre o erro de conexão!")
        //   return;
        // }
        socket = io("https://localhost:3001", {
          secure: true,
          query: {
            access_token: localStorage.access_token,
          },
        });
        socket.on("scanned", () => {
          console.log("SCANNED");
          setModal({ type: "qr", status: "scanned" });
        });
        socket.on("reload", () => {
          window.location.reload(true);
        });
        socket.on("QR", (img) => {
          console.log(img);
          setModal({
            type: "qr",
            qr: img,
          });
        });
        await axios.post(
          `${url}chats/init`,
          {},
          {
            params: {
              access_token: res.data.id,
            },
          }
        );
        localStorage.removeItem("chats");
        setModal({
          type: "qr",
        });
      }
    } catch (error) {
      console.log(error);
      alert("Email ou senha incorreto");
    }
  };

  const clearLoginData = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("access_token");
    localStorage.removeItem("connected");
  };

  const logout = async (force) => {
    if (settings.manageUsersLocally && !force) {
      setModal({ type: "selectUser" });
    } else {
      await axios.post(`${url}agents/logout`, {}, params);
      clearLoginData();
      setModal({ type: "login" });
    }
  };

  const handleSetAgent = async (val, chat = currentChat) => {
    try {
      const { data } = await axios.patch(
        `${url}chats/${chat}/claim`,
        {
          remove: !!val,
          customId: localStorage.salesAgentId,
        },
        params
      );
    } catch (error) {
      console.log(error.response);
      alert(error.response.message);
      throw new Error("error");
    }
  };

  const handleChangeAgent = (data) => {
    console.log(data);
    const onlyMine = !adminSettings.viewOthersChats;
    const { agentId, agentLetter } = data;
    const idx = findIdxById(data.chatId);
    if (idx >= 0) {
      setChats((draft) => {
        console.log(idx);
        draft[idx].agentId = agentId;
        draft[idx].agentLetter = agentLetter;
        if (onlyMine && agentId && agentId !== me) {
          draft.splice(idx, 1);
        }
      });
    } else if (onlyMine && !agentId) {
      console.log("searching");
      handleQuery(data.chatId.slice(0, 11));
      handleQuery("");
    }
  };

  const loadAgents = async () => {
    try {
      const { data } = await axios(`${url}agents/list`, params);
      data.wpp = { fullName: "WhatsApp" };
      window.agents = data;
      localStorage.setItem("agents", JSON.stringify(data));
    } catch (err) {
      console.log(err);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await axios(`${url}admins`, params);
      localStorage.setItem("adminSettings", JSON.stringify(data));
      console.log(data);
      setAdminSettings(data);
    } catch (err) {
      console.log(err);
    }
  };

  const getUser = async () => {
    try {
      const { data } = await axios(
        `${url}agents/${localStorage.userId}`,
        params
      );
      if (data.settings) {
        setSettings(data.settings);
      }
      if (data.settings && data.settings.isAdmin && adminSettings) {
        console.log(data.settings);
        const newAdm = { ...adminSettings, viewOthersChats: true };
        localStorage.setItem("settings", JSON.stringify(newAdm));
        setAdminSettings(newAdm);
        socket.emit("getChats");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDBQuery = ({ res, pinned }) => {
    const queried = [];
    if (!res) {
      return;
    }
    res.forEach((c) => {
      if (pinned && c.agentId === me) {
        queried.push(c);
      } else if (!pinned) {
        queried.push(c);
      }
    });
    if (queried.length) {
      addChatWithoutDuplicate(queried, true);
    }
  };

  const handleQuery = (string, pinned) => {
    socket.emit("queryChat", { pinned, string });
    setChats((draft) => {
      draft.map((c) => {
        const lowerStr = string.toLowerCase();
        let str = true;
        let pin = true;
        if (string) {
          str =
            (c.displayName && c.displayName.toLowerCase().includes(lowerStr)) ||
            c.chatId.slice(0, 12).includes(lowerStr);
        }
        if (pinned) {
          pin = c.agentId === me;
        }
        c.filtered = str && pin;
        return c;
      });
    });
  };

  const handleSettingsModal = () => {
    setModal({
      type: "settings",
      settings,
    });
  };

  const handleChangeSettings = (data) => {
    setSettings(data);
    localStorage.setItem("settings", JSON.stringify(data));
    if (!data.manageUsersLocally) {
      localStorage.removeItem("salesAgentProfile");
      localStorage.removeItem("salesAgentId");
    }
  };

  const saveSales = async (data) => {
    data.agentId = me;
    data.chatId = currentChat;
    const salesMsg = await axios.post(`${url}sales/new`, data, params);
    console.log(salesMsg);
    addMessageToConversations({
      chatId: salesMsg.data.chatId,
      message: salesMsg.data,
    });
    setModal(false);
  };

  const handleModal = (type) => {
    setModal({ type });
  };

  return (
    <main className={classes.main}>
      <Modal
        file={modal}
        onClose={() => setModal(false)}
        handleSendImage={handleSendImage}
        handleNewChat={handleNewContact}
        handleChangeSettings={handleChangeSettings}
        handleLogin={login}
        handleUpload={handleUploadModal}
        saveSales={saveSales}
        selectUser={selectUser}
        passiveSearch={backgroundContactQuery}
      />
      <div className={classes.container}>
        <Conversations
          showing={String(isMobile && page === "conversations")}
          data={chats}
          handleSettingsModal={handleSettingsModal}
          logout={logout}
          handleQuery={handleQuery}
          handleSelectChat={selectChat}
          lowBattery={lowBattery}
          handleNewContactModal={handleNewContactModal}
        />
        <Chat
          initialText={URLMessageText}
          handleBack={() => goTo("conversations")}
          showing={String(isMobile && page === "chat")}
          handleModal={handleModal}
          handleSendAudio={handleSendAudio}
          showMedia={handleShowMedia}
          handleSend={send}
          handleChangeName={handleChangeName}
          handleLoadMore={loadOldMessages}
          chat={newChat || chats[selectedChatIndex]}
          handlePin={handleSetAgent}
        />
      </div>
    </main>
  );
};

export default App;
