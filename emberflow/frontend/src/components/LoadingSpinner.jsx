export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading-row" role="status" aria-live="polite">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}
