import { Check, FileText, Lock, Receipt, Sparkles, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Textarea } from '../components/ui/Input.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import FeatureGate from '../components/FeatureGate.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useProfile } from '../hooks/useProfile.js';
import { upsertProfile } from '../services/api.js';
import { deleteLogoAsset, getLogoPathFromUrl, uploadLogoFile } from '../services/brandAssets.js';
import { ColorPicker } from '../document-studio/ColorPicker.jsx';
import { isValidHex } from '../document-studio/color.js';
import { BRAND_FONTS, DEFAULT_BRAND_FONT, loadBrandFont } from '../document-studio/fonts.js';
import { InvoiceDocument } from '../document-studio/InvoiceDocument.jsx';
import { ProposalDocument } from '../document-studio/ProposalDocument.jsx';
import { ScaledPreview } from '../document-studio/ScaledPreview.jsx';
import { SAMPLE_INVOICE as DEMO_INVOICE, SAMPLE_PROPOSAL as DEMO_PROPOSAL } from '../document-studio/sampleDocuments.js';
import { MobilePreviewBackdrop, MobilePreviewFab, MobilePreviewHeader, useMobilePreviewSheet } from '../document-studio/MobilePreviewSheet.jsx';

// Some thrown errors are already meant for users (our own client-side
// validation in brandAssets.js, and the enforce_branding_pro_only trigger's
// "Pro subscription required..." message) -- pass those through as-is.
// Anything else is raw Postgres/PostgREST/Supabase-storage text (constraint
// names, "relation", "duplicate key", bucket internals, etc.) that should
// never reach a user; log it for diagnosis and show one generic message.
const SAFE_ERROR_PATTERNS = [/^pro subscription required/i, /logo must be/i, /choose a logo file/i, /couldn't upload your logo/i];

function friendlyBrandError(err, context) {
  const message = err?.message || '';
  // eslint-disable-next-line no-console
  console.error(`Brand Studio error (${context}):`, err);
  if (SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) return message;
  return "Something went wrong saving your brand settings. Please try again.";
}

function LockedPreview({ profile, onUpgrade }) {
  return (
    <div className="brand-studio__locked-preview">
      <ScaledPreview>
        <InvoiceDocument invoice={DEMO_INVOICE} profile={profile} />
      </ScaledPreview>
      <div className="brand-studio__lock-overlay">
        <span className="brand-studio__lock-badge">
          <Lock size={16} />
          Pro
        </span>
        <p>Your logo, brand color, and font render here once you upgrade.</p>
        <Button variant="primary" size="sm" type="button" onClick={onUpgrade}>
          Upgrade to Pro
        </Button>
      </div>
    </div>
  );
}

function FontPicker({ value, onChange }) {
  return (
    <div className="brand-studio__font-grid" role="radiogroup" aria-label="Document font">
      {BRAND_FONTS.map((font) => {
        const selected = value === font.id;
        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`brand-studio__font-card ${selected ? 'brand-studio__font-card--selected' : ''}`}
            onMouseEnter={() => loadBrandFont(font.id)}
            onFocus={() => loadBrandFont(font.id)}
            onClick={() => onChange(font.id)}
          >
            <span className="brand-studio__font-sample" style={{ fontFamily: font.stack }}>Aa</span>
            <span className="brand-studio__font-meta">
              <strong>{font.label}</strong>
              <span>{font.description}</span>
            </span>
            {selected && <Check size={16} className="brand-studio__font-check" />}
          </button>
        );
      })}
    </div>
  );
}

function LogoDropzone({ logoUrl, uploadingLogo, onUploadLogo, onRemoveLogo }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFiles(fileList) {
    const file = fileList?.[0];
    if (file) onUploadLogo(file);
  }

  return (
    <div
      className={`brand-studio__dropzone ${dragActive ? 'brand-studio__dropzone--active' : ''} ${uploadingLogo ? 'brand-studio__dropzone--busy' : ''}`}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); }
      }}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      aria-label={logoUrl ? 'Replace logo' : 'Upload logo'}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="Business logo" className="brand-studio__logo-preview" decoding="async" />
      ) : (
        <div className="brand-studio__logo-preview brand-studio__logo-preview--empty">
          <Upload size={20} />
        </div>
      )}
      <div className="brand-studio__dropzone-copy">
        {uploadingLogo ? (
          <strong>Uploading...</strong>
        ) : (
          <>
            <strong>{logoUrl ? 'Replace logo' : 'Drop a logo here, or click to browse'}</strong>
            <span>PNG, JPEG, WebP, or SVG. Up to 2MB.</span>
          </>
        )}
      </div>
      {logoUrl && !uploadingLogo && (
        <IconButton
          aria-label="Remove logo"
          className="brand-studio__dropzone-remove"
          onClick={(e) => { e.stopPropagation(); onRemoveLogo(); }}
        >
          <Trash2 size={16} />
        </IconButton>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onUploadLogo(file);
        }}
      />
    </div>
  );
}

