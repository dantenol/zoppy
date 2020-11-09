"use strict";

require('dotenv').config();
const AWS = require("aws-sdk");

const ssm = new AWS.SSM();

var params = {
  CommandId: "0ef3c175-2b88-488a-8b52-87727e9d175e" /* required */,
  InstanceId: "i-0a33346d25a135746" /* required */,
};
ssm.getCommandInvocation(params, function (err, data) {
  if (err) console.log(err, err.stack);
  // an error occurred
  else console.log(data); // successful response
});
