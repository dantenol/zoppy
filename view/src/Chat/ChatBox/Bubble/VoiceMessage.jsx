import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import classNames from "classnames";

import { url } from "../../../connector";

import classes from "./index.module.css";

const secondsToTime = (s) => {
  if (!s) {
    return "";
  }
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  let parsedSec = sec;
  if (sec < 10) {
    parsedSec = "0" + sec;
  }
  return m + ":" + parsedSec;
};

const VoiceMessage = ({ message, isGroup }) => {
  const [audio, setAudio] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState("");
  const componentIsMounted = useRef(true);

  const agents = window.agents;

  const toggle = async () => {
    setPlaying(!playing);
  };

  let senderName = "WhatsApp";

  if (message.agentId) {
    senderName = agents[message.agentId].fullName;
  }

  const saveDuration = (audioEl) => {
    if (componentIsMounted.current) {
      setDuration(secondsToTime(audioEl.duration));
    }
  };

  useEffect(() => {
    return () => {
      componentIsMounted.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      const audioBuff = new Audio(
        `${url}chats/download/${message.messageId}?access_token=${localStorage.access_token}`
      );
      setAudio(audioBuff);
    } catch (error) {
      console.log(error);
    }
  }, [message.messageId]);

  useEffect(() => {
    if (audio) {
      try {
        const sounds = document.getElementsByTagName("audio");
        for (let i = 0; i < sounds.length; i++) sounds[i].pause();
        playing ? audio.play() : audio.pause();
        audio.addEventListener("ended", () => setPlaying(false));
        audio.addEventListener("loadeddata", () => saveDuration(audio));
        return () => {
          audio.removeEventListener("ended", () => setPlaying(false));
          audio.removeEventListener("loadeddata", () => saveDuration(audio));
        };
      } catch (e) {
        alert("erro ao reproduzir!");
        console.log(e);
      }
    }
  }, [playing, audio]);

  return (
    <div>
      <div>
        <div className={classes.message}>
          {isGroup && !message.mine && <p>{message.sender}</p>}
          {message.agentId && <p>{senderName}</p>}
          <div className={classes.msg}>
            <div onClick={toggle} className={classes.audio}>
              <div
                className={classNames(
                  playing ? classes.paused : null,
                  classes.audioController
                )}
              ></div>
            </div>
            <span>{duration}</span>
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