function BrandControls({
  form,
  onChange,
  onSave,
  saving,
  onUploadLogo,
  onRemoveLogo,
  uploadingLogo,
  logoError,
  accentEnabled,
  onAccentEnabledChange,
}) {
  return (
    <div className="page-stack brand-studio__controls">
      <Card variant="default" className="brand-studio__card">
        <CardHeader title="Logo" subtitle="Appears on every invoice and proposal you send." />
        <LogoDropzone
          logoUrl={form.logo_url}
          uploadingLogo={uploadingLogo}
          onUploadLogo={onUploadLogo}
          onRemoveLogo={onRemoveLogo}
        />
        {logoError && <p className="input-error" role="alert">{logoError}</p>}
      </Card>

      <Card variant="default" className="brand-studio__card">
        <CardHeader title="Brand color" subtitle="Every shade across your documents is derived from this one color." />
        <div className="brand-studio__color-row">
          <ColorPicker label="Primary" value={form.invoice_brand_color} onChange={(hex) => onChange('invoice_brand_color', hex)} />
        </div>
        <label className="checkbox-wrapper brand-studio__accent-toggle">
          <input
            type="checkbox"
            className="checkbox-input"
            checked={accentEnabled}
            onChange={(e) => onAccentEnabledChange(e.target.checked)}
          />
          <span className="checkbox-box" aria-hidden="true" />
          <span className="checkbox-label">Use a custom accent color</span>
        </label>
        {accentEnabled && (
          <div className="brand-studio__color-row brand-studio__color-row--accent">
            <ColorPicker
              label="Accent override"
              value={form.brand_accent_color || form.invoice_brand_color}
              onChange={(hex) => onChange('brand_accent_color', hex)}
            />
          </div>
        )}
      </Card>

      <Card variant="default" className="brand-studio__card">
        <CardHeader title="Font" subtitle="Applied to your generated invoices and proposals only." />
        <FontPicker value={form.brand_font} onChange={(id) => onChange('brand_font', id)} />
      </Card>

      <Card variant="default" className="brand-studio__card">
        <CardHeader title="Footer & signature" subtitle="Shown at the bottom of every document." />
        <Textarea
          aria-label="Invoice and proposal footer"
          rows={4}
          value={form.invoice_footer}
          onChange={(e) => onChange('invoice_footer', e.target.value)}
          placeholder="Thank you for your business."
        />
      </Card>

      <div className="form-actions form-actions--sticky">
        <Button variant="primary" type="button" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save brand'}
        </Button>
      </div>
    </div>
  );
}

