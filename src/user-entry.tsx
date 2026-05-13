import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { UserAppRouter } from "@/user/UserAppRouter";
import "@/styles/index.css";
import "goey-toast/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <UserAppRouter />
    </HashRouter>
  </StrictMode>,
);
