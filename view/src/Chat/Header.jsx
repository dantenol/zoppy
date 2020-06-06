import React from 'react'

import classes from "./index.module.css";

const Header = ({data}) => {
  return (
    <div className={classes.header}>
      <img src={data.profilePic} alt="Foto"/>
      <p>{data.name}</p>
    </div>
  )
}

export default Header
