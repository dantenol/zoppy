import React, {useState, useEffect} from 'react'

import classes from "./index.module.css"
import Search from './Search'
import Chat from './Chat';

const Conversations = ({ data, handleQuery, handleSelectChat }) => {
  const [query, setQuery] = useState("");


  const handleChangeQuery = val => {
    setQuery(val)
    handleQuery(val);
  }

  return (
    <div className={classes.container}>
      <Search value={query} handleChange={handleChangeQuery} />
      {data.map((chat, i) => (
        <Chat key={chat.chatId} data={chat} handleClick={() => handleSelectChat(i)} />
      ))}
    </div>
  )
}

export default Conversations
