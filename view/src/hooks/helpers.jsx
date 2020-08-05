import _ from "lodash";

const urlRegex = /([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*))/g;

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

function urlify(txt) {
  return txt
    .split(" ")
    .map((part, i) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith("http") ? part : "http://" + part;
        return (
          `<a key=${i} rel="noopener noreferrer" target="_blank" href=${url}>` +
          part +
          "</a>"
        );
      }
      return part;
    })
    .join(" ");
}

export function parseText(text, enter = true) {
  const strong = /\*(.+?)\*/g;
  const italic = /_(.+?)_/g;
  const newLine = /\n/g;
  let lineBreak = "<br />";
  let str;
  if (typeof text === "string") {
    str = text;
  } else if (Array.isArray(text)) {
    str = text.join(" ");
  }

  if (!enter) {
    lineBreak = "&nbsp;";
  } else {
    // str = urlify(str);
  }

  if (typeof str !== "string") {
    return str;
  } else {
    return str
      .replace(italic, "<i>$1</i>")
      .replace(newLine, lineBreak)
      .replace(strong, "<b>$1</b>");
  }
}

export const idToPhone = (id) => {
  const parsed = id.slice(2, id.indexOf("@"));
  const ddd = parsed.slice(0, 2);
  const lastPart = parsed.slice(-4);
  let firstPart = parsed.slice(2, -4);
  if (firstPart.length === 4) {
    firstPart = "9" + firstPart;
  }
  return `(${ddd}) ${firstPart}-${lastPart}`;
};
