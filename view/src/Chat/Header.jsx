import React, { useState, useEffect } from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import back from "../assets/images/back.svg";

const Header = ({ data, handleBack, handleToggleDetails }) => (
  <div className={classes.header} onClick={handleToggleDetails}>
    <button
      onClickCapture={handleBack}
      className={classNames(classes.arrow, "mobile-only")}
    >
      <img src={back} alt="back" />
    </button>
    <img className={classes.profilePic} src={data.profilePic} alt="Foto" />
    <div className={classes.name}>
      <div className={classes.name}>{data.displayName}</div>
    </div>
  </div>
);

export default Header;
