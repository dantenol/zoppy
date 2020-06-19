import React, { useState } from "react";

import classes from "./index.module.css";
import camera from "../assets/images/camera.svg";

const Header = ({ data, handleUpload, handleChangeName }) => {
  const [name, setName] = useState(data.displayName);
  const [showHint, setShowHint] = useState(false);
  const [savedName, setSavedName] = useState(data.displayName);

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
    </div>
  );
};

export default Header;
