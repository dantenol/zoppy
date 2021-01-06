'use strict';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function (app) {
  await sleep(20000); // TODO update to 90000
  setInterval(() => {
    app.models.Scheduled.checkMessagesToSend();
  }, 10000);
};
