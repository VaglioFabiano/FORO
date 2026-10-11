import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { avviaHomepage } from "./lib/homepage";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";
import "./styles/domain.css";

avviaHomepage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
