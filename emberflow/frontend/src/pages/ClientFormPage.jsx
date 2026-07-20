import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { createClient, getClient, updateClient } from '../services/api.js';

const initialForm = {
  name: '',
  email: '',
  company: '',
  phone: '',
  country: '',
  notes: '',
};

export default function ClientFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    async function load() {
      try {
        const client = await getClient(id);
        setForm({
          name: client.name || '',
          email: client.email || '',
          company: client.company || '',
          phone: client.phone || '',
          country: client.country || '',
          notes: client.notes || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [editing, id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const values = { ...form, user_id: user.id };
      const saved = editing ? await updateClient(id, values) : await createClient(values);
      navigate(`/app/clients/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="panel">Loading client...</div>;

  return (
    <div className="page-stack page-stack--narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">{editing ? 'Edit client' : 'New client'}</p>
          <h2 className="heading-xl">{editing ? 'Update client details.' : 'Add a client to your workspace.'}</h2>
        </div>
      </div>
      <Card variant="default">
        <form className="form-grid" onSubmit={handleSubmit}>
          {error ? <p className="form-error span-2">{error}</p> : null}
          <Input label="Name" required value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          <Input label="Company" value={form.company} onChange={(e) => updateField('company', e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          <Input label="Country" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          <Textarea label="Notes" rows={5} className="span-2" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          <div className="form-actions span-2">
            <Button as={Link} variant="ghost" to="/app/clients">Cancel</Button>
            <Button variant="primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save client'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
