import React, { useState, useEffect } from "react";
import Lightbox from "react-image-lightbox";
import classNames from "classnames";
import NumberFormat from "react-number-format";
import _ from "lodash";

import { url } from "../connector";

import "react-image-lightbox/style.css";
import classes from "./modal.module.css";

import logo from "../assets/images/logo.png";
import loading from "../assets/images/loading.gif";

const localSettings = JSON.parse(localStorage.settings || 1);

const Modal = ({
  file,
  onClose,
  handleSendImage,
  handleNewChat,
  handleLogin,
  selectUser,
  handleChangeSettings,
}) => {
  const [message, setMessage] = useState("");
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [settings, setSettings] = useState(
    (file && file.settings) || localSettings
  );

  useEffect(() => {
    setButtonDisabled(false);
    setMessage("");
    setNumber("");
    setPassword("");
    if (file && file.newNumber) {
      setNumber(file.newNumber);
    }
  }, [file]);

  const sendImage = (e) => {
    e.preventDefault();
    setButtonDisabled(true);
    handleSendImage(message);
  };

  const addContact = (e) => {
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
    if (!message || !password) {
      alert("Insira seu usuário e senha!");
      return;
    }
    handleLogin(message, password);
  };

  const handlePickUser = () => {
    if (message) {
      selectUser(message);
    } else {
      alert("Você deve selecionar um(a) vendedor(a)");
    }
  };

  const changeSettings = ({ target }) => {
    console.log(target.name, target.checked);
    const newSettings = { ...settings, [target.name]: target.checked };
    console.log(newSettings);
    setSettings(newSettings);
    handleChangeSettings(newSettings);
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
          <img
            className={classes.qr}
            src={`${url}chats/qr?access_token=${file.token}&${file.update}`}
            alt="QR code"
          />
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
  } else if (file && file.type === "offline") {
    return (
      <>
        <div className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <h1>
            Parece que o celular principal não está online. Verifique e aguarde.
          </h1>
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
          <h2>Iniciar nova conversa</h2>
          <form onSubmit={addContact}>
            <NumberFormat
              type="tel"
              placeholder="Celular"
              format="(##) #####-####"
              value={number}
              onValueChange={({ formattedValue }) => setNumber(formattedValue)}
            />
            <input
              type="text"
              placeholder="Nome"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input type="submit" hidden />
          </form>
          <button disabled={buttonDisabled} onClick={addContact}>
            {buttonDisabled ? (
              <img src={loading} alt="loading spinner" />
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </>
    );
  } else if (file && file.type === "selectUser") {
    let options;
    if (localStorage.agents) {
      options = [];
      _.forEach(JSON.parse(localStorage.agents), (a) => {
        if (a.username && a.isSalesAgent) {
          options.push([a.username, a.fullName]);
        }
      });
    }

    return (
      <>
        <div className={classes.modalBackground} onClick={onclose} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          <h2>vendedor(a)</h2>
          <form action="null">
            <select
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {options.map((a) => (
                <option value={a[0]} key={a[0]}>
                  {a[1]}
                </option>
              ))}
            </select>
          </form>
          <button disabled={buttonDisabled} onClick={handlePickUser}>
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
  } else if (file && file.type === "login") {
    return (
      <>
        <div className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <img className={classes.logo} src={logo} alt="Zoppy" />
          <h2>Acesse sua conta</h2>
          <form onSubmit={login} noValidate>
            <input
              type="email"
              placeholder="usuário"
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
  } else if (file && file.type === "settings") {
    return (
      <>
        <div onClick={onClose} className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          <div className={classes.settings}>
            <h2>Configurações</h2>
            <label>
              Selecionar vendedor
              <input
                type="checkbox"
                name="manageUsersLocally"
                checked={settings.manageUsersLocally}
                onChange={changeSettings}
              />
            </label>
            <br />
            <br />
            <label>
              Mostrar opções de conversão
              <input
                type="checkbox"
                name="salesOptions"
                checked={settings.salesOptions}
                onChange={changeSettings}
              />
            </label>
          </div>
          <button disabled={buttonDisabled} onClick={onClose}>
            {buttonDisabled ? (
              <img src={loading} alt="loading spinner" />
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </>
    );
  }
  return null;
};

export default Modal;
