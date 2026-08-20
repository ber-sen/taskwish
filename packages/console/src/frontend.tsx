import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import AppPage from "./app/page";
import "./styles.generated.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Console root element was not found");
}

const app = (
  <StrictMode>
    <AppPage />
    <Toaster closeButton position="bottom-left" />
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(rootElement));
  root.render(app);
} else {
  createRoot(rootElement).render(app);
}
