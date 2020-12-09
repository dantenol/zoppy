import React, { useState } from "react";
import classNames from "classnames";

import deleteIcon from "../../../assets/images/delete.svg";
import copy from "../../../assets/images/copy.svg";
import reply from "../../../assets/images/reply.svg";

import classes from "./index.module.css";
import PureText from "./PureText";
import Image from "./Image";
import Sale from "./Sale";
import VoiceMessage from "./VoiceMessage";
import Sticker from "./Sticker";
import Video from "./Video";

const Options = ({ selected, mine, text }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    console.log("COPIED");
  };

  return (
    <div className={classNames(classes.options, classes[selected])}>
      <div>
        <img src={reply} alt="Copiar" className={classes.option} />
      </div>
      <div>
        {text ? (
          <img
            src={copy}
            alt="Copiar"
            className={classes.option}
            onClick={handleCopy}
          />
        ) : null}
      </div>
      <div>
        <img src={deleteIcon} alt="Copiar" className={classes.option} />
      </div>
    </div>
  );
};

const Bubble = ({ message, isGroup, showMedia, handleD }) => {
  const side = message.mine ? classes.right : classes.left;
  const inS = message.mine ? "message-out" : "message-in";
  const [selected, setSelected] = useState(false);
  let opacity = 1;
  let backgroundColor = "transparent";
  let clicked;
  if (message.sending) {
    opacity = 0.8;
  }
  if (selected === true) {
    backgroundColor = "#add8e66b";
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
  } else if (message.type === "ptt" || message.type === "audio") {
    BubbleComponent = VoiceMessage;
  }

  // const listenDoubleclick = (e) => {
  //   if (!selected && !clicked) {
  //     clicked = e.timeStamp;
  //   } else if (e.timeStamp - clicked < 200) {
  //     setSelected(true);
  //     setTimeout(() => {
  //       setSelected(false);
  //       clicked = 0;
  //     }, 5000);
  //   }
  // };

  if (message.type === "sale") {
    return (
      <div className={classes.container}>
        <Sale message={message} />
      </div>
    );
  } else if (BubbleComponent) {
    return (
      <div
        className={classNames(classes.container, side, inS)}
        style={{ opacity, backgroundColor }}
        data-id={message.messageId}
        // onClick={listenDoubleclick}
      >
        <BubbleComponent
          showMedia={showMedia}
          message={message}
          isGroup={isGroup}
        />
        <Options
          selected={selected}
          mine={message.mine}
          text={message.type === "chat" ? message.body : 0}
        />
      </div>
    );
  } else {
    return null;
  }
};

export default Bubble;
