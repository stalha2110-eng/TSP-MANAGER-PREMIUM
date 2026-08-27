import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React ErrorBoundary captured crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#090d16',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, monospace',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflow: 'auto',
          zIndex: 999999
        }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            <h3 style={{ color: '#ef4444', fontSize: '18px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              🚨 REACT RENDERING CRASH
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              App render pipeline failed
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
              {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown Exception'}
            </p>
          </div>
          <pre style={{
            background: '#1e293b',
            padding: '16px',
            borderRadius: '12px',
            overflowX: 'auto',
            margin: 0,
            fontSize: '12px',
            lineHeight: '1.5',
            border: '1px solid #334155',
            color: '#fda4af',
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.stack || 'No component stack trace acquired.'}
          </pre>
          <button 
            type="button"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              marginTop: '16px',
              letterSpacing: '0.02em'
            }}
          >
            FORCE RESET CACHE & RELOAD APP
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Prevent browser context menus (triggered by right clicks or hold-clicks) to suppress download/share/print prompts
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' ||
       target.tagName === 'TEXTAREA' ||
       target.tagName === 'SELECT' ||
       target.isContentEditable)
    ) {
      return; // Allow standard browser controls inside textual boxes
    }
    e.preventDefault();
  }, { capture: true });
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Registered:', reg))
      .catch(err => console.log('SW Registration Failed:', err));
  });
}
