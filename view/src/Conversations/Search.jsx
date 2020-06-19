import React from "react";

import newPhone from "../assets/images/call.svg";
import classes from "./index.module.css";

const Search = ({ value, handleChange, handleNewContact }) => {
  return (
    <div className={classes.searchContainer}>
      <input
        placeholder="Pesquisar..."
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
      <button onClick={handleNewContact}>
        <img src={newPhone} alt="New contact" />
      </button>
    </div>
  );
};

export default Search;
