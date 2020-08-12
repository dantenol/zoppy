import React, { Fragment, useState, useRef, useEffect } from "react";
import moment from "moment";

import classes from "./index.module.css";
import Spinner from "../Spinner";
import MessageField from "./MessageField";
import Bubble from "./Bubble";
import Day from "./Bubble/Day";

const Chat = ({
  messages,
  more,
  handleModal,
  loading,
  chatId,
  handleLoadMore,
  send,
  showMedia,
}) => {
  const [message, setMessage] = useState("");
  const isGroup = chatId.includes("-");
  const messagesEndRef = useRef();

  let lastDay = new Date(messages[0].timestamp);

  const scrollToBottom = () => {
    messagesEndRef.current.scrollIntoView();
  };

  useEffect(scrollToBottom, []);

  return (
    <div className={classes.chat}>
      <div className={classes.scroll}>
        <div className={classes.container}>
          <div ref={messagesEndRef} />
          <>
            {messages.length &&
              messages.map((msg, i) => {
                const m = { ...msg };
                const last = lastDay;
                const current = m.timestamp;
                if (m.mine && !m.agentId) {
                  m.agentId = "wpp";
                }
                lastDay = current;
                if (m === "none" || m.chatId !== chatId) {
                  return;
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
                } else if (!moment(last).isSame(lastDay, "day")) {
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
            {loading && <Spinner />}
            {more && (
              <div onClick={handleLoadMore} className={classes.loadMore}>
                Carregar mais
              </div>
            )}
          </>
        </div>
      </div>
      <MessageField
        handleModal={handleModal}
        message={message}
        handleChangeMessage={setMessage}
        send={send}
      />
    </div>
  );
};

export default Chat;
