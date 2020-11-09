'use strict'

module.exports = (data) => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  };
};
