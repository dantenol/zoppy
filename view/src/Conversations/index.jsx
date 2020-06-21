import React, { useState } from "react";
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
  const [query, setQuery] = useState("");

  const handleChangeQuery = (val) => {
    setQuery(val);
    handleQuery(val);
  };

  return (
    <div
      className={classNames(classes.container, "mobile-fullwidth", showing)}
    >
      <Search
        value={query}
        handleNewContact={handleNewContactModal}
        handleChange={handleChangeQuery}
      />
      <div className={classes.chatsList}>
        {data.map((chat, i) => (
          <Chat
            key={chat.chatId}
            data={chat}
            handleClick={() => handleSelectChat(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default Conversations;
