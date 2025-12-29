import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Simple error boundary to keep individual sections from crashing the whole app.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '1rem',
          background: '#2d2d2d',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '8px',
          maxWidth: '480px'
        }}>
          <h4 style={{ marginTop: 0 }}>Something went wrong.</h4>
          {this.state.error && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#fca5a5' }}>
              {this.state.error.message}
            </pre>
          )}
          <button onClick={this.handleReset} style={{ marginTop: '0.5rem' }}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
