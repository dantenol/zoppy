import React, { useState, useEffect } from "react";
import moment from "moment";
import classNames from "classnames";

import classes from "./index.module.css";

const VoiceMessage = ({ message, isGroup }) => {
  const [audio, setAudio] = useState(null);
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    setPlaying(!playing);
  };

  useEffect(() => {
    try {
      setAudio(
        new Audio(
          `http://localhost:3001/api/chats/download/${message.messageId}`
        )
      );
    } catch (error) {
      console.log(error);
    }
  }, [message.messageId]);

  useEffect(() => {
    if (audio) {
      console.log(audio);
      try {
        playing ? audio.play() : audio.pause();
        audio.addEventListener("ended", () => setPlaying(false));

        return () => {
          audio.removeEventListener("ended", () => setPlaying(false));
        };
      } catch (e) {
        alert("erro ao reproduzir!");
        console.log(e);
      }
    }
  }, [playing]);

  return (
    <div>
      <div>
        <div className={classes.message}>
          {isGroup && !message.mine && <p>{message.sender}</p>}
          <div className={classes.msg}>
            <div onClick={toggle} className={classes.audio}>
              <div
                className={classNames(
                  playing ? classes.paused : null,
                  classes.audioController
                )}
              ></div>
            </div>
          </div>
        </div>
        <div className={classes.time}>
          <p>{moment(message.timestamp).format("HH:mm")}</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessage;
