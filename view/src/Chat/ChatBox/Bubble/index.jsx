import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import PureText from "./PureText";

const Bubble = ({ message, isGroup }) => {
  const side = message.sender === "Você" ? classes.right : classes.left;

  let BubbleComponent;
  if (message.type === "chat" && !isGroup) {
    BubbleComponent = PureText
  }

  if (BubbleComponent) {
    return (
      <div className={classNames(classes.container, side)}>
        <BubbleComponent message={message} />
      </div>
    );
  } else {
    return null;
  }
};

export default Bubble;
