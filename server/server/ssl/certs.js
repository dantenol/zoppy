'use strict';
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

function download(key) {
  return new Promise((resolve, reject) => {
    const params = {Bucket: 'zoppy-cert', Key: key};
    s3.getObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else resolve(data.Body.toString('utf-8'));
    });
  });
}

module.exports = async function () {
  const key = await download('privkey.pem');
  const cert = await download('fullchain.pem');
  return {key, cert};
};
