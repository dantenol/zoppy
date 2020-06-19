import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import PureText from "./PureText";
import Image from "./Image";
import VoiceMessage from "./VoiceMessage";

const Bubble = ({ message, isGroup, showMedia }) => {
  const side = message.mine ? classes.right : classes.left;

  let BubbleComponent;
  if (message.type === "chat") {
    BubbleComponent = PureText;
  } else if (message.type === "image") {
    BubbleComponent = Image;
  } else if (message.type === "ptt") {
    BubbleComponent = VoiceMessage;
  }

  if (BubbleComponent) {
    return (
      <div className={classNames(classes.container, side)}>
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
