import React from "react";
import moment from "moment";

import classes from "./index.module.css";

const urlRegex = /([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/g;

export default ({ message }) => {
  function urlify() {
    return message.body.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part}>
            {part}
          </a>
        );
      }
      return part;
    });
  }

  const text = urlify();
  return (
    <div>
      <div className={classes.message}>
        <span>{text}</span>
        <span className={classes.buffer}></span>
      </div>
      <div className={classes.time}>
        <p>{moment(message.timestamp).format("HH:mm")}</p>
      </div>
    </div>
  );
};
