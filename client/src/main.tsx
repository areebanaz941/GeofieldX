import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { initializeExtensionBlocker } from "./lib/extensionBlocker";
import ExtensionErrorBoundary from "./components/ExtensionErrorBoundary";

// Initialize extension protection before anything else
initializeExtensionBlocker();

// Initialize the app
createRoot(document.getElementById("root")!).render(
  <ExtensionErrorBoundary>
    <App />
  </ExtensionErrorBoundary>
);
