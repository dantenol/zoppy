import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";

const LowBattery = () => (
  <div className={classNames(classes.chat, classes.lowBattery)}>
    A bateria está acabando. Carregue o celular principal.
  </div>
);

export default React.memo(LowBattery);
