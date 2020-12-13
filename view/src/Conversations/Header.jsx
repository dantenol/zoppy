import React from "react";
import classNames from "classnames";

import logo from "../assets/images/icon.png";
import launch from "../assets/images/rocket.svg";
import change from "../assets/images/changeUser.svg";
import settings from "../assets/images/gear.svg";
import classes from "./index.module.css";

const Header = ({ logout, handleSettings, isLaunch }) => {
  let agent;
  if (localStorage.salesAgentProfile) {
    agent = JSON.parse(localStorage.salesAgentProfile);
  } else {
    agent = JSON.parse(localStorage.agents)[localStorage.userId];
  }

  const goToLaunch = () => (window.location.href = "/launch");
  const fullName = (agent && agent.fullName) || "";

  return (
    <div className={classNames(classes.header)}>
      <img className={classes.bg} src={logo} alt="Zoppy" />
      <p>{fullName}</p>
      <button onClick={handleSettings}>
        <img src={settings} alt="Alterar configurações" />
      </button>
      <button onClick={() => logout()}>
        <img src={change} alt="mudar usuário" />
      </button>
      {isLaunch ? (
        <button onClick={goToLaunch}>
          <img src={launch} alt="lançamento" />
        </button>
      ) : null}
    </div>
  );
};

export default React.memo(Header);
