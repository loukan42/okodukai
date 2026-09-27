import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/AuthContext";
import { LocaleBoundary, LocaleProvider } from "./i18n";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/rpg.css";
import "./styles/world.css";
import "./styles/money.css";
import "./styles/child.css";
import "./styles/booster.css";
import "./styles/celebration.css";
import "./styles/finance.css";
import "./styles/parent-management.css";
import "./styles/admin-analytics.css";
import "./styles/child-world.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocaleProvider>
      <BrowserRouter>
        <AuthProvider>
          <LocaleBoundary>
            <App />
          </LocaleBoundary>
        </AuthProvider>
      </BrowserRouter>
    </LocaleProvider>
  </React.StrictMode>
);
