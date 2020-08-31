function saveUrl(url) {
  const subdomain = url.match(/:\/\/(.+?).zoppy/g)[0];
  const domain = "https" + subdomain + ".app";
  // const domain = "http://localhost:3000"
  chrome.storage.local.set({ url: domain }, function () {
    console.log("Value is set to " + domain);
  });
}

function redirect(id, url) {
  chrome.storage.local.get(["url"], function (result) {
    let myUrl = result.url;
    if (url.startsWith("https://wa.me")) {
      const nbr = /wa.me\/(\d+)/g.exec(url);
      myUrl += "?phone=" + nbr;
    } else if (url.startsWith("https://api.whatsa")) {
      const nbr = /phone=(\d+)/g.exec(url);
      const text = /text=([a-zA-z0-9%]+)/g.exec(url);
      console.log(nbr, text);
      myUrl += "?" + nbr[0];
      if (text) {
        myUrl += "&" + text[0];
      }
    }
    chrome.tabs.update(id, { url: myUrl }, () => {});
  });
}

chrome.tabs.onUpdated.addListener((idx, change, tab) => {
  if (
    tab.url.startsWith("https://wa.me") ||
    tab.url.startsWith("https://web.wha") ||
    tab.url.startsWith("https://api.whatsa")
  ) {
    redirect(idx, tab.url);
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request) {
    case "save":
      saveUrl(sender.tab.url);
      break;
    default:
      break;
  }
});
