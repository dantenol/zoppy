import React, { useState, useEffect } from "react";
import axios from "axios";
import _ from "lodash";
import "moment/locale/pt-br";

import classes from "./App.module.css";
import Conversations from "./Conversations";
import notificationSound from "./assets/audio/notification.ogg";
import { compareArrays, cloneArray } from "./hooks/helpers";

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
  const isMobile = window.innerWidth <= 600;
  const audio = new Audio(notificationSound);

  const loadChats = async () => {
    const res = await axios("http://localhost:3001/api/chats/all");

    res.data.forEach((c) => {
      const image = colors[Math.floor(Math.random() * 6)];
      c.profilePic = c.profilePic || image;
      c.firstClick = true;
      c.displayName = c.customName || c.name;
    });

    setChats(res.data);
    setLastUpdate(new Date());
  };

  const getLatestMsgs = async () => {
    const msgs = await axios(
      `http://localhost:3001/api/chats/latest/${lastUpdate.valueOf()}`
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
    loadChats();
  }, []);

  const findIdxById = (id) => {
    return chats.findIndex((c) => c.chatId === id);
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

    if (curr.firstClick) {
      const msgs = await loadMessages(curr.chatId);
      const url = await axios(
        `http://localhost:3001/api/chats/${curr.chatId}/profilePic`
      );

      updateChat(
        {
          messages: msgs,
          profilePic: url.data || curr.profilePic,
          firstClick: false,
          unread: 0,
        },
        curr.chatId
      );
    } else {
      updateChat({ unread: 0 }, curr.chatId);
    }
    await axios.patch(`http://localhost:3001/api/chats/${curr.chatId}/seen`);
  };

  const handleChangeName = async (name) => {
    try {
      await axios.patch(`http://localhost:3001/api/chats/${currentChat}/name`, {
        name,
      });

      const idx = findIdxById(currentChat);
      const curr = [...chats];
      curr[idx].displayName = name;
      setChats(curr);
    } catch (error) {
      console.log(error);
    }
  };

  const loadMessages = async (id) => {
    const msgs = await axios(`http://localhost:3001/api/chats/${id}/messages`);
    return msgs.data;
  };

  const addMessagesToConversations = (data) => {
    const curr = cloneArray(chats);

    data.forEach((entry) => {
      const idx = findIdxById(entry.chatId);
      if (idx < 0) {
        entry.profilePic = colors[Math.floor(Math.random() * 6)];
        entry.displayName = entry.name;
        entry.unread = 1;
        curr.unshift(entry);
        return;
      }

      const recievedMsgs = entry.messages.filter(
        (msg) =>
          curr[idx].messages.findIndex((m) => m.messageId === msg.messageId) < 0
      );

      curr[idx].messages.unshift(...recievedMsgs);
      curr[idx].lastMessageAt = entry.lastMessageAt;
      if (idx !== currentChat) {
        const newMsgs = entry.messages.filter((m) => !m.mine);
        console.log(newMsgs.length);
        curr[idx].unread += newMsgs.length || newMsgs.length;
      }
    });

    curr.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    if (!compareArrays(curr, chats)) {
      setChats(curr);

      const newIdx = findIdxById(currentChat);
      setSelectedChatIndex(newIdx);
      audio.play();
    }
  };

  const loadOldMessages = async () => {
    const idx = findIdxById(currentChat);
    const curr = [...chats];
    const msgsNumber = curr[idx].messages.length;
    const msgs = await axios(
      `http://localhost:3001/api/chats/${currentChat}/messages?filter={"skip":${msgsNumber}}`
    );
    console.log(curr, msgs.data);

    curr[idx].messages.push(...msgs.data);
    setChats(curr);
  };

  const send = async (message, to = currentChat) => {
    const msg = await axios.post(`http://localhost:3001/api/chats/${to}/send`, {
      message,
    });

    if (to === currentChat) {
      const curr = cloneArray(chats); // TODO achar maneira mais inteligente de evitar referência
      const idx = findIdxById(currentChat);
      curr[idx].lastMessageAt = msg.data.timestamp;
      curr[idx].messages.unshift(msg.data);

      setChats(curr);
      return true;
    } else {
      setModal(false);
      return false;
    }
  };

  const handleShowMedia = async (type, id) => {
    setModal({ type, id });
  };

  const handleUploadModal = async (e) => {
    e.persist();
    setModal({
      data: e.target.files[0],
      type: "photoUpload",
    });
    e.target.value = null;
  };

  const handleNewContactModal = async () => {
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
      `http://localhost:3001/api/chats/${currentChat}/sendMedia`,
      formData,
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/form-data",
        },
      }
    );

    let curr = cloneArray(chats) // TODO achar maneira mais inteligente de evitar referência
    const idx = findIdxById(currentChat);
    curr[idx].messages.unshift(msg.data);

    setChats(curr);
    setModal(false);
    return true;
  };

  return (
    <main className={classes.main}>
      <Modal
        file={modal}
        onClose={() => setModal(false)}
        handleSendImage={handleSendImage}
        handleNewChat={send}
      />
      <div className={classes.container}>
        <Conversations
          data={chats}
          handleQuery={() => {}}
          handleSelectChat={selectChat}
          handleNewContactModal={handleNewContactModal}
        />
        <Chat
          handleUpload={handleUploadModal}
          showMedia={handleShowMedia}
          handleSend={send}
          handleChangeName={handleChangeName}
          handleLoadMore={loadOldMessages}
          chat={chats[selectedChatIndex]}
        />
      </div>
    </main>
  );
};

export default App;
