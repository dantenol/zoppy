'use strict'

module.exports = (number, message) => {
  return {
    statusCode: number,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
    },
    body: message,
  };
};
