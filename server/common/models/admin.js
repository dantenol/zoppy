'use strict';

module.exports = function(Admin) {
  Admin.new = async () => {
    return await Admin.create();
  }

  Admin.change = async (data) => {
    const adm = await Admin.findOne();
    return await adm.updateAttributes(data);
  }
  
  Admin.afterRemote('change', async () => {
    Admin.app.models.Chat.loadSettings();
    return;
  });

  Admin.remoteMethod('change', {
    accepts: {arg: 'data', type: 'object', http: {source: 'body'}},
    description: 'edit settings',
    returns: {root: true},
    http: {path: '/update', verb: 'patch'},
  });

  Admin.get = async () => {
    return await Admin.findOne();
  }

  Admin.remoteMethod('get', {
    description: 'load settings',
    returns: {root: true},
    http: {path: '/', verb: 'get'},
  });
};
