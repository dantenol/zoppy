import _ from "lodash";

export const compareArrays = (x, y) => {
  return _(x).xorWith(y, _.isEqual).isEmpty();
};

export const cloneArray = (arr) => _.map(arr, _.clone);

export const deepDiff = (object, base) => {
  function changes(object, base) {
    return _.transform(object, function (result, value, key) {
      if (!_.isEqual(value, base[key])) {
        result[key] =
          _.isObject(value) && _.isObject(base[key])
            ? changes(value, base[key])
            : value;
      }
    });
  }
  return changes(object, base);
};

export const asyncLocalStorage = {
  setItem: (key, value) => {
    return Promise.resolve().then(localStorage.setItem(key, value));
  },
  getItem: (key) => {
    return Promise.resolve().then(localStorage.getItem(key));
  },
};


export function parseText(text, enter = true) {
  const strong = /\*(.+?)\*/g;
  const italic = /_(.+?)_/g;
  const newLine = /\n/g;
  let lineBreak = '<br />';

  if (!enter) {
    lineBreak = '&nbsp;'
  }

  let str;
  if (typeof text === 'string') {
    str = text
  } else {
    str = text[0]
  }
  if (typeof str !== 'string') {
    return str
  } else {
    return str
    .replace(italic, '<i>$1</i>')
    .replace(newLine, lineBreak)
    .replace(strong, '<b>$1</b>')
  }
}