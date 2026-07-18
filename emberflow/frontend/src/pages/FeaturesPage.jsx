import { BarChart3, FileText, HandCoins, PanelsTopLeft, Users } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';

const groups = [
  ['CRM', 'Client profiles, notes, contact data, and history.', Users],
  ['Invoices', 'Line items, taxes, discounts, notes, statuses, and PDF export.', FileText],
  ['Payments', 'Manual payment records and invoice-level payment history.', HandCoins],
  ['Analytics', 'Revenue totals, monthly collections, overdue tracking, and best clients.', BarChart3],
  ['Proposals', 'Templates, editable sections, pricing, timelines, and PDF export.', PanelsTopLeft],
];

export default function FeaturesPage() {
  return (
    <main className="section-band">
      <div className="section-heading">
        <p className="eyebrow">Features</p>
        <h1>Everything freelancers need to operate professionally.</h1>
      </div>
      <div className="feature-grid">
        {groups.map(([title, description, Icon]) => (
          <Card variant="default" key={title}>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{description}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
