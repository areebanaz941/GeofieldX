import React, { Component, ErrorInfo, ReactNode } from 'react';
import { detectExtensionInterference, detectKnoweeAI } from '@/lib/utils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isExtensionError: boolean;
}

export class ExtensionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      isExtensionError: false 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this error is likely from extension interference
    const stack = error.stack || '';
    const message = error.message || '';
    
    const isExtensionError = 
      stack.includes('knowee-ai') ||
      stack.includes('extension://') ||
      stack.includes('FloatTool') ||
      message.includes('Cannot destructure property') ||
      detectExtensionInterference() ||
      detectKnoweeAI();

    return {
      hasError: true,
      error,
      isExtensionError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    if (this.state.isExtensionError) {
      console.warn('[Extension] Error boundary caught extension-related error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
      
      // Try to recover from extension interference
      this.recoverFromExtensionError();
    } else {
      console.error('[App] Error boundary caught application error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  private recoverFromExtensionError() {
    // Attempt to clean up extension interference
    setTimeout(() => {
      try {
        // Remove knowee-ai elements
        const knoweeElements = document.querySelectorAll('[class*="knowee"], [id*="knowee"], [class*="FloatTool"]');
        knoweeElements.forEach(element => {
          try {
            element.remove();
          } catch (e) {
            console.warn('[Extension] Could not remove element:', e);
          }
        });
        
        // Reset error state to try again
        this.setState({ 
          hasError: false, 
          error: undefined, 
          errorInfo: undefined,
          isExtensionError: false 
        });
        
        console.log('[Extension] Attempted recovery from extension interference');
      } catch (e) {
        console.warn('[Extension] Recovery attempt failed:', e);
      }
    }, 1000);
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isExtensionError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Extension Interference Detected</h3>
                  <p className="text-sm text-gray-500">Browser extension is interfering with the application</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  The <strong>knowee-ai</strong> browser extension is interfering with this application. 
                  We've detected script injection that may cause functionality issues.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Reload Application
                </button>
                
                <button
                  onClick={() => this.recoverFromExtensionError()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Try Recovery
                </button>
                
                <details className="mt-4">
                  <summary className="text-sm text-gray-600 cursor-pointer">Technical Details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error?.message}
                  </pre>
                </details>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>To prevent this issue:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Disable the knowee-ai browser extension</li>
                  <li>Use an incognito/private browsing window</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </div>
          </div>
        );
      }
      
      // Generic error fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ExtensionErrorBoundary;