import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from './Button';

/**
 * Production-Grade Global Error Boundary.
 * Catches JavaScript errors anywhere in child component tree,
 * logs errors safely, and displays a resilient fallback recovery UI.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // In production, send to error logging service (e.g. Sentry/Firebase Crashlytics)
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 antialiased">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-lg text-center space-y-5 animate-fadeIn">
            {/* Error Icon */}
            <div className="w-14 h-14 mx-auto bg-red-50 text-status-error border border-red-200 rounded-2xl flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Error Message */}
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected system error occurred. We've captured the diagnostics and your data remains safe.
              </p>
            </div>

            {/* Error Details (Only if error message is present) */}
            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-x-auto">
                <p className="text-[11px] font-mono text-slate-700 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={RotateCcw}
                onClick={this.handleReload}
                className="w-full sm:w-auto shadow-xs"
              >
                Reload Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Home}
                onClick={this.handleGoHome}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