export default function BrandStudioPage() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const { profile, loading, refresh } = useProfile();
  const [form, setForm] = useState(null);
  const [docKind, setDocKind] = useState('invoice');
  const [showDefault, setShowDefault] = useState(false);
  const [accentEnabled, setAccentEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const previousLogoPathRef = useRef(null);
  const { open: previewOpen, openSheet, closeSheet, fabRef, closeButtonRef } = useMobilePreviewSheet();

  useEffect(() => {
    if (!profile) return;
    setForm({
      logo_url: profile.logo_url || '',
      invoice_brand_color: profile.invoice_brand_color || '#2563EB',
      brand_accent_color: profile.brand_accent_color || '',
      brand_font: profile.brand_font || DEFAULT_BRAND_FONT,
      invoice_footer: profile.invoice_footer || '',
    });
    setAccentEnabled(Boolean(profile.brand_accent_color));
    previousLogoPathRef.current = getLogoPathFromUrl(profile.logo_url);
  }, [profile]);

  const defaultProfile = useMemo(() => (profile ? {
    ...profile,
    logo_url: '',
    invoice_brand_color: '#2563EB',
    brand_accent_color: '',
    brand_font: DEFAULT_BRAND_FONT,
  } : null), [profile]);

  const brandedProfile = useMemo(() => (profile && form ? { ...profile, ...form } : null), [profile, form]);

  const previewProfile = showDefault ? defaultProfile : brandedProfile;

  async function persistBranding(values) {
    await upsertProfile({ id: user.id, ...values });
    await refresh();
  }

  async function handleUploadLogo(file) {
    if (!user) return;
    setLogoError('');
    setUploadingLogo(true);
    let uploaded = null;
    try {
      uploaded = await uploadLogoFile(user.id, file);
      await persistBranding({ logo_url: uploaded.publicUrl });
      setForm((current) => ({ ...current, logo_url: uploaded.publicUrl }));
      const oldPath = previousLogoPathRef.current;
      previousLogoPathRef.current = uploaded.path;
      if (oldPath && oldPath !== uploaded.path) {
        await deleteLogoAsset(oldPath);
      }
    } catch (err) {
      setLogoError(friendlyBrandError(err, 'logo upload'));
      // The new object was never linked to the profile -- safe to clean up.
      if (uploaded?.path) deleteLogoAsset(uploaded.path);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    if (!user) return;
    setLogoError('');
    setUploadingLogo(true);
    try {
      await persistBranding({ logo_url: '' });
      setForm((current) => ({ ...current, logo_url: '' }));
      const oldPath = previousLogoPathRef.current;
      previousLogoPathRef.current = null;
      if (oldPath) await deleteLogoAsset(oldPath);
    } catch (err) {
      setLogoError(friendlyBrandError(err, 'logo remove'));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const accentColor = accentEnabled && isValidHex(form.brand_accent_color) ? form.brand_accent_color : '';
      await persistBranding({
        invoice_brand_color: form.invoice_brand_color,
        brand_accent_color: accentColor,
        brand_font: form.brand_font,
        invoice_footer: form.invoice_footer,
      });
      setMessage('Brand saved.');
    } catch (err) {
      setError(friendlyBrandError(err, 'save'));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading Brand Studio..." />
      </div>
    );
  }

  const isPro = subscription.isPro;

  const docPreview = docKind === 'invoice'
    ? <InvoiceDocument invoice={DEMO_INVOICE} profile={previewProfile} />
    : <ProposalDocument proposal={DEMO_PROPOSAL} profile={previewProfile} />;

  return (
    <div className="page-stack brand-studio">
      <div className="page-header">
        <div>
          <p className="eyebrow brand-studio__eyebrow"><Sparkles size={13} /> Brand Studio</p>
          <h2 className="heading-xl">Make every invoice and proposal look like you.</h2>
        </div>
      </div>

      {error ? <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="studio-layout">
        <div className="studio-editor">
          <FeatureGate
            feature="branding"
            title="Brand Studio"
            message="Upgrade to Pro to customize your logo, brand color, and document font across every invoice and proposal."
          >
            <BrandControls
              form={form}
              onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
              onSave={handleSave}
              saving={saving}
              onUploadLogo={handleUploadLogo}
              onRemoveLogo={handleRemoveLogo}
              uploadingLogo={uploadingLogo}
              logoError={logoError}
              accentEnabled={accentEnabled}
              onAccentEnabledChange={setAccentEnabled}
            />
          </FeatureGate>
        </div>

        <div className={`studio-preview ${previewOpen ? 'studio-preview--open' : ''}`}>
          <MobilePreviewHeader title="Live preview" onClose={closeSheet} closeButtonRef={closeButtonRef} />
          <div className="studio-preview__surface">
            <div className="brand-studio__preview-toolbar">
              <div className="brand-studio__doc-tabs" role="tablist" aria-label="Preview document type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={docKind === 'invoice'}
                  className={`brand-studio__doc-tab ${docKind === 'invoice' ? 'brand-studio__doc-tab--active' : ''}`}
                  onClick={() => setDocKind('invoice')}
                >
                  <Receipt size={14} /> Invoice
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={docKind === 'proposal'}
                  className={`brand-studio__doc-tab ${docKind === 'proposal' ? 'brand-studio__doc-tab--active' : ''}`}
                  onClick={() => setDocKind('proposal')}
                >
                  <FileText size={14} /> Proposal
                </button>
              </div>
              {isPro && (
                <button
                  type="button"
                  className="brand-studio__compare-toggle"
                  onClick={() => setShowDefault((v) => !v)}
                >
                  {showDefault ? 'Showing: Default' : 'Showing: Your brand'}
                </button>
              )}
            </div>

            {subscription.loading ? (
              <LoadingSpinner size="md" label="Checking plan..." />
            ) : isPro ? (
              <div key={`${docKind}-${showDefault}`} className="brand-studio__preview-fade">
                <ScaledPreview>{docPreview}</ScaledPreview>
              </div>
            ) : (
              <LockedPreview profile={defaultProfile} onUpgrade={() => setUpgradeOpen(true)} />
            )}
          </div>
        </div>
      </div>

      {!previewOpen && <MobilePreviewFab onClick={openSheet} fabRef={fabRef} />}
      {previewOpen && <MobilePreviewBackdrop onClick={closeSheet} />}
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason="Upgrade to Pro to unlock Brand Studio." />
    </div>
  );
}
