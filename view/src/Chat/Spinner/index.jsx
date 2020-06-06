import React from "react";

import classes from "./index.module.css";

const Spinner = () => (
  <div className={classes.container}>
    <div className={classes.loader}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>
);

export default Spinner;
