import React, { useEffect, useState } from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import swap from "../../assets/images/swap.svg";
import { idToPhone } from "../../hooks/helpers";
import Stats from "./Stats";

const ContactDetails = ({
  data,
  handleClose,
  handleChangeName,
  show,
  stats,
  handlePin,
}) => {
  const [name, setName] = useState(data.displayName);
  const [savedName, setSavedName] = useState(data.displayName);
  const [showHint, setShowHint] = useState(false);
  const [attendant, setAttendant] = useState("");
  console.log(stats);

  useEffect(() => {
    setName(data.displayName);
    setSavedName(data.displayName);
  }, [data.displayName]);

  useEffect(() => {
    if (data.agentId) {
      const attendant = JSON.parse(localStorage.agents)[data.agentId];
      setAttendant(attendant.fullName);
    } else {
      setAttendant();
    }
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

  const handleEsc = (e) => {
    if (e.keyCode === 27) {
      handleClose();
    }
  };

  useEffect(() => {
    handleClose();
  }, [data.chatId]);

  useEffect(() => {
    document.addEventListener("keydown", handleEsc, false);
    return () => {
      document.removeEventListener("keydown", handleEsc, false);
    };
  }, []);

  const handleSwapAgent = () => {
    if (data.agentId === window.me) {
      handlePin(true);
    } else {
      handlePin(false);
    }
  };

  return (
    <div className={classNames(classes.container, classes[show])}>
      <div className={classes.close} onClick={handleClose}>
        &times;
      </div>
      <img className={classes.profilePic} src={data.profilePic} alt="" />
      <div className={classes.dataContainer}>
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
        <h3>{idToPhone(data.chatId)}</h3>
        <div className={classes.salesAgent}>
          <h2>Atendente: {attendant || "Nenhum"}</h2>
          <button onClick={handleSwapAgent}>
            <img src={swap} alt="Trocar" />
          </button>
        </div>
        <Stats data={stats} />
      </div>
    </div>
  );
};

export default ContactDetails;
