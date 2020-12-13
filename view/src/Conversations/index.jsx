import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import classes from "./index.module.css";
import Search from "./Search";
import Chat from "./Chat";
import LowBattery from "./LowBattery";
import Header from "./Header";
import Spinner from "../Chat/Spinner";

const Row = ({ data, index, style }) => (
  <Chat
    style={style}
    data={data.dataToShow[index]}
    handleClick={() => data.handleSelectChat(data.dataToShow[index].chatId)}
  />
);

const Conversations = ({
  data,
  handleQuery,
  handleSelectChat,
  handleModal,
  handleNewContactModal,
  handleSettingsModal,
  showing,
  logout,
  isLaunch,
  lowBattery,
}) => {
  const [dataToShow, setDataToShow] = useState(data);
  useEffect(() => {
    setDataToShow(data.filter((c) => c.filtered));
  }, [data]);

  return (
    <div className={classNames(classes.container, "mobile-fullwidth", showing)}>
      {localStorage.agents && localStorage.userId && (
        <Header
          logout={logout}
          handleSettings={handleSettingsModal}
          isLaunch={isLaunch}
        />
      )}
      <Search
        handleNewContact={handleNewContactModal}
        handleQuery={handleQuery}
        handleModal={handleModal}
      />
      {lowBattery && <LowBattery />}
      <div className={classes.chatsList}>
        {data.length ? (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemData={{ dataToShow, handleSelectChat }}
                itemCount={dataToShow.length}
                itemSize={81}
                width={width}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  );
};

export default Conversations;
