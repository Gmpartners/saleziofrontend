import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error);
    console.error('Stack trace:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b11] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0f1621] rounded-lg border border-[#1f2937]/40 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              Oops! Algo deu errado
            </h2>
            
            <p className="text-slate-400 mb-6">
              Um erro inesperado ocorreu. Tente recarregar a página ou entre em contato com o suporte se o problema persistir.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6 bg-[#101820] rounded p-3 border border-[#1f2937]/40">
                <summary className="text-red-400 cursor-pointer mb-2 font-mono text-sm">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="text-xs text-red-300 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#0d9268] text-white rounded-md transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </button>
              
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[#101820] hover:bg-[#1f2937] text-slate-300 border border-[#1f2937]/40 rounded-md transition-colors"
              >
                Recarregar Página
              </button>
            </div>

            {this.state.retryCount > 0 && (
              <p className="text-xs text-slate-500 mt-4">
                Tentativas: {this.state.retryCount}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;