import React from "react";
import moment from "moment";

import classes from "./index.module.css";
import { parseText } from "../../../hooks/helpers";

const PureText = ({ message, isGroup }) => {
  const agents = JSON.parse(localStorage.agents);

  let senderName = 'WhatsApp'

  if (message.agentId) {
    senderName = agents[message.agentId].fullName
  }

  return (
    <div>
      <div className={classes.message}>
        {(isGroup && !message.mine) && <p>{message.sender}</p>}
        {message.agentId && <p>{senderName}</p>}
        <div className={classes.msg}>
          <span dangerouslySetInnerHTML={{__html: parseText(message.body)}}></span>
          <span className={classes.buffer}></span>
        </div>
      </div>
      <div className={classes.time}>
        <p>{moment(message.timestamp).format("HH:mm")}</p>
      </div>
    </div>
  );
};

export default PureText