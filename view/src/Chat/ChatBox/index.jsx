import React, { Fragment, useState } from "react";
import moment from "moment";

import classes from "./index.module.css";
import Spinner from "../Spinner";
import MessageField from "./MessageField";
import Bubble from "./Bubble";
import Day from "./Bubble/Day";

const Chat = ({
  messages,
  loading,
  chatId,
  handleLoadMore,
  send,
  showMedia,
}) => {
  const [message, setMessage] = useState("");
  const isGroup = chatId.includes("-");

  let lastDay = new Date(messages[0].timestamp);

  return (
    <div className={classes.chat}>
      <div className={classes.container}>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {messages.map((m, i) => {
              const last = lastDay;
              const current = m.timestamp;
              lastDay = current;
              if (!moment(last).isSame(lastDay, "day")) {
                return (
                  <Fragment key={m.messageId}>
                    <Day day={last} />
                    <Bubble
                      showMedia={showMedia}
                      message={m}
                      isGroup={isGroup}
                    />
                  </Fragment>
                );
              } else if (i === messages.length - 1) {
                return (
                  <Fragment key={m.messageId}>
                    <Bubble
                      showMedia={showMedia}
                      key={m.messageId}
                      message={m}
                      isGroup={isGroup}
                    />
                    <Day day={last} />
                  </Fragment>
                );
              } else {
                return (
                  <Bubble
                    showMedia={showMedia}
                    key={m.messageId}
                    message={m}
                    isGroup={isGroup}
                  />
                );
              }
            })}
            <div onClick={handleLoadMore} className={classes.loadMore}>
              Carregar mais
            </div>
          </>
        )}
      </div>
      <MessageField
        message={message}
        handleChangeMessage={setMessage}
        send={send}
      />
    </div>
  );
};

export default Chat;
