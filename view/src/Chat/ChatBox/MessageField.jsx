import React, { useState, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";

import classes from "./index.module.css";
import sendImg from "../../assets/images/send.svg";
import emojiFace from "../../assets/images/emoji.svg";
import camera from "../../assets/images/camera.svg";
import outslideClickListener from "../../hooks/outslideClickListener";

const MessageField = ({ message, handleChangeMessage, send, handleUpload }) => {
  const [rows, setRows] = useState(1);
  const [sending, setSending] = useState(false);
  const [emoji, setEmoji] = useState();
  const emojiRef = useRef();

  const closeEmoji = () => {
    setEmoji(false);
  };

  outslideClickListener(emojiRef, closeEmoji);

  const enterListener = (e) => {
    if (e.keyCode === 13 && !e.shiftKey && !sending) {
      e.preventDefault();
      if (message) {
        handlesendButton();
      }
    }
  };

  const handlesendButton = () => {
    send(message);
    handleChangeMessage("");
    setRows(1);
  };

  const handleChange = (e) => {
    e.persist();
    const textareaLineHeight = 24;
    const minRows = 1;
    const maxRows = 3;

    const previousRows = e.target.rows;
    e.target.rows = minRows;

    const currentRows = ~~(e.target.scrollHeight / textareaLineHeight);

    if (currentRows === previousRows) {
      e.target.rows = currentRows;
    }

    if (currentRows >= maxRows) {
      e.target.rows = maxRows;
      e.target.scrollTop = e.target.scrollHeight;
    }

    handleChangeMessage(e.target.value);
    setRows(currentRows < maxRows ? currentRows : maxRows);
  };

  const toggleEmoji = () => {
    setEmoji(!emoji);
  };

  const addEmoji = (e) => {
    handleChangeMessage(message + e.native);
  };

  return (
    <>
      {emoji && (
        <div className={classes.emojiContainer} ref={emojiRef}>
          <Picker
            showPreview={false}
            showSkinTones={false}
            title="Emoji"
            set="apple"
            onSelect={addEmoji}
          />
        </div>
      )}
      <div className={classes.input}>
        <label htmlFor="upload-button">
          <img className={classes.camera} src={camera} alt="upload" />
        </label>
        <input
          type="file"
          accept="image/*"
          capture
          id="upload-button"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <button onClick={toggleEmoji}>
          <img src={emojiFace} alt="Emoji" />
        </button>
        <textarea
          autoFocus
          type="text"
          rows={rows}
          value={message}
          onKeyDown={enterListener}
          onChange={handleChange}
          placeholder="Digite uma mensagem"
        ></textarea>
        <button onClick={() => handlesendButton()}>
          <img src={sendImg} alt="Enviar" />
        </button>
      </div>
    </>
  );
};

export default MessageField;
