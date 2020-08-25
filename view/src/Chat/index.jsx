import React, { useState } from "react";
import classNames from "classnames";

import Header from "./Header";
import ChatBox from "./ChatBox";
import NoChat from "./NoChat";

import classes from "./index.module.css";
import ContactDetails from "./ContactDetails";

const Chat = ({
  chat,
  handleChangeName,
  handleSend,
  handleSendAudio,
  handleLoadMore,
  handleModal,
  showMedia,
  showing,
  handlePin,
  handleBack,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  if (chat) {
    return (
      <div
        className={classNames(
          classes.chatContainer,
          "mobile-fullwidth",
          showing
        )}
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
          sendAudio={handleSendAudio}
          more={chat.more}
          chatId={chat.chatId}
          handleChangeName={handleChangeName}
          messages={chat.messages}
          loading={chat.firstClick}
          />
        <ContactDetails
          show={showDetails}
          data={chat}
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
