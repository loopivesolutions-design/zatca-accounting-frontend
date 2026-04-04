import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api, { BACKEND_URL } from '../../api/axios';
import { parseApiError } from '../../api/errors';

function digitsOnly(v: string) { return v.replace(/\D+/g, ''); }

interface CompanySettings {
  id: string;
  logo: string | null;
  company_name: string;
  company_name_ar: string;
  street_address: string;
  street_address_ar: string;
  building_number: string;
  district: string;
  district_ar: string;
  city: string;
  city_ar: string;
  country: string | null;
  country_name: string | null;
  postal_code: string;
  cr_number: string;
  vat_registration_number: string;
  industry: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface Country {
  id: string;
  name: string;
}

function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Any absolute path (e.g. /media/... or /api/v1/media/...) — just prepend origin
  if (path.startsWith('/')) return `${BACKEND_URL}${path}`;
  // Bare relative path — assume it lives under /media/
  return `${BACKEND_URL}/media/${path}`;
}

const inputSt: React.CSSProperties = {
  width: '100%',
  height: 34,
  borderRadius: 7,
  border: '1px solid #e0e0e0',
  padding: '0 10px',
  fontSize: 13.5,
  color: '#1a1a1a',
  outline: 'none',
  fontFamily: "'Heebo', sans-serif",
  backgroundColor: '#fff',
};

const labelSt: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: '#555',
};

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, alignItems: 'center', padding: '7px 0' }}>
      <span style={{ fontSize: 12.5, color: '#666' }}>{label}</span>
      <div style={{ fontSize: 13.5, color: '#222' }}>{value}</div>
    </div>
  );
}

