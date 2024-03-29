'use strict';
const fs = require('fs');
const path = require('path');

module.exports = async function(app) {
  const bool = await fs.existsSync(
    path.resolve(__dirname + '../../../session/session.data.json'),
  );
  if (bool) {
    app.models.Chat.setup();
  }
  const admin = await app.models.Admin.get();
  console.log(admin);
  if (!admin) {
    const admin = await app.models.Admin.new();
    console.log(admin);
  }
};
