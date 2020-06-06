import React from "react";

import classes from "./index.module.css";

const Search = ({ value, handleChange }) => {
  return (
    <div className={classes.searchContainer}>
      <input
        placeholder="Pesquisar..."
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
};

export default Search;
