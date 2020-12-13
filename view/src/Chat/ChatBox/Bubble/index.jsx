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

const Options = ({ selected, mine, text, handleDelete, handleReply }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    console.log("COPIED");
  };

  return (
    <div className={classNames(classes.options, classes[selected])}>
      <div>
        <img src={reply} alt="responder" className={classes.option} onClick={handleReply}/>
      </div>
      {text ? (
        <div>
          <img
            src={copy}
            alt="copiar"
            className={classes.option}
            onClick={handleCopy}
          />
        </div>
      ) : null}
      {mine ? (
        <div>
          <img
            src={deleteIcon}
            alt="excluir mensagem"
            className={classes.option}
            onClick={handleDelete}
          />
        </div>
      ) : null}
    </div>
  );
};

const Bubble = ({ message, isGroup, showMedia, handleDelete, handleReply }) => {
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

  const listenDoubleclick = (e) => {
    if (!selected && !clicked) {
      console.log(1, clicked, e.timeStamp - clicked);
      clicked = 1;
      setTimeout(() => {
        clicked = 0;
      }, 200);
    } else if (clicked) {
      console.log(2);
      setSelected(true);
      setTimeout(() => {
        setSelected(false);
        clicked = 0;
      }, 5000);
    }
  };

  const reply = () => {
    console.log(message.messageId);
    handleReply(message.messageId);
  }

  const deleteMsg = () => {
    console.log(message.messageId);
    handleDelete(message.messageId)
  }

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
        onClick={listenDoubleclick}
      >
        <BubbleComponent
          showMedia={showMedia}
          message={message}
          isGroup={isGroup}
        />
        <Options
          handleDelete={deleteMsg}
          handleReply={reply}
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
