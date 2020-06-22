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
