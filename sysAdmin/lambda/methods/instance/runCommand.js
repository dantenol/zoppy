'use strict'

const AWS = require('aws-sdk');

const ssm = new AWS.SSM();

module.exports = async (command, instances) => {
  const params = {
    Document: "AWS-RunShellScript",
    
  };

  ssm.sendCommand().promise();
}