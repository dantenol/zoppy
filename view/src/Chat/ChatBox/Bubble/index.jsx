import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import PureText from "./PureText";
import Image from "./Image";
import Sale from "./Sale";
import VoiceMessage from "./VoiceMessage";
import Sticker from "./Sticker";
import Video from "./Video";

const Bubble = ({ message, isGroup, showMedia }) => {
  const side = message.mine ? classes.right : classes.left;
  const inS = message.mine ? 'message-out' : 'message-in';
  let opacity = 1;
  if (message.sending) {
    opacity = 0.8;
  }

  let BubbleComponent;
  if (message.type === "chat") {
    BubbleComponent = PureText;
  } else if (message.type === "image") {
    BubbleComponent = Image;
  } else if (message.type === "video") {
    BubbleComponent = Video;
  } else if (message.type === "sticker") {
    BubbleComponent = Sticker;
  } else if (message.type === "ptt" || message.type === "audio" ) {
    BubbleComponent = VoiceMessage;
  }

  if (message.type ==='sale') {
    return (
      <div className={classes.container}>
        <Sale message={message} />
      </div>
    );
  } else if (BubbleComponent) {
    return (
      <div className={classNames(classes.container, side, inS)} style={{ opacity }} data-id={message.messageId}>
        <BubbleComponent
          showMedia={showMedia}
          message={message}
          isGroup={isGroup}
        />
      </div>
    );
  } else {
    return null;
  }
};

export default Bubble;
