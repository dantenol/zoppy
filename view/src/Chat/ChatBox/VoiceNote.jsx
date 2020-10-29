import React, { useEffect, useState } from "react";
import MicRecorder from "mic-recorder-to-mp3";

import cancel from "../../assets/images/cancel.svg";
import sucess from "../../assets/images/sucess.svg";
import mic from "../../assets/images/mic.svg";
import classes from "./index.module.css";
import useInterval from "../../hooks/useInterval";

const recorder = new MicRecorder({
  bitRate: 128,
});

const secondsToTime = (s) => {
  if (!s && s !== 0) {
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

const isMobile = window.innerWidth <= 600;

const VoiceNote = ({ setIsRecording, sendAudio }) => {
  const [startedRecording, setStartedRecording] = useState(0);
  const [allowsRecording, setAllowsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [timerId, setTimerId] = useState();

  const handleRecord = (e) => {
    console.log(isMobile);
    e.preventDefault();
    if (startedRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    console.log("STARTED");
    recorder.start();
    setStartedRecording(true);
    setAudioURL("");
    startTImer()
  };
  
  const startTImer = () => {
    let t = 0;
    const id = setInterval(() => {
      setSeconds(++t)
    }, 1000);
    setTimerId(id);
  }
  
  const stopRecording = () => {
    console.clear();
    setIsRecording(false);
    setStartedRecording(false);
    recorder
    .stop()
    .getMp3()
    .then(([buffer, blob]) => {
      setAudioURL(blob);
    });
    setSeconds(0);
    clearInterval(timerId);
  };
  
  const cancelRecording = () => {
    setStartedRecording(false);
    recorder
    .stop()
    .getMp3()
    .then(() => {
      setAudioURL("");
    });
    setSeconds(0)
    clearInterval(timerId);
  };
  
  const handleStartTouch = () => {
    if (!startedRecording) {
      setIsRecording(true);
      startRecording();
    }
  };

  const handleEndTouch = () => {
    stopRecording();
  };

  useEffect(() => {
    if (!navigator.getUserMedia) {
      setAllowsRecording(false);
    } else {
      navigator.getUserMedia(
        { audio: true },
        () => {
          console.log("Permission Granted");
          setAllowsRecording(true);
        },
        () => {
          console.log("Permission Denied");
          setAllowsRecording(false);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!startedRecording && audioURL && audioURL.size > 1) {
      console.log(audioURL);
      sendAudio(audioURL);
    }
    setIsRecording(Boolean(startedRecording));
  }, [audioURL, startedRecording]);

  // ====================== script pressionar para gravar mobile
  // useEffect(() => {
  //   const e = document.getElementById("recorder");
  //   if (allowsRecording && e) {
  //     document
  //       .getElementById("recorder")
  //       .addEventListener("touchstart", handleStartTouch);

  //     document.getElementById("recorder").oncontextmenu = function (event) {
  //       event.preventDefault();
  //       event.stopPropagation(); // not necessary in my case, could leave in case stopImmediateProp isn't available?
  //       event.stopImmediatePropagation();
  //       return false;
  //     };

  //     document
  //       .getElementById("recorder")
  //       .addEventListener("touchend", handleEndTouch);

  //     return () => {
  //       e.removeEventListener("touchstart", handleStartTouch);
  //       e.removeEventListener("touchend", handleEndTouch);
  //     };
  //   }
  // }, [startedRecording, allowsRecording]);

  return (
    <div>
      {!startedRecording ? (
        <button className={classes.record} id="recorder" onClick={handleRecord}>
          <img src={mic} alt="Gravar áudio" />
        </button>
      ) : (
        <div className={classes.voiceMessageRecorder}>
          <div>{secondsToTime(seconds)}</div>
          <button onClick={handleRecord}>
            <img
              className={classes.recording}
              src={sucess}
              alt="Enviar áudio"
            />
          </button>
          <button onClick={cancelRecording}>
            <img
              className={classes.recording}
              src={cancel}
              alt="Cancelar áudio"
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceNote;
