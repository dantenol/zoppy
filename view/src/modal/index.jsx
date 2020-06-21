import React, { useState, useEffect } from "react";
import Lightbox from "react-image-lightbox";
import classNames from "classnames";
import NumberFormat from "react-number-format";

import { url } from "../connector.json";

import "react-image-lightbox/style.css";
import styles from "./modal.module.css";

import loading from "../assets/images/loading.gif";

const Modal = ({ file, onClose, handleSendImage, handleNewChat }) => {
  const [message, setMessage] = useState("");
  const [number, setNumber] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const sendImage = () => {
    setButtonDisabled(true);
    handleSendImage(message);
  };

  useEffect(() => {
    setButtonDisabled(false);
    setMessage("");
    setNumber("");
  }, [file]);
  const sendNewChat = () => {
    if (!number.match(/^\(\d{2}\) \d{5}-\d{4}$/g)) {
      alert("Número inválido");
      return;
    } else if (!message) {
      alert("Você precisa digitar uma mensagem");
      return;
    }

    setButtonDisabled(true);
    const parsed = number.substring(0, 5) + number.substring(6, number.length);
    const to = "55" + parsed.replace(/\D/g, "") + "@c.us";
    handleNewChat(message, to);
  };

  if (file && file.type === "image") {
    return (
      <Lightbox
        imagePadding={32}
        mainSrc={`${url}chats/download/${file.id}`}
        onCloseRequest={onClose}
      />
    );
  } else if (file && file.type === "video") {
    return (
      <>
        <div onClick={onClose} className={styles.modalBackground} />
        <div className={styles.modal}>
          <video
            src={`${url}chats/download/${file.id}`}
            alt="Vídeo"
            autoPlay
          />
        </div>
      </>
    );
  } else if (file && file.type === "photoUpload") {
    return (
      <>
        <div onClick={onClose} className={styles.modalBackground} />
        <div className={classNames(styles.modal, styles.opaque)}>
          <div onClick={onClose} className={styles.close}>
            &times;
          </div>
          <img src={URL.createObjectURL(file.data)} alt="Imagem" />
          <input
            type="text"
            placeholder="Mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button disabled={buttonDisabled} onClick={sendImage}>
            {buttonDisabled ? (
              <img src={loading} alt="loading spinner" />
            ) : (
              "Enviar"
            )}
          </button>
        </div>
      </>
    );
  } else if (file && file.type === "newChat") {
    return (
      <>
        <div onClick={onClose} className={styles.modalBackground} />
        <div className={classNames(styles.modal, styles.opaque)}>
          <div onClick={onClose} className={styles.close}>
            &times;
          </div>

          <NumberFormat
            type="tel"
            placeholder="Celular"
            format="(##) #####-####"
            value={number}
            onValueChange={({ formattedValue }) => setNumber(formattedValue)}
          />
          <input
            type="text"
            placeholder="Mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button disabled={buttonDisabled} onClick={sendNewChat}>
            {buttonDisabled ? (
              <img src={loading} alt="loading spinner" />
            ) : (
              "Enviar"
            )}
          </button>
        </div>
      </>
    );
  }
  return null;
};

export default Modal;
