function saveUrl(url) {
  chrome.storage.local.set({ url }, function () {
    console.log("Value is set to " + url);
  });
}

function redirect(id, url) {
  chrome.storage.local.get(["url"], function (result) {
    let number;
    if (url.startsWith("https://wa.me")) {
      const nbr = /wa.me\/(\d+)/g.exec(url);
      number = nbr[1];
    } else if (url.startsWith("https://api.whatsa")) {
      const nbr = /phone=(\d+)/g.exec(url);
      number = nbr[1];
    }
    chrome.tabs.update(id, { url: result.url + number }, () => {
    });
  });
}

chrome.tabs.onUpdated.addListener((idx, change, tab) => {
  if (
    tab.url.startsWith("https://wa.me") ||
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
