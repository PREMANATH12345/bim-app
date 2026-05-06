import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "react-hot-toast";

// Get the root DOM element
const rootElement = document.getElementById("root");

// Check if root element exists before rendering
if (rootElement) {
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#2e2e2e",
            color: "#f0f0f0",
          },
        }}
      />
      <App />
    </StrictMode>
  );
} else {
  console.error("Failed to find the root element");
}
