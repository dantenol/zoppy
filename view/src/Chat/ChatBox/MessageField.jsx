import React, { useState, useRef, useEffect } from "react";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import classNames from "classnames";
import MicRecorder from "mic-recorder-to-mp3";

import classes from "./index.module.css";
import sendImg from "../../assets/images/send.svg";
import emojiFace from "../../assets/images/emoji.svg";
import camera from "../../assets/images/camera.svg";
import bag from "../../assets/images/bag.svg";
import outslideClickListener from "../../hooks/outslideClickListener";
import VoiceNote from "./VoiceNote";

const recorder = new MicRecorder({
  bitRate: 128,
});

const isMobile = window.innerWidth <= 600;

const MessageField = ({
  message,
  handleChangeMessage,
  send,
  handleModal,
  sendAudio,
}) => {
  const [rows, setRows] = useState(1);
  const [emoji, setEmoji] = useState();
  const [focused, setFocused] = useState(false);
  const [salesButon, setSalesButton] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const emojiRef = useRef();

  // const handleRecord = (e) => {
  //   if (isMobile) {
  //     return;
  //   }
  //   e.preventDefault();
  //   setStartedRecording(new Date().valueOf());
  //   if (startedRecording) {
  //     stopRecording();
  //   } else {
  //     startRecording();
  //   }
  // };

  // const startRecording = () => {
  //   console.log("STARTED");
  //   recorder.start();
  //   setAudioURL("");
  // };

  // const stopRecording = () => {
  //   console.clear()
  //   setStartedRecording(0);
  //   recorder
  //     .stop()
  //     .getMp3()
  //     .then(([buffer, blob]) => {
  //       setAudioURL(blob);
  //     });
  // };

  // const cancelRecording = () => {
  //   setStartedRecording(0);
  //   recorder
  //     .stop()
  //     .getMp3()
  //     .then(() => {
  //       setAudioURL("");
  //     });
  // };

  // const handleStartTouch = () => {
  //   console.log(123123, startedRecording);
  //   if (!startedRecording) {
  //     setStartedRecording(new Date().valueOf());
  //     startRecording();
  //   }
  // };

  // const handleEndTouch = () => {
  //   console.log("finish", startedRecording - new Date());
  //   stopRecording();
  // };

  useEffect(() => {
    if (
      localStorage.settings &&
      JSON.parse(localStorage.settings).salesOptions
    ) {
      setSalesButton(true);
    } else {
      setSalesButton(false);
    }
  }, [localStorage.settings]);

  // useEffect(() => {
  //   if (!navigator.getUserMedia) {
  //     setAllowsRecording(false);
  //   } else {
  //     navigator.getUserMedia(
  //       { audio: true },
  //       () => {
  //         console.log("Permission Granted");
  //         setAllowsRecording(true);
  //       },
  //       () => {
  //         console.log("Permission Denied");
  //       }
  //     );
  //   }
  // }, []);

  // useEffect(() => {
  //   if (!startedRecording && audioURL && audioURL.size > 1) {
  //     console.log(audioURL);
  //     sendAudio(audioURL);
  //   }
  // }, [audioURL, startedRecording]);

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

  const closeEmoji = () => {
    setEmoji(false);
  };

  outslideClickListener(emojiRef, closeEmoji);

  const enterListener = (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      if (message) {
        handlesendButton();
      }
    }
  };

  const handlesendButton = () => {
    send(message);
    handleChangeMessage("");
    setRows(1);
  };

  const handleChange = (e) => {
    e.persist();
    const textareaLineHeight = 24;
    const minRows = 1;
    let maxRows = 3;
    if (isMobile) {
      maxRows = 10;
    }

    const previousRows = e.target.rows;
    e.target.rows = minRows;

    const currentRows = ~~(e.target.scrollHeight / textareaLineHeight);

    // TODO ajustar isso
    if (currentRows === previousRows) {
      e.target.rows = currentRows;
    }

    if (currentRows >= maxRows) {
      e.target.rows = maxRows;
      e.target.scrollTop = e.target.scrollHeight;
    }

    if (e.target.value.length > 0 && !focused) {
      setFocused(true);
    } else if (e.target.value.length < 1) {
      setFocused(false);
    }

    handleChangeMessage(e.target.value);
    setRows(currentRows < maxRows ? currentRows : maxRows);
  };

  const toggleEmoji = () => {
    setEmoji(!emoji);
  };

  const addEmoji = (e) => {
    handleChangeMessage(message + e.native);
  };

  return (
    <>
      {emoji && (
        <div className={classes.emojiContainer} ref={emojiRef}>
          <Picker
            showPreview={false}
            showSkinTones={false}
            title="Emoji"
            set="apple"
            onSelect={addEmoji}
          />
        </div>
      )}
      <div className={classNames(classes.input, classes[focused])}>
        <button
          className={classes.hide}
          onClick={() => handleModal("picUpload")}
        >
          <img className={classes.camera} src={camera} alt="upload" />
        </button>
        {salesButon && (
          <button className={classes.hide} onClick={() => handleModal("sale")}>
            <img src={bag} alt="Nova venda" />
          </button>
        )}
        <button onClick={toggleEmoji}>
          <img src={emojiFace} alt="Emoji" />
        </button>
        <textarea
          type="text"
          rows={rows}
          value={message}
          onKeyDown={enterListener}
          onChange={handleChange}
          placeholder="Digite uma mensagem"
          disabled={isRecording}
        ></textarea>
        {message.length ? (
          <button onClick={() => handlesendButton()}>
            <img src={sendImg} alt="Enviar" />
          </button>
        ) : (
          <VoiceNote
            setIsRecording={setIsRecording}
            sendAudio={sendAudio}
          />
        )}
      </div>
    </>
  );
};

export default MessageField;
