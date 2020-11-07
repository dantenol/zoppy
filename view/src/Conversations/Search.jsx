import React, { useState } from "react";
import classNames from "classnames";

import newPhone from "../assets/images/call.svg";
import search from "../assets/images/search.svg";
import classes from "./index.module.css";

const Search = ({ handleNewContact, handleQuery, handleModal }) => {
  const [query, setQuery] = useState("");
  const [queryPin, setQueryPin] = useState(false);

  const handleChangeQuery = ({ target }) => {
    const val = target.value;

    setQuery(val);
    handleQuery(val, queryPin);
  };
  
  const handleChangePin = () => {
    setQueryPin(!queryPin);
    handleQuery(query, !queryPin);
  }
  return (
    <div className={classes.searchContainer}>
      <input
        placeholder="Pesquisar..."
        type="text"
        value={query}
        onChange={handleChangeQuery}
      />
      <button onClick={handleChangePin}>
        <div className={classNames(classes.pin, classes[queryPin])}></div>
      </button>
      <button onClick={() => handleModal("advancedSearch")}>
        <img src={search} alt="Busca avançada" />
      </button>
      <button onClick={handleNewContact}>
        <img src={newPhone} alt="Nova conversa" />
      </button>
    </div>
  );
};

export default Search;
