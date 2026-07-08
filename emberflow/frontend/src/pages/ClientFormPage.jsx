import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
    <div className="page-stack narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">{editing ? 'Edit client' : 'New client'}</p>
          <h2>{editing ? 'Update client details.' : 'Add a client to your workspace.'}</h2>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        {error ? <p className="form-error">{error}</p> : null}
        <label>
          Name
          <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>
        <label>
          Company
          <input value={form.company} onChange={(event) => updateField('company', event.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
        </label>
        <label>
          Country
          <input value={form.country} onChange={(event) => updateField('country', event.target.value)} />
        </label>
        <label className="span-2">
          Notes
          <textarea rows="5" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </label>
        <div className="form-actions span-2">
          <Link className="button ghost" to="/app/clients">
            Cancel
          </Link>
          <button className="button primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save client'}
          </button>
        </div>
      </form>
    </div>
  );
}
