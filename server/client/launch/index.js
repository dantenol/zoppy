let connector = window.location.origin + "/api/";

if (window.location.origin.includes("localhost")) {
  connector = "https://localhost:3001/api/"
  // connector = "https://vmh1.zoppy.app/api/"
}