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
  handleUpload,
  selectUser,
  saveSales,
  handleChangeSettings,
  handleSearch,
  passiveSearch,
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
    } else if (file && file.type === "sale") {
      setNumber("sale");
    } else if (file && file.type === "advancedSearch") {
      setMessage(window.me);
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
    }

    setButtonDisabled(true);
    const chat = "55" + number.replace(/\D/g, "") + "@c.us";
    handleNewChat(number, chat);
  };

  const login = (e) => {
    e.preventDefault();
    if (!message || !password) {
      alert("Insira seu usuário e senha!");
      return;
    }
    handleLogin(message, password);
  };

  const handleSaveSale = () => {
    const items = message;
    const value = password;
    const type = number;
    const nbrRegex = /^[0-9]{1,4}([.,][0-9]{1,2})?$/g;
    if (
      !items.match(nbrRegex) ||
      (number === "sale" && !value.match(nbrRegex))
    ) {
      alert("Dados inválidos. Verifique os números");
      return;
    }
    const salesInfo = {
      itemCount: items.replace(",", "."),
      totalValue: value.replace(",", "."),
      type,
    };
    setButtonDisabled(true);
    saveSales(salesInfo);
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
    setSettings(newSettings);
    handleChangeSettings(newSettings);
  };

  const changeSalesAgent = (value) => {
    const agent = window.agents[localStorage.salesAgentId];
    setMessage(value);
    localStorage.setItem("salesAgentId", value);
    localStorage.setItem("salesAgentProfile", JSON.stringify(agent));
  };

  const handleNumber = (number) => {
    setNumber(number);
    console.log(number);
    if (number.length > 12 && number[13].match(/\d/)) {
      const chat = "55" + number.replace(/\D/g, "");
      passiveSearch(chat);
    }
  };

  const handleFilter = () => {
    handleSearch(message, number);
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
        <div className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <p>{file.update}</p>
          <h2>Escaneie o QR code pelo WhatsApp</h2>
          {file.qr ? (
            <img className={classes.qr} src={file.qr} alt="QR code" />
          ) : null}
          {file.status ? (
          <>
          <h1>QR code validado. Carregando...</h1>
          <h4>{`${file.partial}/${file.total}`}</h4>
          </>
          ) : null}
        </div>
      </>
    );
  } else if (file && file.type === "video") {
    return (
      <>
        <div onClick={onClose} className={classes.modalBackground} />
        <div
          onClick={onClose}
          className={classNames(classes.close, classes.absolutePosition)}
        >
          &times;
        </div>
        <div className={classes.modal}>
          <video
            src={`${url}chats/download/${file.id}?access_token=${localStorage.access_token}`}
            alt="Vídeo"
            autoPlay
            controls
          />
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
          <h3>{file.reason}</h3>
        </div>
      </>
    );
  } else if (file && file.type === "picUpload") {
    return (
      <>
        <div onClick={onClose} className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          <h1>Enviar imagem</h1>
          <label htmlFor="upload-button">
            <div className={classes.button}>Enviar foto ou vídeo</div>
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            capture
            multiple
            id="upload-button"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <label htmlFor="upload-button2">
            <div className={classes.button}>Enviar Outros arquivos</div>
          </label>
          <input
            type="file"
            accept="*"
            id="upload-button2"
            multiple
            style={{ display: "none" }}
            onChange={handleUpload}
          />
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
          {file.format === "video" ? (
            <video controls src={URL.createObjectURL(file.data)} />
          ) : (
            <img src={URL.createObjectURL(file.data)} alt="Imagem" />
          )}
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
    let options;
    if (window.agents) {
      options = [];
      _.forEach(window.agents, (a, k) => {
        if (a.username && a.isSalesAgent) {
          options.push([k, a.fullName]);
        }
      });
    }

    return (
      <>
        <div onClick={onClose} className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          {file.newNumber && localStorage.salesAgentId && (
            <>
              <h2>Vendedor(a):</h2>
              <form action="null">
                <select
                  value={localStorage.salesAgentId}
                  onChange={(e) => changeSalesAgent(e.target.value)}
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
            </>
          )}
          <h2>Número:</h2>
          <form onSubmit={addContact}>
            <NumberFormat
              type="tel"
              placeholder="Celular"
              format="(##) #####-####"
              value={number}
              onValueChange={({ formattedValue }) =>
                handleNumber(formattedValue)
              }
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
    if (window.agents) {
      options = [];
      _.forEach(window.agents, (a, k) => {
        if (a.username && a.isSalesAgent) {
          options.push([k, a.fullName]);
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
          <h2>Vendedor(a)</h2>
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
  } else if (file && file.type === "sale") {
    return (
      <>
        <div className={classes.modalBackground} />
        <div className={classNames(classes.modal, classes.opaque)}>
          <div onClick={onClose} className={classes.close}>
            &times;
          </div>
          <h2>Sacolinha</h2>
          <form action="" onSubmit={handleSaveSale} noValidate>
            <input
              type="number"
              placeholder="Num. itens"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className={classes.saleType}>
              <input
                checked={number === "sale"}
                onChange={() => setNumber("sale")}
                type="radio"
                name="saleType"
                id="sale"
              />
              <label htmlFor="sale">Venda</label>
              <input
                checked={number === "bag"}
                onChange={() => setNumber("bag")}
                type="radio"
                name="saleType"
                id="bag"
              />
              <label htmlFor="bag">Malinha</label>
            </div>
            {number === "sale" ? (
              <input
                type="number"
                placeholder="Valor total"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            ) : null}
            <input type="submit" hidden />
          </form>
          <button disabled={buttonDisabled} onClick={handleSaveSale}>
            {buttonDisabled ? (
              <img src={loading} alt="loading spinner" />
            ) : (
              "salvar"
            )}
          </button>
          <form action=""></form>
        </div>
      </>
    );
  } else if (file && file.type === "advancedSearch") {
    let options;
    if (window.agents) {
      options = [];
      _.forEach(window.agents, (a, k) => {
        if (a.fullName !== "WhatsApp") {
          options.push([k, a.fullName]);
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
          <h2>Atendente</h2>
          <form>
            <select
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            >
              <option value="" disabled>
                Selecione...
              </option>
              <option value="all" >
                Todos
              </option>
              {options.map((a) => (
                <option value={a[0]} key={a[0]}>
                  {a[1]}
                </option>
              ))}
            </select>
            <br />
            <br />
            <label>
              Apenas não lidas
              <input
                type="checkbox"
                checked={number}
                onChange={() => setNumber(!number)}
              />
            </label>
          </form>
          <button onClick={() => handleFilter()}>Filtrar</button>
          <form action=""></form>
        </div>
      </>
    );
  }
  return null;
};

export default Modal;
