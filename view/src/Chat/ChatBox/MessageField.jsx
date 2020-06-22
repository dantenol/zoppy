import React, { useState } from "react";

import classes from "./index.module.css";
import sendImg from "../../assets/images/send.svg";
import camera from "../../assets/images/camera.svg";

const MessageField = ({ message, handleChangeMessage, send, handleUpload }) => {
  const [rows, setRows] = useState(1);
  const [sending, setSending] = useState(false);

  const enterListener = async (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      if (message) {
        setSending(true);
        await send(message);
        handleChangeMessage("");
        setSending(false);
      }
    }
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

  return (
    <>
      {sending && (
        <div className={classes.linearActivity}>
          <div className={classes.indeterminate}></div>
        </div>
      )}
      <div className={classes.input}>
        <label htmlFor="upload-button">
          <img className={classes.camera} src={camera} alt="photo" />
        </label>
        <input
          type="file"
          accept="image/*"
          capture
          id="upload-button"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <textarea
          type="text"
          rows={rows}
          value={message}
          onKeyDown={enterListener}
          onChange={handleChange}
          placeholder="Digite uma mensagem"
        ></textarea>
        <button onClick={send}>
          <img src={sendImg} alt="Enviar" />
        </button>
      </div>
    </>
  );
};

export default MessageField;
