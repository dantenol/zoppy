import React, { useState, useEffect } from "react";
import moment from "moment";
import _ from "lodash";

import classes from "./index.module.css";

import sentImg from "../assets/images/share.svg";
import { parseText } from "../hooks/helpers";
import { FormattedP } from "../hooks/FormattedSpan";

const calendarTexts = {
  sameDay: "HH:mm",
  nextDay: "[Tomorrow]",
  lastDay: "[Ontem]",
  lastWeek: "dddd",
  sameElse: "DD/MM/YYYY",
};

const Chat = ({ data, handleClick, style }) => {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState();
  let agents;
  let backgroundColor = 'initial';
  if (window.agents) {
    agents = window.agents;
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
    } else if (lastMsg.type === "sale") {
      setMsg("Venda");
    } else if (lastMsg.type === "image") {
      setMsg("📷 Foto");
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
    <div className={classes.chat} style={style} onClick={handleClick}>
      <img src={data.profilePic} alt="Chat" />
      <div>
        <div className={classes.info}>
          <b>{data.displayName}</b>
          <p>{moment(data.lastMessageAt).calendar(calendarTexts)}</p>
        </div>
        <div className={classes.message}>
          {sent && <img src={sentImg} alt="Enviado" />}
          {msg && <FormattedP text={msg} enter={false} />}
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
