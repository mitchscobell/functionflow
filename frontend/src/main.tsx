import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";

/**
 * Application entry point.
 * Mounts the React root with StrictMode, BrowserRouter, AuthProvider,
 * ThemeProvider, the App component, and a global toast notification container.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--card)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
