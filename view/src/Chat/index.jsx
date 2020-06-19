import React from "react";

import Header from "./Header";
import ChatBox from "./ChatBox";
import NoChat from "./NoChat";

import classes from "./index.module.css";

const Chat = ({
  chat,
  handleChangeName,
  handleSend,
  handleLoadMore,
  handleUpload,
  showMedia,
}) => {
  if (chat) {
    return (
      <div className={classes.chatContainer}>
        <Header
          handleUpload={handleUpload}
          data={chat}
          handleChangeName={handleChangeName}
        />
        <ChatBox
          showMedia={showMedia}
          handleLoadMore={handleLoadMore}
          send={handleSend}
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
