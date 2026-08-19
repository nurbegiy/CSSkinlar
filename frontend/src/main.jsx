import React from "react";
import ReactDOM from "react-dom/client";
import WebApp from "@twa-dev/sdk";
import App from "./App.jsx";
import "./index.css";

WebApp.ready();
WebApp.expand();
try {
  WebApp.setHeaderColor("#0B0D10");
  WebApp.setBackgroundColor("#0B0D10");
} catch {
  // Ba'zi eski Telegram klient versiyalarida bu metodlar yo'q bo'lishi mumkin
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
