import React from "react";
import moment from "moment";

import { url } from "../../../connector";

import classes from "./index.module.css";

const Sticker = ({ message, isGroup }) => (
  <div className={classes.noBg}>
    <div className={classes.message}>
      {isGroup && !message.mine && <p>{message.sender}</p>}
      <div className={classes.sticker}>
        <img
          src={`${url}chats/download/${message.messageId}?access_token=${localStorage.access_token}`}
          alt="Adesivo"
        />
      </div>
    </div>
    <div className={classes.time}>
      <p>{moment(message.timestamp).format("HH:mm")}</p>
    </div>
  </div>
);

export default Sticker;
