import { Link } from 'react-router-dom';

export default function EmptyState({ title, message, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Link className="button primary" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
