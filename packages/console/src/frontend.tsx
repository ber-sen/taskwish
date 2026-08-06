import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppPage from "./app/page";
import "./styles.generated.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Console root element was not found");
}

const app = (
  <StrictMode>
    <AppPage />
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(rootElement));
  root.render(app);
} else {
  createRoot(rootElement).render(app);
}
