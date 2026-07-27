import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { EmberSelect } from '../components/ui/EmberSelect.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { createClient, getClient, updateClient } from '../services/api.js';
import { COUNTRY_OPTIONS } from '../data/countries.js';

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
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function updatePhone(value) {
    // Allow digits plus the punctuation international numbers use
    // (+, spaces, hyphens, parens); reject letters.
    updateField('phone', value.replace(/[^\d+\-\s()]/g, ''));
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Name is required.';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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

  if (loading) {
    return (
      <div className="page-stack page-stack--narrow">
        <div className="page-header">
          <div>
            <p className="eyebrow">Edit client</p>
            <h1 className="heading-xl">Update client details.</h1>
          </div>
        </div>
        <Card variant="default">
          <LoadingSpinner size="md" label="Loading client..." />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack page-stack--narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">{editing ? 'Edit client' : 'New client'}</p>
          <h1 className="heading-xl">{editing ? 'Update client details.' : 'Add a client to your workspace.'}</h1>
        </div>
      </div>
      <Card variant="default">
        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          {error ? <p className="form-error span-2">{error}</p> : null}
          <Input label="Name" required autoFocus value={form.name} onChange={(e) => updateField('name', e.target.value)} error={fieldErrors.name} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} error={fieldErrors.email} />
          <Input label="Company" value={form.company} onChange={(e) => updateField('company', e.target.value)} />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => updatePhone(e.target.value)}
          />
          <EmberSelect label="Country" searchable placeholder="Select country" value={form.country} onChange={(value) => updateField('country', value)} options={COUNTRY_OPTIONS} />
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
