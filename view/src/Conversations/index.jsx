import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import Search from "./Search";
import Chat from "./Chat";

const Conversations = ({
  data,
  handleQuery,
  handleSelectChat,
  handleNewContactModal,
  showing,
}) => {
  return (
    <div className={classNames(classes.container, "mobile-fullwidth", showing)}>
      <Search
        handleNewContact={handleNewContactModal}
        handleQuery={handleQuery}
      />
      <div className={classes.chatsList}>
        {data
          .filter((c) => c.filtered)
          .map((chat) => (
            <Chat
              key={chat.chatId}
              data={chat}
              handleClick={() => handleSelectChat(chat.chatId)}
            />
          ))}
      </div>
    </div>
  );
};

export default Conversations;
