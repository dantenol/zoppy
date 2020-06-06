import React, { useState, useEffect } from "react";
import axios from "axios";
import "moment/locale/pt-br";

import classes from "./App.module.css";
import Conversations from "./Conversations";

import red from "./assets/images/red.svg";
import green from "./assets/images/green.svg";
import yellow from "./assets/images/yellow.svg";
import blue from "./assets/images/blue.svg";
import orange from "./assets/images/orange.svg";
import purple from "./assets/images/purple.svg";
import Chat from "./Chat";

const colors = [red, green, yellow, blue, orange, purple];

const App = () => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState();

  const loadChats = async () => {
    const chats = await axios("http://localhost:3001/api/chats/all");

    chats.data.forEach((c) => {
      const image = colors[Math.floor(Math.random() * 6)];
      c.profilePic = c.profilePic || image;
      c.firstClick = true;
    });

    setChats(chats.data);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const updateChat = (obj, idOrIndex = selectChat.chatId) => {
    const newChats = [...chats];
    let idx = idOrIndex;
    if (typeof id === "string") {
      idx = chats.findIndex((c) => c.chatId === idOrIndex);
    }

    let chat = chats[idx];
    chat = { ...chat, ...obj };
    newChats[idx] = chat;

    setChats(newChats);
  };

  const selectChat = async (idx) => {
    setCurrentChat(idx);
    const curr = chats[idx];

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
        idx
      );
    } else {
      updateChat({ unread: 0 });
    }
    axios.patch(`http://localhost:3001/api/chats/${curr.chatId}/seen`);
  };

  const handleChangeName = (name) => {};

  const loadMessages = async (id) => {
    const msgs = await axios(`http://localhost:3001/api/chats/${id}/messages`);
    return msgs.data;
  };

  return (
    <main className={classes.main}>
      <div className={classes.container}>
        <Conversations
          data={chats}
          handleQuery={() => {}}
          handleSelectChat={selectChat}
        />
        <Chat handleChangeName={handleChangeName} chat={chats[currentChat]} />
      </div>
    </main>
  );
};

export default App;
