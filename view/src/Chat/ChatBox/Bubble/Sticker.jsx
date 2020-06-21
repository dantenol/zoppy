import React from "react";
import moment from "moment";
import Image from "react-image-webp";

import { url } from "../../../connector.json";

import classes from "./index.module.css";

const Sticker = ({ message, isGroup }) => (
  <div>
    <div className={classes.message}>
      {isGroup && !message.mine && <p>{message.sender}</p>}
      <div className={classes.image}>
        <picture>
          <Image
            webp={`${url}chats/download/${message.messageId}`}
          />
        </picture>
      </div>
    </div>
    <div className={classes.time}>
      <p>{moment(message.timestamp).format("HH:mm")}</p>
    </div>
  </div>
);

export default Sticker;