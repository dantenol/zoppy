import React, { useEffect, useState } from "react";
import classNames from "classnames";
import moment from "moment";

import Header from "./Header";
import ChatBox from "./ChatBox";
import NoChat from "./NoChat";

import classes from "./index.module.css";
import ContactDetails from "./ContactDetails";

const Chat = ({
  chat,
  handleChangeName,
  handleSend,
  handleDelete,
  handleSendAudio,
  handleLoadMore,
  handleModal,
  handlePin,
  handleBack,
  initialText,
  showMedia,
  showing,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({});

  const avgArr = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += parseInt(arr[i], 10);
    }

    return sum / arr.length;
  };

  const calculateStats = (msgs) => {
    let initialResponseTime;
    const avgTimeRespond = [];
    const avgTimeRecieve = [];
    const salesContacted = msgs[0].mine;
    const counts = {
      sentMessages: 0,
      receivedMessages: 0,
      sentTexts: 0,
      receivedTexts: 0,
      sentAudios: 0,
      receivedAudios: 0,
      sentImages: 0,
      receivedImages: 0,
    };
    const daysOfConversation = Math.abs(
      moment(msgs[0].timestamp).diff(
        moment(msgs[msgs.length - 1].timestamp),
        "days"
      )
    );
    msgs.forEach((m, i) => {
      if (m.mine) {
        if (!salesContacted && !initialResponseTime) {
          initialResponseTime = new Date(m.timestamp) - new Date(msgs[i - 1].timestamp);
        }
        counts.sentMessages++;
        if (m.type === "ptt" || m.type === "audio") {
          counts.sentAudios++;
        } else if (m.type === "image") {
          counts.sentImages++;
        } else {
          counts.sentTexts++;
        }
        if (msgs[i - 1] && !msgs[i - 1].mine) {
          const interval = new Date(m.timestamp) - new Date(msgs[i - 1].timestamp);
          if (interval < 86400000) {  
            avgTimeRespond.push(interval);
          }
        }
      } else {
        if (salesContacted && !initialResponseTime) {
          initialResponseTime = new Date(m.timestamp) - new Date(msgs[i - 1].timestamp);
        }
        counts.receivedMessages++;
        if (m.type === "ptt" || m.type === "audio") {
          counts.receivedAudios++;
        } else if (m.type === "image") {
          counts.receivedImages++;
        } else {
          counts.receivedTexts++;
        }
        if (msgs[i - 1] && msgs[i - 1].mine) {
          const interval = new Date(m.timestamp) - new Date(msgs[i - 1].timestamp);
          if (interval < 86400000) {
            avgTimeRecieve.push(interval);
          }
        }
      }

      const avgReceive = avgArr(avgTimeRecieve);
      const avgRespond = avgArr(avgTimeRespond);
      setStats({
        avgReceive,
        avgRespond,
        daysOfConversation,
        salesContacted,
        initialResponseTime,
        ...counts,
      });
    });
  };

  useEffect(() => {
    if (chat && chat.messages.length) {
      const messages = chat.messages.slice().reverse();
      calculateStats(messages);
    }
  }, [chat]);

  if (chat) {
    return (
      <div
        className={classNames(
          classes.chatContainer,
          "mobile-fullwidth",
          showing
        )}
        id="main"
      >
        <Header
          data={chat}
          handleBack={handleBack}
          handleToggleDetails={() => setShowDetails(!showDetails)}
        />
        <ChatBox
          handleModal={handleModal}
          showMedia={showMedia}
          handleLoadMore={handleLoadMore}
          send={handleSend}
          handleDelete={handleDelete}
          sendAudio={handleSendAudio}
          more={chat.more}
          chatId={chat.chatId}
          handleChangeName={handleChangeName}
          messages={chat.messages}
          loading={chat.firstClick}
          initialText={initialText}
        />
        <ContactDetails
          show={showDetails}
          data={chat}
          stats={stats}
          handlePin={handlePin}
          handleChangeName={handleChangeName}
          handleClose={() => setShowDetails(false)}
        />
      </div>
    );
  } else {
    return <NoChat showing={showing} />;
  }
};

export default Chat;
