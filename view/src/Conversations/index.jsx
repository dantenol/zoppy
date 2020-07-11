import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import Search from "./Search";
import Chat from "./Chat";
import LowBattery from "./LowBattery";
import Header from "./Header";
import Spinner from "../Chat/Spinner";

const Conversations = ({
  data,
  handleQuery,
  handleSelectChat,
  handleNewContactModal,
  handleSettingsModal,
  showing,
  logout,
  lowBattery,
}) => {
  return (
    <div className={classNames(classes.container, "mobile-fullwidth", showing)}>
      {localStorage.agents && localStorage.userId && (
        <Header logout={logout} handleSettings={handleSettingsModal} />
      )}
      <Search
        handleNewContact={handleNewContactModal}
        handleQuery={handleQuery}
      />
      {lowBattery && <LowBattery />}
      <div className={classes.chatsList}>
        {data.length ? (
          data
            .filter((c) => c.filtered)
            .map((chat) => (
              <Chat
                key={chat.chatId}
                data={chat}
                handleClick={() => handleSelectChat(chat.chatId)}
              />
            ))
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  );
};

export default Conversations;
