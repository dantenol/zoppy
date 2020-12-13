import pkg from "../package.json"

let url = "/api/"

let socketParams = [{
  secure: true,
  query: {
    access_token: localStorage.access_token,
  },
}]
if (window.location.href.includes("localhost")) {
  url = "https://localhost:3001/api/";
  socketParams.unshift("https://localhost:3001/")
}

export {url, socketParams};

export const params = {
  params: {
    access_token: localStorage.access_token,
  },
};

export const webVersion = pkg.version;