import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-dark-900/80 border border-white/[0.08] backdrop-blur-xl my-4 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={22} />
          </div>
          <h3 className="text-base font-bold text-white">
            {this.props.fallbackTitle || "Something went wrong in this tool"}
          </h3>
          <p className="text-xs text-gray-400 max-w-md">
            {this.state.error?.message || this.props.fallbackMessage || "An unexpected error occurred while rendering."}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="flex items-center gap-1.5 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 px-4 py-2 text-xs font-bold text-accent-cyan hover:bg-accent-cyan/30 transition shadow-sm cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset & Reload Tool</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
