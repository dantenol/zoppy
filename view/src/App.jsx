import React, { useState, useEffect } from "react";
import axios from "axios";
import "moment/locale/pt-br";

import { url, params } from "./connector";

import classes from "./App.module.css";
import Conversations from "./Conversations";
import notificationSound from "./assets/audio/notification.ogg";
import { cloneArray, deepDiff } from "./hooks/helpers";

import useInterval from "./hooks/useInterval";
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

const App = () => {
  const [chats, setChats] = useState(initialChats || []);
  const [currentChat, setCurrentChat] = useState();
  const [selectedChatIndex, setSelectedChatIndex] = useState();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [modal, setModal] = useState(null);
  const [newChat, setNewChat] = useState(null);
  const [urlChecked, setUrlChecked] = useState(false);
  const [page, setPage] = useState("conversations");
  const [lowBattery, setLowBattery] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [URLMessageNumber, setURLMessageNumber] = useState("");
  const isMobile = window.innerWidth <= 600;
  const audio = new Audio(notificationSound);
  const me = localStorage.userId;

  window.onload = () => {
    const reciever = window.document.getElementById("iframe").contentWindow;
    reciever.postMessage(window.location.hostname, "https://z.zoppy.app");
  };

  const checkOnline = async () => {
    try {
      const isSetup = (await axios(`${url}chats/online`, params)).data;
      if (isSetup) {
        loadChats();
      } else {
        alert(
          "Ops, sua conexão foi perdida. Continue para sincronizar novamente."
        );
        clearLoginData();
        window.location.reload();
      }
    } catch (error) {}
  };

  const getLatestMsgs = async () => {
    if (!localStorage.access_token) return;
    try {
      const msgs = await axios(
        `${url}chats/latest/${lastUpdate.valueOf() - 10000}`,
        params
      );

      if (msgs.data) {
        addMessagesToConversations(msgs.data);
      }
      setLastUpdate(new Date());
    } catch (error) {
      if (error.response.status === 401) {
        alert(
          "Sua conta está sendo utilizada em outro lugar. Entre novamente."
        );
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const getStatus = async () => {
    const { data } = await axios(`${url}chats/status`, params);
    if (!data.online) {
      setModal({ type: "offline" });
    } else if (data.online && modal && modal.type === "offline") {
      setModal(false);
    } else if (!data.charging && data.battery < 20) {
      setLowBattery(true);
    } else if (data.charging || data.battery > 20) {
      setLowBattery(false);
    }
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

  useInterval(() => {
    if (localStorage.connected && localStorage.access_token) {
      getLatestMsgs();
      getStatus();
    }
  }, 5000);

  useEffect(() => {
    window.location.hash = "";
    if (localStorage.access_token) {
      checkOnline();
    } else {
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
      window.location.reload();
    }
    window.addEventListener("load", function () {
      window.history.pushState({ noBackExitsApp: true }, "");
    });
    window.addEventListener("hashchange", navigator);
  }, []);

  useEffect(() => {
    if (newChat) {
      selectChat(newChat.chatId);
      goTo("chat");
      handleChangeName(newChat.displayName, newChat.chatId);
      setNewChat(false);
    } else if (chats.length && !urlChecked) {
      checkUrl();
    }
    cacheConversations();
  }, [chats]);

  const navigator = () => {
    const path = window.location.hash;

    if (!path) {
      setPage("conversations");
    } else if (path === "#chat") {
      setPage("chat");
    }
  };

  const loadChats = async () => {
    try {
      loadAgents();
      const res = await axios(`${url}chats/all`, params);
      res.data.forEach((c) => {
        const image = colors[Math.floor(Math.random() * 6)];
        c.profilePic = c.profilePic || image;
        c.firstClick = true;
        c.filtered = true;
        c.more = true;
        c.displayName = c.customName || c.name;
      });

      setChats(res.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.log(error.response);
      if (error.response.status === 401) {
        alert(
          "Fizemos alguns ajustes por aqui, e você vai ter que logar novamente"
        );
        clearLoginData();
        window.location.reload();
      } else {
        alert("Algo deu errado no login. Tente novamente mais tarde");
      }
    }
  };

  const findIdxById = (id, chatsArr = chats) => {
    return chatsArr.findIndex((c) => c.chatId === id);
  };

  const updateChat = (obj, id) => {
    const newChats = [...chats];
    let idx = findIdxById(id);

    let chat = chats[idx];
    chat = { ...chat, ...obj };
    newChats[idx] = chat;

    setChats(newChats);
  };

  const checkUrl = () => {
    const url = window.location.pathname.split("/")[1];
    if (url.length < 12) {
      return;
    }
    const number = /^55(\d{2})([89]?)(\d{4})(\d{4})$/g.exec(url);
    window.location.pathname = "";
    if (!number) {
      return;
    }
    const parsed = 55 + number[1] + number[3] + number[4] + "@c.us";
    const formatted = `(${number[1]}) ${number[2] || 9}${number[3]}-${
      number[4]
    }`;
    setURLMessageNumber(formatted);
    if (findIdxById(parsed) >= 0) {
      selectChat(parsed);
    } else {
      setModal({
        type: "newChat",
        newNumber: formatted,
      });
    }
    setUrlChecked(true);
  };

  const selectChat = async (id) => {
    let index = findIdxById(id);
    setSelectedChatIndex(index);
    const curr = chats[index];
    setCurrentChat(curr.chatId);
    goTo("chat");

    if (curr.firstClick) {
      let pic = {};
      const msgs = await loadMessages(curr.chatId);
      try {
        pic = await axios(`${url}chats/${curr.chatId}/profilePic`, params);
      } catch (error) {
        console.log("fail to load pic");
      }

      updateChat(
        {
          messages: msgs,
          profilePic: pic.data || curr.profilePic,
          firstClick: false,
          unread: 0,
        },
        curr.chatId
      );
    } else {
      updateChat({ unread: 0 }, curr.chatId);
    }
    axios.patch(`${url}chats/${curr.chatId}/seen`, {}, params);
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
      const curr = [...chats];
      curr[idx].displayName = name;
      setChats(curr);
    } catch (error) {
      console.log(error);
    }
  };

  const loadMessages = async (id) => {
    const msgs = await axios(`${url}chats/${id}/messages`, params);
    return msgs.data;
  };

  const addMessagesToConversations = (data) => {
    const curr = cloneArray(chats);
    let sound;

    data.forEach((entry) => {
      const idx = findIdxById(entry.chatId);
      if (idx < 0) {
        entry.profilePic = colors[Math.floor(Math.random() * 6)];
        entry.displayName = entry.name;
        entry.firstClick = true;
        entry.more = true;
        entry.unread = 1;
        entry.filtered = true;
        curr.unshift(entry);
        return;
      }

      const recievedMsgs = entry.messages.filter((msg) => {
        return !curr[idx].messages.find(
          (m) =>
            m.messageId === msg.messageId ||
            (msg.mine && msg.agentId === me) ||
            (msg.mine && msg.timestamp < new Date() - 200)
        );
      });

      if (!recievedMsgs.length) {
        return;
      }

      if (!sound && entry.chatId !== currentChat) {
        const notifyable = recievedMsgs.filter((m) => {
          return !m.mine && (!m.agentId || m.agentId === me);
        });
        if (notifyable.length) {
          sound = true;
        }
      }

      curr[idx].messages.unshift(...recievedMsgs);
      curr[idx].lastMessageAt = entry.lastMessageAt;
      if (idx !== selectedChatIndex) {
        const newMsgs = entry.messages.filter((m) => !m.mine);
        if (curr[idx].unread) {
          curr[idx].unread += newMsgs.length;
        } else {
          curr[idx].unread = newMsgs.length;
        }
      }
    });

    curr.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    if (deepDiff(curr, chats).length > 0) {
      setChats(curr);

      const newIdx = findIdxById(currentChat, curr);
      setSelectedChatIndex(newIdx);
      sound && audio.play();
    }
  };

  const loadOldMessages = async () => {
    const idx = findIdxById(currentChat);
    const curr = [...chats];
    const msgsNumber = curr[idx].messages.length;
    const msgs = await axios(
      `${url}chats/${currentChat}/messages?filter={"skip":${msgsNumber}}`,
      params
    );

    if (!msgs.data.length) {
      console.log("no msgs");
      // updateChat({more: false}, currentChat)
    } else {
      curr[idx].messages.push(...msgs.data);
    }
    setChats(curr);
  };

  const handleNewContact = async (name, to) => {
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
      chatId: to,
      displayName: name,
      messages: ["none"],
      type: "chat",
      timestamp: 0,
    };
    goTo("chat");
    setNewChat(chat);
    setModal(false);
  };

  const send = async (message, to = currentChat) => {
    let from;
    if (newChat) {
      to = newChat.chatId;
    }
    if (settings.manageUsersLocally && sessionStorage.user) {
      from = sessionStorage.user;
    }
    console.log("sending");
    const msg = await axios.post(
      `${url}chats/${to}/send`,
      {
        message,
        from,
      },
      params
    );

    if (to === currentChat) {
      const curr = cloneArray(chats);
      const idx = findIdxById(currentChat);
      curr[idx].lastMessageAt = msg.data.timestamp;
      if (curr[idx].messages[0].messageId === msg.data.messageId) {
        curr[idx].messages[0] = msg.data;
      } else {
        curr[idx].messages.unshift(msg.data);
      }
      setChats(curr);

      if (!curr[idx].agentLetter) {
        handleSetAgent();
      }
      return true;
    } else {
      setModal(false);
      return false;
    }
  };

  const handleShowMedia = (type, id) => {
    setModal({ type, id });
  };

  const handleUploadModal = (e) => {
    e.persist();
    setModal({
      data: e.target.files[0],
      type: "photoUpload",
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
    sessionStorage.setItem("user", user);
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

    let curr = cloneArray(chats); // TODO achar maneira mais inteligente de evitar referência
    const idx = findIdxById(currentChat);
    curr[idx].messages.unshift(msg.data);

    setChats(curr);
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
        window.location.reload();
      } else {
        await axios.post(
          `${url}chats/init`,
          {},
          {
            params: {
              access_token: res.data.id,
            },
          }
        );
        setInterval(async () => {
          setModal({
            type: "qr",
            token: res.data.id,
            update: Math.random(),
          });
          const check = (
            await axios(`${url}chats/online`, {
              params: {
                access_token: res.data.id,
              },
            })
          ).data;
          if (check) {
            localStorage.removeItem("chats");
            localStorage.setItem("connected", true);
            window.location.reload();
          }
        }, 2000);
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
        },
        params
      );

      const { agentId, agentLetter } = data;
      updateChat(
        {
          agentId,
        },
        currentChat
      );

      return Boolean(agentId);
    } catch (error) {
      console.log(error);
      alert("Algo deu errado ao tentar associar a conversa");
      throw new Error("error");
    }
  };

  const loadAgents = async () => {
    try {
      const { data } = await axios(`${url}agents/list`, params);
      data.wpp = { fullName: "WhatsApp" };
      localStorage.setItem("agents", JSON.stringify(data));
    } catch (err) {
      console.log(err);
    }
  };

  const handleQuery = (string, pinned) => {
    const curr = cloneArray(chats);
    const queried = curr.map((c) => {
      const lowerStr = string.toLowerCase();
      let str = true;
      let pin = true;
      if (string) {
        str = c.displayName.toLowerCase().includes(lowerStr);
      }
      if (pinned) {
        pin = c.agentId === me;
      }
      c.filtered = str && pin;
      return c;
    });

    setChats(queried);
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
        selectUser={selectUser}
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
          handleBack={() => goTo("conversations")}
          showing={String(isMobile && page === "chat")}
          handleUpload={handleUploadModal}
          showMedia={handleShowMedia}
          handleSend={send}
          handleChangeName={handleChangeName}
          handleLoadMore={loadOldMessages}
          chat={newChat || chats[selectedChatIndex]}
          handlePin={handleSetAgent}
        />
        <iframe hidden id="iframe" src="https://z.zoppy.app"></iframe>
      </div>
    </main>
  );
};

export default App;
