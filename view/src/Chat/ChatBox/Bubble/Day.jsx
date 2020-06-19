import React from "react";
import moment from "moment";
import classNames from "classnames";

import classes from "./index.module.css";

const calendarTexts = {
  sameDay: "[Hoje]",
  lastDay: "[Ontem]",
  lastWeek: "dddd",
  sameElse: "DD/MM/YYYY",
};

const Day = ({ day }) => (
  <div className={classNames(classes.container, classes.center)}>
    <div className={classes.day}>{moment(day).calendar(calendarTexts)}</div>
  </div>
);

export default Day;
