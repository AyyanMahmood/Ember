import { effectiveStatus } from '../utils/invoice.js';

export default function StatusBadge({ invoice, status }) {
  const value = status || effectiveStatus(invoice);
  return <span className={`status-badge status-${value}`}>{value}</span>;
}
