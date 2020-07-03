import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";

const NoChat = ({ showing }) => (
  <div
    className={classNames(
      classes.centerContainer,
      classes.noChat,
      "mobile-fillWidth",
      showing
    )}
  >
    <h1>Selecione uma conversa no chat ao lado</h1>
    <a onClick={() => {window.localStorage.clear();window.location.reload()}}>
      Clique aqui se estiver tendo problemas para entrar
    </a>
  </div>
);

export default NoChat;
