import React from "react";
import classNames from "classnames";

import classes from "./index.module.css";
import back from "../assets/images/back.svg";

const Header = ({ data, handleBack, handleToggleDetails }) => (
  <header className={classes.header}>
    <button
      onClickCapture={handleBack}
      className={classNames(classes.arrow, "mobile-only")}
    >
      <img src={back} alt="back" />
    </button>
    <div className={classes.headerContent} onClick={handleToggleDetails}>
      <img className={classes.profilePic} src={data.profilePic} alt="Foto" />
      <div className={classes.name}>
        <div className={classes.name}>
          <span title={data.displayName}>{data.displayName}</span>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
