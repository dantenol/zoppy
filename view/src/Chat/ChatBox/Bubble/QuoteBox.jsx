import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import classes from "./index.module.css";

const BodyContent = ({data}) => {
  if (data && data.length > 200 && !data.includes(' ')) {
    return <img alt="imagem respondida" src={`data:image/jpg;base64,${data}`} />
  } else {
    return <span>{data}</span>
  }
}

const QuoteBox = ({data}) => {
  const {body, sender, mine} = data
  return (
    <div className={classNames(classes.quote, classes[mine])}>
      <span className={classes.from}>{sender}</span>
      <br/>
      <BodyContent data={body} />
    </div>
  )
}

QuoteBox.propTypes = {
  data: PropTypes.object.isRequired,
}

export default QuoteBox
