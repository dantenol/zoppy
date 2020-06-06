import React, { useState } from "react";

import classes from "./index.module.css";
import sendImg from "../../assets/images/send.svg";

const MessageField = ({ message, handleChangeMessage, send }) => {
  const [rows, setRows] = useState(1);

  const enterListener = (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      send();
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
    <div className={classes.input}>
      <textarea
        type="text"
        rows={rows}
        value={message}
        onKeyDown={enterListener}
        onChange={handleChange}
        placeholder="Digite uma mensagem"
      ></textarea>
      <button>
        <img src={sendImg} alt="Enviar" />
      </button>
    </div>
  );
};

export default MessageField;
