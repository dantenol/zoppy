"use strict";

const AWS = require("aws-sdk");
const error = require("./error");

const docClient = new AWS.DynamoDB.DocumentClient();
const letters = "abcdefghijklmnopqrstuvwxyz";

function arrangeUpdate(obj) {
  const o = {
    UpdateExpression: "set ",
    ExpressionAttributeValues: {},
  };

  Object.keys(obj).forEach((e, i) => {
    const el = obj[e];
    const letter = ":" + letters[i];
    o.UpdateExpression += e + " = " + letter + ", ";
    o.ExpressionAttributeValues[letter] = el;
  });

  o.UpdateExpression = o.UpdateExpression.slice(0, -2);
  return o;
}

function arrangeQuery(obj) {
  const [key, val] = Object.entries(obj)[0];
  const o = {
    ExpressionAttributeNames: {
      "#search": key,
    },
    FilterExpression: "#search = :val",
    ExpressionAttributeValues: {
      ":val": val,
    },
  };
  return o;
}

async function put(obj, TableName) {
  const postData = {
    TableName,
    Item: obj,
  };

  postData.Item.createdAt = new Date().toISOString();
  try {
    const data = await docClient.put(postData).promise();
    console.log("Success PUT", data);
    return obj;
  } catch (err) {
    console.log("Failure", err.message);
    console.error("Unable to add. Error JSON:", JSON.stringify(err, null, 2));
    throw err;
  }
}

exports.update = async (id, obj, TableName) => {
  const params = {
    TableName,
    Key: {
      contactId: id,
    },
    ReturnValues: "UPDATED_NEW",
    ...arrangeUpdate(obj),
  };

  try {
    const data = await docClient.update(params).promise();
    console.log("Success", data);
    return data.Attributes;
  } catch (err) {
    console.log("Failure", err.message);
    console.error("Unable to add. Error JSON:", JSON.stringify(err, null, 2));
    throw err;
  }
};

exports.getItemById = async (primaryKey, id, TableName) => {
  const select = {
    TableName,
    Key: {
      [primaryKey]: id,
    },
  };

  console.log(select);
  try {
    const data = await docClient.get(select).promise();
    return data.Item;
  } catch (err) {
    console.log("Failure", err.message);
    console.error("Unable to add. Error JSON:", JSON.stringify(err, null, 2));
    throw err;
  }
};

// FilterExpression: "#yr between :start_yr and :end_yr",
// ExpressionAttributeNames: {
//     "#yr": "year",
// },
// ExpressionAttributeValues: {
//     ":start_yr": 1950,
//     ":end_yr": 1959
// }
exports.getItem = async (query, TableName) => {
  let obj = query;

  if (query && !JSON.stringify(query).includes("FilterExpression")) {
    obj = arrangeQuery(query);
  }
  const select = {
    TableName,
    ...obj,
  };

  try {
    const data = await docClient.scan(select).promise();
    return data.Items;
  } catch (err) {
    console.log("Failure", err.message);
    console.error("Unable to add. Error JSON:", JSON.stringify(err, null, 2));
    throw err;
  }
};

async function isDuplicate(id, TableName) {
  const obj = await exports.getItem(id, TableName);
  return Boolean(obj.length);
}

exports.post = async (data, primaryKey, TableName) => {
  if (!(await isDuplicate(data[primaryKey], TableName))) {
    return await put(data, TableName);
  } else {
    return error(500, "duplicated");
  }
};
