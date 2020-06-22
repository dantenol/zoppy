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

const App = () => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState();
  const [selectedChatIndex, setSelectedChatIndex] = useState();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [modal, setModal] = useState(null);
  const [page, setPage] = useState("conversations");
  const isMobile = window.innerWidth <= 600;
  const audio = new Audio(notificationSound);

  const loadChats = async () => {
    try {
      const res = await axios(`${url}chats/all`, params);

      res.data.forEach((c) => {
        const image = colors[Math.floor(Math.random() * 6)];
        c.profilePic = c.profilePic || image;
        c.firstClick = true;
        c.filtered = true;
        c.displayName = c.customName || c.name;
      });

      setChats(res.data);
      setLastUpdate(new Date());
    } catch (error) {
      alert("Algo deu errado no login. Tente novamente mais tarde");
    }
  };

  const getLatestMsgs = async () => {
    const msgs = await axios(
      `${url}chats/latest/${lastUpdate.valueOf()}`,
      params
    );

    if (msgs.data) {
      addMessagesToConversations(msgs.data);
    }
    setLastUpdate(new Date());
  };

  useInterval(() => {
    getLatestMsgs();
  }, 5000);

  useEffect(() => {
    if (localStorage.access_token) {
      loadChats();
    } else {
      setModal({
        type: "login",
      });
    }
  }, []);

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

  const selectChat = async (idx) => {
    setSelectedChatIndex(idx);
    const curr = chats[idx];
    setCurrentChat(curr.chatId);
    setPage("chat");

    if (curr.firstClick) {
      const msgs = await loadMessages(curr.chatId);
      const pic = await axios(`${url}chats/${curr.chatId}/profilePic`, params);

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

  const handleChangeName = async (name) => {
    try {
      await axios.patch(
        `${url}chats/${currentChat}/name`,
        {
          name,
        },
        params
      );

      const idx = findIdxById(currentChat);
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
        entry.unread = 1;
        entry.filtered = true;
        curr.unshift(entry);
        return;
      }

      const recievedMsgs = entry.messages.filter(
        (msg) =>
          curr[idx].messages.findIndex((m) => m.messageId === msg.messageId) < 0
      );

      if (!sound && entry.chatId !== currentChat) {
        const notifyable = recievedMsgs.filter((m) => {
          return !m.mine && (!m.agentId || m.agentId === localStorage.userId);
        });
        if (notifyable.length) {
          sound = true;
        }
      }

      curr[idx].messages.unshift(...recievedMsgs);
      curr[idx].lastMessageAt = entry.lastMessageAt;
      if (idx !== currentChat) {
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
      console.log(newIdx);
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
    console.log(curr, msgs.data);

    curr[idx].messages.push(...msgs.data);
    setChats(curr);
  };

  const send = async (message, to = currentChat) => {
    const msg = await axios.post(
      `${url}chats/${to}/send`,
      {
        message,
      },
      params
    );

    if (to === currentChat) {
      const curr = cloneArray(chats); // TODO achar maneira mais inteligente de evitar referência
      const idx = findIdxById(currentChat);
      curr[idx].lastMessageAt = msg.data.timestamp;
      curr[idx].messages.unshift(msg.data);

      if (!curr[idx].agentLetter) {
        handleSetAgent();
      }
      setChats(curr);
      return true;
    } else {
      setModal(false);
      handleSetAgent(false, to);
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
    });
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
    try {
      const res = await axios.post(`${url}agents/login`, {
        email,
        password: pwd,
      });
      console.log(res);
      localStorage.setItem("access_token", res.data.id);
      localStorage.setItem("userId", res.data.userId);
      setModal(false);
      loadChats();
    } catch (error) {
      console.log(error);
      alert("Email ou senha incorreto");
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
          agentLetter,
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
        pin = c.agentId === localStorage.userId;
      }
      c.filtered = str && pin;
      return c;
    });

    setChats(queried);
  };

  return (
    <main className={classes.main}>
      <Modal
        file={modal}
        onClose={() => setModal(false)}
        handleSendImage={handleSendImage}
        handleNewChat={send}
        handleLogin={login}
      />
      <div className={classes.container}>
        <Conversations
          showing={String(isMobile && page === "conversations")}
          data={chats}
          handleQuery={handleQuery}
          handleSelectChat={selectChat}
          handleNewContactModal={handleNewContactModal}
        />
        <Chat
          handleBack={() => setPage("conversations")}
          showing={String(isMobile && page === "chat")}
          handleUpload={handleUploadModal}
          showMedia={handleShowMedia}
          handleSend={send}
          handleChangeName={handleChangeName}
          handleLoadMore={loadOldMessages}
          chat={chats[selectedChatIndex]}
          handlePin={handleSetAgent}
        />
      </div>
    </main>
  );
};

export default App;
