'use strict';

db.createUser(
  {
    user: 'root',
    pwd: 'pass',
    roles: [{role: 'dbOwner', db: 'whatsapp'}],
  },
  {
    w: 'majority',
    wtimeout: 5000,
  },
);
db.createCollection('whatsapp');
