import React, { useState, useEffect } from "react";
import Lightbox from "react-image-lightbox";
import classNames from "classnames";
import NumberFormat from "react-number-format";

import { url } from "../connector";

import "react-image-lightbox/style.css";
import classes from "./modal.module.css";

import logo from "../assets/images/logo.png";
import loading from "../assets/images/loading.gif";

const Modal = ({
  file,
  onClose,
  handleSendImage,
  handleNewChat,
  handleLogin,
}) => {
  const [message, setMessage] = useState("");
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  useEffect(() => {
    setButtonDisabled(false);
    setMessage("");
    setNumber("");
    setPassword("");
  }, [file]);

  const sendImage = (e) => {
    e.preventDefault();
    setButtonDisabled(true);
    handleSendImage(message);
  };

  const sendNewChat = (e) => {
    e.preventDefault();
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

  const login = (e) => {
    e.preventDefault();
    handleLogin(message, password);
  };

  if (file && file.type === "image") {
    return (
      <Lightbox
        imagePadding={32}
        mainSrc={`${url}chats/download/${file.id}?access_token=${localStorage.access_token}`}
        onCloseRequest={onClose}
      />
    );
  } else if (file && file.type === "qr") {
      return (
        <>
          <div onClick={onClose} className={classes.modalBackground} />
          <div className={classNames(classes.modal, classes.opaque)}>
            <p>{file.update}</p>
            <h2>Escaneie o QR code pelo WhatsApp</h2>
            <img className={classes.qr} src={`${url}chats/qr?access_token=${file.token}&${file.update}`} alt="QR code" />
          </div>
        </>
      );
  } else if (file && file.type === "video") {
    return (
      <>
        <div onClick={onClose} className={classes.modalBackground} />
        <div className={classes.modal}>
          <video src={`${url}chats/download/${file.id}`} alt="Vídeo" autoPlay />
        </div>
      </>
    );
  } else if (file && file.type === "photoUpload") {
    return (
      <>
        <div onClick={onClose} className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          <img src={URL.createObjectURL(file.data)} alt="Imagem" />
          <form onSubmit={sendImage}>
            <input
              type="text"
              placeholder="Mensagem"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input type="submit" hidden />
          </form>
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
        <div onClick={onClose} className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          <form onSubmit={sendNewChat}>
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
            <input type="submit" hidden />
          </form>
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
  } else if (file && file.type === "login") {
    return (
      <>
        <div className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <img className={classes.logo} src={logo} alt="Zoppy" />
          <h2>Você precisa logar primeiro!</h2>
          <form onSubmit={login}>
            <input
              type="email"
              placeholder="email"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input
              type="password"
              placeholder="senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input type="submit" hidden />
          </form>
          <button disabled={buttonDisabled} onClick={login}>
            {buttonDisabled ? (
              <img src={loading} alt="loading spinner" />
            ) : (
              "Entrar"
            )}
          </button>
          <form action=""></form>
        </div>
      </>
    );
  }
  return null;
};

export default Modal;
