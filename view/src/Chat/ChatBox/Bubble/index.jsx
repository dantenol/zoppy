import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import PureText from "./PureText";
import Image from "./Image";
import VoiceMessage from "./VoiceMessage";
import Sticker from "./Sticker";

const Bubble = ({ message, isGroup, showMedia }) => {
  const side = message.mine ? classes.right : classes.left;
  let opacity = 1;
  if (message.sending) {
    opacity = 0.8;
  }

  let BubbleComponent;
  if (message.type === "chat") {
    BubbleComponent = PureText;
  } else if (message.type === "image") {
    BubbleComponent = Image;
  } else if (message.type === "sticker") {
    BubbleComponent = Sticker;
  } else if (message.type === "ptt") {
    BubbleComponent = VoiceMessage;
  }

  if (BubbleComponent) {
    return (
      <div className={classNames(classes.container, side)} style={{ opacity }}>
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
