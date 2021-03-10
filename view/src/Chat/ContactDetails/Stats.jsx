import React from "react";
import moment from "moment";

import classes from "./index.module.css";
import inArrow from "../../assets/images/income.svg";
import outArrow from "../../assets/images/outcome.svg";
import all from "../../assets/images/inAndOut.svg";

const Counters = ({ incoming, outcoming, noTotal }) => (
  <div className={classes.counter}>
    <span>{incoming}</span>
    <img src={inArrow} alt="Recebidas" />
    <span>{outcoming}</span>
    <img src={outArrow} alt="Recebidas" />
    {noTotal ? null : (
      <>
        <span>{outcoming + incoming}</span>
        <img src={all} alt="Total" />
      </>
    )}
  </div>
);

const Stats = ({ data }) => {
  const getDuration = (ms) => {
    const seconds = moment.duration(ms).seconds();
    const minutes = moment.duration(ms).minutes();
    const hours = Math.trunc(moment.duration(ms).asHours());
    return hours + ":" + minutes + ":" + seconds;
  };

  return (
    <div className={classes.statsContainer}>
      <div>
        <h1>Primeira mensagem: </h1>
        <span>{data.salesContacted ? "Vendedor" : "Lead"}</span>
      </div>
      <div>
        <h1>Tempo de resposta inicial: </h1>
        <span>{getDuration(data.initialResponseTime)}</span>
      </div>
      <div>
        <h1>Total:</h1>
        <Counters
          incoming={data.receivedMessages}
          outcoming={data.sentMessages}
        />
      </div>
      <div>
        <h1>Mensagens:</h1>
        <Counters incoming={data.receivedTexts} outcoming={data.sentTexts} />
      </div>
      <div>
        <h1>Áudios:</h1>
        <Counters incoming={data.receivedAudios} outcoming={data.sentAudios} />
      </div>
      <div>
        <h1>Fotos:</h1>
        <Counters incoming={data.receivedImages} outcoming={data.sentImages} />
      </div>
      <div>
        <h1>Tempo de resposta médio:</h1>
        <Counters incoming={getDuration(data.avgReceive)} outcoming={getDuration(data.avgRespond)} noTotal />
      </div>
    </div>
  );
};

export default Stats;
