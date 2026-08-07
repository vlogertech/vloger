import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Filet de sécurité global : sans lui, toute erreur de rendu React
 * (donnée inattendue, undefined non géré, etc.) affiche un écran
 * blanc silencieux en production.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Point d'accroche pour un futur outil de monitoring (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
        style={{ backgroundColor: '#111111' }}
      >
        <span
          className="text-sm font-light tracking-widest mb-6"
          style={{ color: '#C9A84C', letterSpacing: '0.25em' }}
        >
          VLOGER
        </span>
        <p className="text-sm font-light mb-2" style={{ color: '#eee' }}>
          Une erreur inattendue s'est produite.
        </p>
        <p className="text-xs font-light mb-8" style={{ color: '#777' }}>
          Réessaie, ou reviens à l'accueil.
        </p>
        <button
          onClick={this.handleReload}
          className="flex items-center gap-2 px-6 py-3 text-xs font-light tracking-wider"
          style={{ border: '1px solid #2a2a2a', borderRadius: 2, color: '#C9A84C', letterSpacing: '0.08em' }}
        >
          <RefreshCw size={13} strokeWidth={1.5} />
          RETOUR À L'ACCUEIL
        </button>
      </div>
    );
  }
}