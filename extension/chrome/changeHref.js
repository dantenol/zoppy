chrome.storage.local.get(["url"], function (result) {
  replaceUrls(result.url);
});

function replaceUrls(url) {
  document.querySelectorAll("a[href*='https']").forEach((e) => {
    console.log(e.href);
    const [all, originalUrl, path] = /(https:\/\/.+?)\/(.+?)$/g.exec(e.href);

    if (originalUrl.startsWith("https://wa.me")) {
      const newRef = url + "?phone=" + path;
      e.href = newRef;
    }
  });
}
