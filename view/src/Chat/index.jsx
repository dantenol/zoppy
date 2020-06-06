import React from "react";

import Header from "./Header";
import ChatBox from "./ChatBox";
import NoChat from "./NoChat";

import classes from "./index.module.css";

const Chat = ({ chat, handleChangeName }) => {
  if (chat) {
    return (
      <div className={classes.chatContainer}>
        <Header data={chat} handleChangeName={handleChangeName} />
        <ChatBox
          chatId={chat.chatId}
          handleChangeName={handleChangeName}
          messages={chat.messages}
          loading={chat.firstClick}
        />
      </div>
    );
  } else {
    return <NoChat />;
  }
};

export default Chat;