export default function CompanySettingsPage() {
  const [data, setData] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  // Draft fields
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [draft, setDraft] = useState<Partial<CompanySettings>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data: res } = await api.get<CompanySettings>('/api/v1/main/company-settings/');
        setData(res);
        setDraft(res);
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Countries for Country selector
  useEffect(() => {
    api.get<{ results: Country[] } | Country[]>('/api/v1/main/countries/')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : ((data as any).results ?? []);
        setCountries((list ?? []).map((c: any) => ({ id: String(c.id), name: c.name })));
      })
      .catch(() => {/* silent */});
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const currentLogo = useMemo(() => {
    if (logoRemoved) return null;
    if (logoPreview) return logoPreview;
    return resolveMediaUrl(data?.logo);
  }, [logoRemoved, logoPreview, data?.logo]);

  function startEdit() {
    if (!data) return;
    setEditMode(true);
    setDraft(data);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(false);
  }

  function cancelEdit() {
    if (!data) return;
    setEditMode(false);
    setDraft(data);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(false);
    setError('');
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const hasLogo = !!logoFile;
      let res: CompanySettings;

      if (hasLogo) {
        // Upload new logo via multipart
        const fd = new FormData();
        fd.append('logo', logoFile!);
        const fields: (keyof CompanySettings)[] = [
          'company_name', 'company_name_ar',
          'street_address', 'street_address_ar',
          'building_number',
          'district', 'district_ar',
          'city', 'city_ar',
          'country',
          'postal_code',
          'cr_number',
          'vat_registration_number',
          'industry',
          'email',
          'phone',
        ];
        for (const k of fields) {
          const v = (draft as any)[k];
          if (v === undefined || v === null) continue;
          fd.append(String(k), String(v));
        }
        const { data: out } = await api.patch<CompanySettings>('/api/v1/main/company-settings/', fd);
        res = out;
      } else if (logoRemoved) {
        // Clear existing logo — send as multipart so Django accepts an empty file field
        const fd = new FormData();
        fd.append('logo', '');
        const fields: (keyof CompanySettings)[] = [
          'company_name', 'company_name_ar',
          'street_address', 'street_address_ar',
          'building_number',
          'district', 'district_ar',
          'city', 'city_ar',
          'country',
          'postal_code',
          'cr_number',
          'vat_registration_number',
          'industry',
          'email',
          'phone',
        ];
        for (const k of fields) {
          const v = (draft as any)[k];
          if (v === undefined || v === null) continue;
          fd.append(String(k), String(v));
        }
        const { data: out } = await api.patch<CompanySettings>('/api/v1/main/company-settings/', fd);
        res = out;
      } else {
        const body: Record<string, unknown> = {};
        const keys: (keyof CompanySettings)[] = [
          'company_name', 'company_name_ar',
          'street_address', 'street_address_ar',
          'building_number',
          'district', 'district_ar',
          'city', 'city_ar',
          'country',
          'postal_code',
          'cr_number',
          'vat_registration_number',
          'industry',
          'email',
          'phone',
        ];
        for (const k of keys) {
          const v = (draft as any)[k];
          if (v !== undefined) body[String(k)] = v;
        }
        const { data: out } = await api.patch<CompanySettings>('/api/v1/main/company-settings/', body);
        res = out;
      }

      setData(res);
      setDraft(res);
      setEditMode(false);
      setLogoFile(null);
      setLogoPreview(null);
      setLogoRemoved(false);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const cardSt: React.CSSProperties = {
    backgroundColor: '#fff',
    border: '1px solid #efefef',
    borderRadius: 12,
    overflow: 'hidden',
  };

  return (
    <div style={{ fontFamily: "'Heebo', sans-serif" }}>
      <div style={{ ...cardSt }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Organization Settings</span>
          {!editMode ? (
            <button
              onClick={startEdit}
              disabled={loading || !data}
              style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: '#35C0A3', color: '#fff', cursor: 'pointer', fontSize: 13.5, userSelect: 'none' }}
            >
              Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5, userSelect: 'none' }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ height: 32, paddingInline: 18, borderRadius: 7, border: 'none', backgroundColor: saving ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 500, userSelect: 'none' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 18px 18px', backgroundColor: '#fafafa' }}>
          {error && (
            <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading…</div>
          ) : !data ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Logo */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #efefef', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf9', borderRadius: 6, padding: '6px 10px', fontSize: 12.5, color: '#0f766e', fontWeight: 600, marginBottom: 12 }}>
                  Organization Logo {editMode && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required)</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 160, height: 120, borderRadius: 12, border: '1.5px dashed #d1d5db', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {currentLogo ? (
                      <img src={currentLogo} alt="Company logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 12.5, color: '#bdbdbd' }}>No logo</span>
                    )}
                  </div>

                  {editMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <label style={{ fontSize: 12.5, color: '#35C0A3', cursor: 'pointer', userSelect: 'none' }}>
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <button
                        type="button"
                        title="Remove logo"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoRemoved(true); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic info */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #efefef', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#f3f4f6', borderRadius: 6, padding: '6px 10px', fontSize: 12.5, color: '#374151', fontWeight: 600, marginBottom: 12 }}>
                  Basic Information
                </div>

                {!editMode ? (
                  <div>
                    <Row label="Company Name" value={data.company_name || '—'} />
                    <Row label="Company Name (AR)" value={data.company_name_ar || '—'} />
                    <Row label="Street Address" value={data.street_address || '—'} />
                    <Row label="Building Number" value={data.building_number || '—'} />
                    <Row label="District" value={data.district || '—'} />
                    <Row label="City" value={data.city || '—'} />
                    <Row label="Country" value={data.country_name || data.country || '—'} />
                    <Row label="Postal Code" value={data.postal_code || '—'} />
                    <Row label="CR Number" value={data.cr_number || '—'} />
                    <Row label="VAT Registration Number" value={data.vat_registration_number || '—'} />
                    <Row label="Industry" value={data.industry || '—'} />
                    <Row label="Email" value={data.email || '—'} />
                    <Row label="Phone" value={data.phone || '—'} />
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: 14, rowGap: 10, alignItems: 'center' }}>
                    {/* Company name */}
                    <span style={labelSt}>Company Name</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={draft.company_name ?? ''} onChange={(e) => setDraft((p) => ({ ...p, company_name: e.target.value }))} style={inputSt} placeholder="English" />
                      <input value={draft.company_name_ar ?? ''} onChange={(e) => setDraft((p) => ({ ...p, company_name_ar: e.target.value }))} style={inputSt} placeholder="عربي" dir="rtl" />
                    </div>

                    {/* Street */}
                    <span style={labelSt}>Street Address</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={draft.street_address ?? ''} onChange={(e) => setDraft((p) => ({ ...p, street_address: e.target.value }))} style={inputSt} placeholder="English" />
                      <input value={draft.street_address_ar ?? ''} onChange={(e) => setDraft((p) => ({ ...p, street_address_ar: e.target.value }))} style={inputSt} placeholder="عربي" dir="rtl" />
                    </div>

                    <span style={labelSt}>Building Number (4 digits)</span>
                    <input value={draft.building_number ?? ''} onChange={(e) => setDraft((p) => ({ ...p, building_number: digitsOnly(e.target.value) }))} style={inputSt} inputMode="numeric" pattern="[0-9]*" placeholder="4-digit number" maxLength={4} />

                    {/* District */}
                    <span style={labelSt}>District</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={draft.district ?? ''} onChange={(e) => setDraft((p) => ({ ...p, district: e.target.value }))} style={inputSt} placeholder="English" />
                      <input value={draft.district_ar ?? ''} onChange={(e) => setDraft((p) => ({ ...p, district_ar: e.target.value }))} style={inputSt} placeholder="عربي" dir="rtl" />
                    </div>

                    {/* City */}
                    <span style={labelSt}>City</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={draft.city ?? ''} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} style={inputSt} placeholder="English" />
                      <input value={draft.city_ar ?? ''} onChange={(e) => setDraft((p) => ({ ...p, city_ar: e.target.value }))} style={inputSt} placeholder="عربي" dir="rtl" />
                    </div>

                    <span style={labelSt}>Country</span>
                    <div>
                      <select
                        value={String(draft.country ?? '')}
                        onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value || null }))}
                        style={{ ...inputSt, cursor: 'pointer', color: draft.country ? '#111827' : '#9ca3af' }}
                      >
                        <option value="">Select</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 4 }}>
                        Current: {data.country_name || data.country || '—'}
                      </div>
                    </div>

                    <span style={labelSt}>Postal Code (5 digits)</span>
                    <input value={draft.postal_code ?? ''} onChange={(e) => setDraft((p) => ({ ...p, postal_code: digitsOnly(e.target.value) }))} style={inputSt} inputMode="numeric" pattern="[0-9]*" placeholder="5-digit code" maxLength={5} />

                    <span style={labelSt}>CR Number</span>
                    <input value={draft.cr_number ?? ''} onChange={(e) => setDraft((p) => ({ ...p, cr_number: e.target.value }))} style={inputSt} />

                    <span style={labelSt}>VAT Registration Number</span>
                    <input value={draft.vat_registration_number ?? ''} onChange={(e) => setDraft((p) => ({ ...p, vat_registration_number: e.target.value }))} style={inputSt} />

                    <span style={labelSt}>Industry</span>
                    <input value={draft.industry ?? ''} onChange={(e) => setDraft((p) => ({ ...p, industry: e.target.value }))} style={inputSt} placeholder="e.g. Retail" />

                    <span style={labelSt}>Email</span>
                    <input value={draft.email ?? ''} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} style={inputSt} />

                    <span style={labelSt}>Phone</span>
                    <input value={draft.phone ?? ''} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} style={inputSt} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

