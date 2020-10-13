import pkg from "../package.json"

export const url = "https://demo.zoppy.app/api/";

export const params = {
  params: {
    access_token: localStorage.access_token,
  },
};

export const webVersion = pkg.version;