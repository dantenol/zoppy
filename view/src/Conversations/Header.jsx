import React from "react";
import classNames from "classnames";

import logo from "../assets/images/icon.png";
import change from "../assets/images/changeUser.svg";
import settings from "../assets/images/gear.svg";
import classes from "./index.module.css";

const Header = ({ logout, handleSettings }) => {
  let agent;
  if (localStorage.salesAgentProfile) {
    agent = JSON.parse(localStorage.salesAgentProfile);
  } else {
    agent = JSON.parse(localStorage.agents)[localStorage.userId];
  }

  const fullName = (agent && agent.fullName) || "";

  return (
    <div className={classNames(classes.header)}>
      <img className={classes.bg} src={logo} alt="Zoppy" />
      <p>{fullName}</p>
      <button onClick={handleSettings}>
        <img src={settings} alt="change settings" />
      </button>
      <button onClick={() => logout()}>
        <img src={change} alt="change user" />
      </button>
    </div>
  );
};

export default React.memo(Header);
