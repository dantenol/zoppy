import React from "react";
import { renderToString } from "react-dom/server";
import Emoji from "react-emoji-render";

import { parseText } from "./helpers";

const FormattedSpan = ({ text, enter }) => {
  const emojiedText = renderToString(<Emoji text={text} />);

  return (
    <span dangerouslySetInnerHTML={{ __html: parseText(emojiedText, enter) }}></span>
  );
};

export default FormattedSpan;

export const FormattedP = ({ text, enter }) => {
  const emojiedText = renderToString(<Emoji text={text} />);

  return (
    <p dangerouslySetInnerHTML={{ __html: parseText(emojiedText, enter) }}></p>
  );
};

