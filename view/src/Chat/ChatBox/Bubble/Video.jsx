import React from "react";
import moment from "moment";

import classes from "./index.module.css";
import FormattedSpan from "../../../hooks/FormattedSpan";

const Video = ({ message, isGroup, showMedia }) => {
  return (
    <div>
      <div>
        <div className={classes.message}>
          {isGroup && !message.mine && <p>{message.sender}</p>}
          <div
            className={classes.image}
            onClick={() => showMedia("video", message.messageId)}
            style={{
              backgroundImage: `url(data:image/jpg;base64,${message.body})`,
            }}
          ></div>
          {message.caption && (
            <div className={classes.msg}>
              <FormattedSpan text={message.caption} />
              <span className={classes.buffer}></span>
            </div>
          )}
        </div>
        <div className={classes.time}>
          <p>{moment(message.timestamp).format("HH:mm")}</p>
        </div>
      </div>
    </div>
  );
};

export default Video;
