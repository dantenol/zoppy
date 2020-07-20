import React from "react";

import classes from "./index.module.css";

const Sale = ({ message }) => (
  <div className={classes.sale}>
    <p>{message.body}</p>
  </div>
);

export default Sale;
