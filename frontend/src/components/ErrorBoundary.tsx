import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

/** Props accepted by {@link ErrorBoundary}. */
interface Props {
  children: ReactNode;
}

/** Internal state tracked by {@link ErrorBoundary}. */
interface State {
  hasError: boolean;
}

/**
 * React class component that catches JavaScript errors anywhere in its child
 * tree and renders a fallback UI instead of crashing the whole app.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
          <p style={{ color: "#888", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
