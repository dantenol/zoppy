import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";

const NoChat = () => (
  <div className={classNames(classes.centerContainer, classes.noChat)}>
    <h1>Selecione uma conversa no chat ao lado</h1>
  </div>
);

export default NoChat;
