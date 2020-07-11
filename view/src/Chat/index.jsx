import React from "react";
import classNames from "classnames";

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
  showing,
  handlePin,
  handleBack,
}) => {
  if (chat) {
    return (
      <div
        className={classNames(
          classes.chatContainer,
          "mobile-fullwidth",
          showing
        )}
      >
        <Header
          data={chat}
          handleBack={handleBack}
          handleChangeName={handleChangeName}
          handlePin={handlePin}
          />
        <ChatBox
          handleUpload={handleUpload}
          showMedia={showMedia}
          handleLoadMore={handleLoadMore}
          send={handleSend}
          more={chat.more}
          chatId={chat.chatId}
          handleChangeName={handleChangeName}
          messages={chat.messages}
          loading={chat.firstClick}
        />
      </div>
    );
  } else {
    return <NoChat showing={showing} />;
  }
};

export default Chat;
