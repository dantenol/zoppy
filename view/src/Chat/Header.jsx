import React, { useState, useEffect } from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import back from "../assets/images/back.svg";

const Header = ({ data, handleChangeName, handleBack }) => {
  const [name, setName] = useState(data.displayName);
  const [showHint, setShowHint] = useState(false);
  const [savedName, setSavedName] = useState(data.displayName);

  useEffect(() => {
    setName(data.displayName);
    setSavedName(data.displayName);
  }, [data]);

  const enterListener = async (e) => {
    if (e.keyCode === 13) {
      handleChangeName(name);
      e.target.blur();
      setSavedName(name);
      setName(name);
    }
  };

  const handleFocus = () => {
    setShowHint(true);
  };

  const handleBlur = () => {
    setName(savedName);
    setShowHint(false);
  };

  return (
    <div className={classes.header}>
      <button
        onClickCapture={handleBack}
        className={classNames(classes.arrow, "mobile-only")}
      >
        <img src={back} alt="back" />
      </button>
      <img className={classes.profilePic} src={data.profilePic} alt="Foto" />
      <div className={classes.name}>
        <input
          className={classes.nameInput}
          type="text"
          value={name}
          onKeyDown={enterListener}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setName(e.target.value)}
        />
        {showHint && (
          <div className={classes.hintBubble}>
            Aperte enter para salvar ou clique fora do campo para cancelar
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
