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
        {data.length ? (
          data
            .filter((c) => c.filtered)
            .map((chat, i) => (
              <Chat
                key={chat.chatId}
                data={chat}
                handleClick={() => handleSelectChat(i)}
              />
            ))
        ) : (
          <a
            onClick={() => {
              window.localStorage.clear();
              window.location.reload();
            }}
          >
            Clique aqui se estiver tendo problemas para entrar
          </a>
        )}
      </div>
    </div>
  );
};

export default Conversations;
