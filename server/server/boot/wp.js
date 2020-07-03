'use strict';
const fs = require('fs');
const path = require('path');

module.exports = async function(app) {
  console.log(app.models.Chat.setup);
  const bool = await fs.existsSync(
    path.resolve(__dirname + '../../../session.data.json'),
  );
  if (bool) {
    app.models.Chat.setup();
  }
  console.log(
    'FOUND IT? %s',
    bool,
  );
};
