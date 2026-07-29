import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Wystąpił błąd aplikacji</h1>
            <p className="text-slate-600 mb-8">
              Przepraszamy, coś poszło nie tak. Spróbuj odświeżyć stronę lub wrócić do panelu głównego.
            </p>
            
            {(import.meta as any).env?.DEV && this.state.error && (
              <div className="mb-8 p-4 bg-slate-100 rounded-lg text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-600 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Odśwież aplikację
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Wróć do strony głównej
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
