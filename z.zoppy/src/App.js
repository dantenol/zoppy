import React from "react";
import logo from "./logo.png";
import "./App.css";

function App() {
  window.onload = function() {
    const timer = setTimeout(() => {
      window.location.href = "https://zoppy.app"
    }, 1000);
    function receiveMessage(e) {
      if (typeof e.data === 'string') {
        clearInterval(timer)
        console.log("Message Received: " + e.data);
        localStorage.setItem("url", "https://" + e.data);
      }
    }
    
    if (window.location.pathname.length > 1) {
      window.location.href = localStorage.url + window.location.pathname;
      clearInterval(timer)
    }
    window.addEventListener('message', receiveMessage);
  }
  return (
    <div>
      <img src={logo} className="App-logo" alt="logo" />
      <h2>Redirecionando...</h2>
    </div>
  );
}

export default App;
