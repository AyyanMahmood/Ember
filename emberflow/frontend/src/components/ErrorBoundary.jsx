import { Component } from 'react';

/**
 * Top-level error boundary. Catches render-time errors anywhere in the tree —
 * most importantly failed lazy-route chunk fetches (common when a deploy
 * rotates chunk hashes while a user still holds a stale index.html), which
 * would otherwise unmount React and leave a blank white screen.
 *
 * Chunk-load failures are almost always fixed by re-fetching the fresh HTML,
 * so those get a "Reload" primary action. A one-shot guard (sessionStorage)
 * prevents a reload loop if the failure is not actually stale-deploy related.
 */
function isChunkLoadError(error) {
  if (!error) return false;
  const message = `${error.name || ''} ${error.message || ''}`;
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(
    message
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error) {
    // A stale-deploy chunk error resolves itself on a fresh load. Reload once
    // automatically, guarded so a genuine bug can't spin in a reload loop.
    if (isChunkLoadError(error) && typeof sessionStorage !== 'undefined') {
      const alreadyReloaded = sessionStorage.getItem('ef-chunk-reload');
      if (!alreadyReloaded) {
        sessionStorage.setItem('ef-chunk-reload', '1');
        window.location.reload();
      }
    }
  }

  handleReload() {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('ef-chunk-reload');
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.state.isChunkError ? 'Update available' : 'Something went wrong';
    const message = this.state.isChunkError
      ? 'A newer version of EmberFlow is ready. Reload to continue.'
      : 'An unexpected error interrupted this page. Reloading usually fixes it.';

    return (
      <div className="app-error" role="alert">
        <div className="app-error__panel">
          <h1 className="app-error__title">{title}</h1>
          <p className="app-error__message">{message}</p>
          <button type="button" className="button button--primary button--md" onClick={this.handleReload}>
            Reload EmberFlow
          </button>
        </div>
      </div>
    );
  }
}
