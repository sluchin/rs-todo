import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { setupLogging } from "./services/logForwarder";

// バックエンドのログファイルにも残すため, 転送を設定して, レベルを決める (開発版はデバッグ, リリース版は情報).
setupLogging();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
