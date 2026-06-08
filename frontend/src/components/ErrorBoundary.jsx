import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-slate-800 dark:text-[#F8FAFC]">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 max-w-xl w-full shadow-2xl border border-slate-200/60 dark:border-[#334155] text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-600 to-red-500"></div>
            
            <div className="w-16 h-16 bg-red-50 dark:bg-rose-950/20 text-[#EF4444] rounded-full flex items-center justify-center mx-auto text-3xl shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-[#F8FAFC]">
                Something Went Wrong
              </h2>
              <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed max-w-md mx-auto">
                An unexpected error occurred in this section of the application. The system has safely isolated the issue.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/50 dark:border-[#334155] text-left max-h-40 overflow-y-auto">
                <p className="font-mono text-xs text-rose-600 dark:text-[#EF4444] font-bold">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 font-mono text-[10px] text-slate-500 dark:text-[#94A3B8] leading-normal whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#EF4444] hover:bg-red-600 dark:hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/10 active:scale-[0.98]"
              >
                <RefreshCw size={15} />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-2.5 border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] font-semibold rounded-xl text-sm transition-all active:scale-[0.98]"
              >
                <Home size={15} />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
