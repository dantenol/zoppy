import React, { useState, useEffect } from "react";
import moment from "moment";
import _ from "lodash";

import classes from "./index.module.css";

import sentImg from "../assets/images/share.svg";
import { parseText } from "../hooks/helpers";

const calendarTexts = {
  sameDay: "HH:mm",
  nextDay: "[Tomorrow]",
  lastDay: "[Ontem]",
  lastWeek: "dddd",
  sameElse: "DD/MM/YYYY",
};

const Chat = ({ data, handleClick }) => {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState();
  let agents = localStorage.agents;
  let backgroundColor = 'initial';
  if (agents) {
    agents = JSON.parse(agents);
    _.forEach(agents, (a, k) => {
      if (k === data.agentId) {
        backgroundColor = a.color;
      }
    });
  }

  const loadMsgText = () => {
    const lastMsg = data.messages[0];

    if (!lastMsg) {
      setMsg("~Sem mensagem");
    } else if (lastMsg.type === "chat") {
      setMsg(lastMsg.body);
    } else if (lastMsg.type === "ptt") {
      setMsg("Áudio");
    } else {
      setMsg(lastMsg.type);
    }

    if (lastMsg) {
      setSent(lastMsg.mine);
    }
  };

  useEffect(() => {
    loadMsgText();
  });

  return (
    <div className={classes.chat} onClick={handleClick}>
      <img src={data.profilePic} alt="Chat" />
      <div>
        <div className={classes.info}>
          <b>{data.displayName}</b>
          <p>{moment(data.lastMessageAt).calendar(calendarTexts)}</p>
        </div>
        <div className={classes.message}>
          {sent && <img src={sentImg} alt="Enviado" />}
          <p dangerouslySetInnerHTML={{ __html: parseText(msg, false) }}></p>
          {data.agentId && (
            <span className={classes.letter} style={{ backgroundColor }}>
              {agents[data.agentId].firstLetter}
            </span>
          )}
          {data.unread > 0 && (
            <span className={classes.unread}>{data.unread}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
