import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppGate from "./AppGate";
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
        <AppGate />
    </BrowserRouter>
  </StrictMode>
);
