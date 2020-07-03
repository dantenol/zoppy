import React from "react";
import moment from "moment";

import classes from "./index.module.css";
import { parseText } from "../../../hooks/helpers";

const urlRegex = /([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*))/g;

const PureText = ({ message, isGroup }) => {
  function urlify() {
    return message.body.split(" ").map((part, i) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith("http") ? part : "http://" + part;
        return (
          <a key={i} rel="noopener noreferrer" target="_blank" href={url}>
            {part}
          </a>
        );
      }
      return part + " ";
    });
  }

  const text = urlify();
  return (
    <div>
      <div className={classes.message}>
        {(isGroup && !message.mine) && <p>{message.sender}</p>}
        <div className={classes.msg}>
          <span dangerouslySetInnerHTML={{__html: parseText(text)}}></span>
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