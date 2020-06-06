import React, { useState } from "react";
import moment from "moment";

import classes from "./index.module.css";
import Spinner from "../Spinner";
import MessageField from "./MessageField";
import Bubble from "./Bubble";

const calendarTexts = {
  sameDay: "[Hoje]",
  lastDay: "[Ontem]",
  lastWeek: "dddd",
  sameElse: "DD/MM/YYYY",
};

const Chat = ({ messages, loading, chatId }) => {
  const [message, setMessage] = useState("");
  const isGroup = chatId.includes("-");

  const send = () => {};
  let lastDay = 0;

  return (
    <div className={classes.chat}>
      <div className={classes.container}>
        {loading ? (
          <Spinner />
        ) : (
          messages.map((m) => {
            const last = lastDay;
            lastDay = m.timeStamp;
            if (!moment(last).isSame(lastDay, "day")) {
              return (
                <>
                  <div className={classes.day}>
                    {moment(lastDay).calendar(calendarTexts)}
                  </div>
                  <Bubble message={m} isGroup={isGroup} />;
                </>
              );
            } else {
              return <Bubble message={m} isGroup={isGroup} />;
            }
          })
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
