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
  initialText,
  chatId,
  handleLoadMore,
  send,
  handleDelete,
  sendAudio,
  showMedia,
}) => {
  const [message, setMessage] = useState("");
  const [scroll, setScroll] = useState(false);
  const [replyId, setReplyId] = useState("");
  const isGroup = chatId.includes("-");
  const messagesEndRef = useRef();

  let lastDay = new Date(messages[0]?.timestamp || null);
  console.log(lastDay, chatId);

  const scrollToBottom = () => {
    setScroll(scroll + 1);
    messagesEndRef.current.scrollIntoView();
  };

  const handleReply = (id) => {
    setReplyId(id);
  };

  useEffect(() => {
    if (initialText && message === false) {
      setMessage(initialText);
      // } else if (message !== initialText) {
      //   setMessage("");
    }
  }, [initialText, chatId]);

  useEffect(() => {
    setScroll(0);
  }, [chatId]);

  useEffect(() => {
    if (scroll < 3 || messages[0]?.mine) {
      scrollToBottom();
    }
  }, [messages]);

  return (
    <div className={classes.chat}>
      <div className={classes.scroll}>
        <div className={classes.container}>
          <div className={classes.messages}>
            <div ref={messagesEndRef} id="bottom" />
            <>
              {messages.length &&
                messages.map((msg, i) => {
                  const m = { ...msg };
                  const last = lastDay;
                  if (typeof msg !== "object") {
                    return null;
                  }
                  const current = m.timestamp;
                  if (m.mine && !m.agentId) {
                    m.agentId = "wpp";
                  }
                  lastDay = current;
                  if (m === "none" || m.chatId !== chatId) {
                    return null;
                  } else if (i === messages.length - 1) {
                    return (
                      <Fragment key={m.messageId}>
                        <Bubble
                          handleReply={handleReply}
                          handleDelete={handleDelete}
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
                          handleReply={handleReply}
                          handleDelete={handleDelete}
                          showMedia={showMedia}
                          message={m}
                          isGroup={isGroup}
                        />
                      </Fragment>
                    );
                  } else {
                    return (
                      <Bubble
                        handleReply={handleReply}
                        showMedia={showMedia}
                        handleDelete={handleDelete}
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
      </div>
      <MessageField
        handleModal={handleModal}
        message={message}
        handleChangeMessage={setMessage}
        handleReply={handleReply}
        replyId={replyId}
        send={send}
        sendAudio={sendAudio}
      />
    </div>
  );
};

export default Chat;
