import React from "react";
import moment from "moment";

import clock from "../../../assets/images/clock.svg";

import classes from "./index.module.css";
import FormattedSpan from "../../../hooks/FormattedSpan";
import QuoteBox from "./QuoteBox";

const PureText = ({ message, isGroup }) => {
  const agents = window.agents;

  let senderName = "WhatsApp";

  if (message.agentId) {
    senderName = agents[message.agentId].fullName;
  }

  return (
    <div>
      <div className={classes.message}>
        {isGroup && !message.mine && <p>{message.sender}</p>}
        {message.mine && message.agentId && <p>{senderName}</p>}
        <div className={classes.msg}>
          {message.quote ? <QuoteBox data={message.quote} /> : null}
          <FormattedSpan text={message.body} />
          <span className={classes.buffer}></span>
        </div>
      </div>
      <div className={classes.time}>
        <p>{moment(message.timestamp).format("HH:mm")}</p>
        {message.sending && <img src={clock} alt="Sending" />}
      </div>
    </div>
  );
};

export default PureText;
