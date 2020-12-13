import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import classes from "./index.module.css";

const QuoteBox = ({data}) => {
  const {body, sender, mine, timestamp} = data
  return (
    <div className={classNames(classes.quote, classes[mine])}>
      <span className={classes.from}>{sender}</span>
      <br/>
      <span>{body}</span>
    </div>
  )
}

QuoteBox.propTypes = {
  data: PropTypes.object.isRequired,
}

export default QuoteBox
