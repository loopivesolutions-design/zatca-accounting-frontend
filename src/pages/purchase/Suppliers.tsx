import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, SlidersHorizontal, ChevronDown } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

type VatTreatment = 'vat_registered_ksa' | 'not_vat_registered_ksa' | 'outside_ksa';
type OpeningBalanceType = 'none' | 'i_owe_vendor' | 'vendor_owes_me';

interface Supplier {
  id: string;
  company_name: string;
  company_name_ar: string;
  primary_contact_name: string;
  email: string;
  phone: string;
  vat_treatment: VatTreatment;
  tax_registration_number: string;
  country: string | null;
  country_name: string | null;
  street_address: string;
  street_address_ar: string;
  building_number: string;
  land_identifier: string;
  district: string;
  district_ar: string;
  city: string;
  city_ar: string;
  postal_code: string;
  payment_terms: string | null;
  opening_balance_type: OpeningBalanceType;
  opening_balance_amount: string;
  opening_balance_as_of: string | null;
  opening_balance_account: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Choice { id: string; label: string; }
interface SupplierChoices {
  payment_terms: Choice[];
  vat_treatments: Choice[];
  opening_balance_types: Choice[];
}

interface Country { id: string; name: string; }

interface AccountChoice { id: string; code: string; name: string; }

const inputSt: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 7, border: '1.5px solid #e0e0e0',
  padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
  fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff', transition: 'border-color 0.15s',
};

const labelSt: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 500, color: '#555', marginBottom: 4, display: 'block',
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 22, paddingInline: 10,
      borderRadius: 5, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
      backgroundColor: active ? '#dcfce7' : '#fee2e2',
      color: active ? '#16a34a' : '#dc2626',
    }}>
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

function SectionHeader({ title, required, right }: { title: string; required?: boolean; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#f3f4f6', padding: '10px 14px',
      borderTopLeftRadius: 10, borderTopRightRadius: 10,
      borderBottom: '1px solid #edf2f7',
    }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
        {title} {required && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required)</span>}
      </span>
      {right}
    </div>
  );
}

function SuppliersModal({
  mode,
  initial,
  choices,
  countries,
  accounts,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: Supplier;
  choices: SupplierChoices | null;
  countries: Country[];
  accounts: AccountChoice[];
  onClose: () => void;
  onSaved: (s: Supplier) => void;
}) {
  const [companyName, setCompanyName] = useState(initial?.company_name ?? '');
  const [companyNameAr, setCompanyNameAr] = useState(initial?.company_name_ar ?? '');
  const [primaryContact, setPrimaryContact] = useState(initial?.primary_contact_name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');

  const [vatTreatment, setVatTreatment] = useState<VatTreatment>(initial?.vat_treatment ?? 'vat_registered_ksa');
  const [trn, setTrn] = useState(initial?.tax_registration_number ?? '');

  const [country, setCountry] = useState(initial?.country ?? '');
  const [street, setStreet] = useState(initial?.street_address ?? '');
  const [streetAr, setStreetAr] = useState(initial?.street_address_ar ?? '');
  const [building, setBuilding] = useState(initial?.building_number ?? '');
  const [landId, setLandId] = useState(initial?.land_identifier ?? '');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [districtAr, setDistrictAr] = useState(initial?.district_ar ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [cityAr, setCityAr] = useState(initial?.city_ar ?? '');
  const [postal, setPostal] = useState(initial?.postal_code ?? '');

  const [paymentTerms, setPaymentTerms] = useState(initial?.payment_terms ?? '');
  const [openingType, setOpeningType] = useState<OpeningBalanceType>(initial?.opening_balance_type ?? 'none');
  const [openingAmount, setOpeningAmount] = useState(initial?.opening_balance_amount ?? '');
  const [openingAsOf, setOpeningAsOf] = useState(initial?.opening_balance_as_of ?? '');
  const [openingAccount, setOpeningAccount] = useState(initial?.opening_balance_account ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showOpening = openingType !== 'none';

  useEffect(() => {
    if (mode !== 'edit' || !initial) return;
    setCompanyName(initial.company_name ?? '');
    setCompanyNameAr(initial.company_name_ar ?? '');
    setPrimaryContact(initial.primary_contact_name ?? '');
    setEmail(initial.email ?? '');
    setPhone(initial.phone ?? '');
    setVatTreatment(initial.vat_treatment ?? 'vat_registered_ksa');
    setTrn(initial.tax_registration_number ?? '');
    setCountry(initial.country ?? '');
    setStreet(initial.street_address ?? '');
    setStreetAr(initial.street_address_ar ?? '');
    setBuilding(initial.building_number ?? '');
    setLandId(initial.land_identifier ?? '');
    setDistrict(initial.district ?? '');
    setDistrictAr(initial.district_ar ?? '');
    setCity(initial.city ?? '');
    setCityAr(initial.city_ar ?? '');
    setPostal(initial.postal_code ?? '');
    setPaymentTerms(initial.payment_terms ?? '');
    setOpeningType(initial.opening_balance_type ?? 'none');
    setOpeningAmount(initial.opening_balance_amount ?? '');
    setOpeningAsOf(initial.opening_balance_as_of ?? '');
    setOpeningAccount(initial.opening_balance_account ?? '');
    setIsActive(initial.is_active ?? true);
    setError('');
  }, [mode, initial]);

  // Keep opening-balance inputs consistent with selected type.
  useEffect(() => {
    if (openingType === 'none') {
      setOpeningAmount('');
      setOpeningAsOf('');
      setOpeningAccount('');
      return;
    }
    // If user picks an opening-balance type and date is empty, default to today.
    if (!openingAsOf) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setOpeningAsOf(`${yyyy}-${mm}-${dd}`);
    }
  }, [openingType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Frontend guardrails to match backend expectations.
    if (openingType !== 'none') {
      const amt = Number(openingAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        setError('Opening balance amount must be greater than 0.');
        return;
      }
      if (!openingAsOf) {
        setError('Opening balance "As of" date is required.');
        return;
      }
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        company_name: companyName,
        company_name_ar: companyNameAr,
        primary_contact_name: primaryContact,
        email,
        phone,
        vat_treatment: vatTreatment,
        tax_registration_number: trn,
        country: country || null,
        street_address: street,
        street_address_ar: streetAr,
        building_number: building,
        land_identifier: landId,
        district,
        district_ar: districtAr,
        city,
        city_ar: cityAr,
        postal_code: postal,
        payment_terms: paymentTerms || null,
        opening_balance_type: openingType,
        opening_balance_amount: showOpening ? String(openingAmount) : '0',
        opening_balance_as_of: showOpening ? (openingAsOf || null) : null,
        opening_balance_account: showOpening ? (openingAccount || null) : null,
        is_active: isActive,
      };

      const { data } = mode === 'create'
        ? await api.post<Supplier>('/api/v1/purchases/suppliers/', body)
        : await api.patch<Supplier>(`/api/v1/purchases/suppliers/${initial!.id}/`, body);

      onSaved(data);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ backgroundColor: '#fff', borderRadius: 14, padding: '18px 22px 18px', width: 980, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.17)', fontFamily: "'Heebo', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>
            {mode === 'create' ? 'Create Supplier' : 'Edit Supplier'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
              Cancel
            </button>
            <button type="submit" form="supplier-form" disabled={loading}
              style={{ height: 32, paddingInline: 18, borderRadius: 7, border: 'none', backgroundColor: loading ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 500 }}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form id="supplier-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Basic information */}
          <div style={{ borderRadius: 10, border: '1px solid #edf2f7', backgroundColor: '#fafafa', padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Basic Information" />
            <div style={{ padding: '14px 16px', backgroundColor: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                <span style={labelSt}>Company Name*</span>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required style={inputSt} placeholder="English" />
                <input value={companyNameAr} onChange={(e) => setCompanyNameAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                <span style={labelSt}>Primary Contact Name</span>
                <input value={primaryContact} onChange={(e) => setPrimaryContact(e.target.value)} style={inputSt} />
                <div />

                <span style={labelSt}>Email*</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputSt} required />
                <div />

                <span style={labelSt}>Phone Number</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputSt} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: '#666' }}>Status</span>
                  <button type="button" onClick={() => setIsActive((p) => !p)}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', backgroundColor: isActive ? '#35C0A3' : '#d1d5db', position: 'relative', transition: 'background-color 0.2s' }}>
                    <span style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', left: isActive ? 21 : 3, transition: 'left 0.2s' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tax information */}
          <div style={{ borderRadius: 10, border: '1px solid #edf2f7', backgroundColor: '#fafafa', overflow: 'hidden' }}>
            <SectionHeader title="Tax Information" right={<ChevronDown size={16} style={{ color: '#9ca3af' }} />} />
            <div style={{ padding: '14px 16px', backgroundColor: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'center' }}>
                <span style={labelSt}>VAT Treatment*</span>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  {(choices?.vat_treatments ?? [
                    { id: 'vat_registered_ksa', label: 'VAT registered in KSA' },
                    { id: 'not_vat_registered_ksa', label: 'Not VAT registered in KSA' },
                    { id: 'outside_ksa', label: 'Outside KSA' },
                  ]).map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#111827' }}>
                      <input type="radio" checked={vatTreatment === c.id} onChange={() => setVatTreatment(c.id as VatTreatment)} style={{ accentColor: '#35C0A3' }} />
                      {c.label}
                    </label>
                  ))}
                </div>

                <span style={labelSt}>TAX Registration Number*</span>
                <input value={trn} onChange={(e) => setTrn(e.target.value)} style={inputSt} required />
              </div>
            </div>
          </div>

          {/* Address */}
          <div style={{ borderRadius: 10, border: '1px solid #edf2f7', backgroundColor: '#fafafa', overflow: 'hidden' }}>
            <SectionHeader title="Address" right={<ChevronDown size={16} style={{ color: '#9ca3af' }} />} />
            <div style={{ padding: '14px 16px', backgroundColor: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                <span style={labelSt}>Country</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{ ...inputSt, cursor: countries.length ? 'pointer' : 'not-allowed', color: country ? '#111827' : '#9ca3af' }}
                  disabled={!countries.length}
                >
                  <option value="">{countries.length ? 'Select' : 'Loading…'}</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div />

                <span style={labelSt}>Street Address*</span>
                <input value={street} onChange={(e) => setStreet(e.target.value)} style={inputSt} required placeholder="English" />
                <input value={streetAr} onChange={(e) => setStreetAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                <span style={labelSt}>Building Number*</span>
                <input value={building} onChange={(e) => setBuilding(e.target.value)} style={inputSt} required />
                <div />

                <span style={labelSt}>Land Identifier*</span>
                <input value={landId} onChange={(e) => setLandId(e.target.value)} style={inputSt} required />
                <div />

                <span style={labelSt}>District*</span>
                <input value={district} onChange={(e) => setDistrict(e.target.value)} style={inputSt} required placeholder="English" />
                <input value={districtAr} onChange={(e) => setDistrictAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                <span style={labelSt}>City*</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} style={inputSt} required placeholder="English" />
                <input value={cityAr} onChange={(e) => setCityAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                <span style={labelSt}>Postal Code*</span>
                <input value={postal} onChange={(e) => setPostal(e.target.value)} style={inputSt} required />
                <div />
              </div>
            </div>
          </div>

          {/* Financial settings */}
          <div style={{ borderRadius: 10, border: '1px solid #edf2f7', backgroundColor: '#fafafa', overflow: 'hidden' }}>
            <SectionHeader title="Financial Settings" right={<ChevronDown size={16} style={{ color: '#9ca3af' }} />} />
            <div style={{ padding: '14px 16px', backgroundColor: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'center' }}>
                <span style={labelSt}>Payment Terms*</span>
                <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                  <option value="">Select</option>
                  {(choices?.payment_terms ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>

                <span style={labelSt}>Opening Balance</span>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  {(choices?.opening_balance_types ?? [
                    { id: 'none', label: 'No opening balance' },
                    { id: 'i_owe_vendor', label: 'I owe this vendor' },
                    { id: 'vendor_owes_me', label: 'Vendor owes me' },
                  ]).map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#111827' }}>
                      <input type="radio" checked={openingType === c.id} onChange={() => setOpeningType(c.id as OpeningBalanceType)} style={{ accentColor: '#35C0A3' }} />
                      {c.label}
                    </label>
                  ))}
                </div>

                <span style={labelSt}>Amount*</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: '#6b7280', border: '1px solid #e5e7eb', background: '#f9fafb', height: 36, display: 'inline-flex', alignItems: 'center', paddingInline: 10, borderRadius: 8 }}>SAR</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    style={{ ...inputSt, flex: 1 }}
                    disabled={!showOpening}
                    placeholder={showOpening ? 'Enter amount' : ''}
                  />
                </div>

                <span style={labelSt}>As of*</span>
                <input
                  type="date"
                  value={openingAsOf}
                  onChange={(e) => setOpeningAsOf(e.target.value)}
                  style={inputSt}
                  disabled={!showOpening}
                />

                <span style={labelSt}>Opening Balance Account</span>
                <select value={openingAccount} onChange={(e) => setOpeningAccount(e.target.value)} style={{ ...inputSt, cursor: showOpening ? 'pointer' : 'not-allowed' }} disabled={!showOpening}>
                  <option value="">Select</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

type ActiveFilter = 'all' | 'active' | 'inactive';

const FILTER_LABELS: Record<ActiveFilter, string> = {
  all: 'All',
  active: 'Active only',
  inactive: 'Inactive only',
};

export default function Suppliers() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [vatFilter, setVatFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');

  const [choices, setChoices] = useState<SupplierChoices | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const [c1, c2, aRes] = await Promise.all([
        api.get<SupplierChoices>('/api/v1/purchases/suppliers/choices/'),
        api.get<{ results: Country[] } | Country[]>('/api/v1/main/countries/'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
      ]);
      setChoices(c1.data);

      // countries endpoint might be paginated or flat
      const countriesData = Array.isArray(c2.data) ? c2.data : (c2.data as any).results ?? [];
      setCountries(countriesData.map((x: any) => ({ id: x.id, name: x.name ?? x.label ?? x.country_name ?? '' })));

      const flat: AccountChoice[] = [];
      function walk(nodes: any[]) {
        nodes.forEach((n) => {
          if (!n.is_archived) {
            flat.push({ id: n.id, code: n.code, name: n.name });
          }
          if (n.children && Array.isArray(n.children)) walk(n.children);
        });
      }
      if (Array.isArray(aRes.data)) walk(aRes.data);
      setAccounts(flat);
    } catch {
      /* silent */
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (activeFilter === 'active') params.set('active', 'true');
      if (activeFilter === 'inactive') params.set('active', 'false');
      if (vatFilter) params.set('vat_treatment', vatFilter);
      if (countryFilter) params.set('country', countryFilter);

      const { data } = await api.get<{ count: number; results: Supplier[] }>(`/api/v1/purchases/suppliers/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, vatFilter, countryFilter]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  // Support dedicated "Add Supplier" route without breaking the list page.
  // If user navigates to /purchase/suppliers/add, open the create UI.
  useEffect(() => {
    if (pathname === '/purchase/suppliers/add') setShowCreate(true);
  }, [pathname]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, activeFilter, vatFilter, countryFilter, fetchRows]);

  async function openEdit(row: Supplier) {
    try {
      const { data } = await api.get<Supplier>(`/api/v1/purchases/suppliers/${row.id}/`);
      setEditRow(data);
    } catch {
      setEditRow(row);
    }
  }

  async function deleteRow(row: Supplier) {
    if (!window.confirm(`Delete "${row.company_name}"?`)) return;
    setDeletingId(row.id);
    try {
      await api.delete(`/api/v1/purchases/suppliers/${row.id}/`);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setDeletingId(null);
    }
  }

  function onSaved(updated: Supplier) {
    setRows((prev) => {
      const idx = prev.findIndex((x) => x.id === updated.id);
      return idx === -1 ? [updated, ...prev] : prev.map((x) => (x.id === updated.id ? updated : x));
    });
  }

  const vatLabel = useMemo(() => {
    const m = new Map((choices?.vat_treatments ?? []).map((c) => [c.id, c.label]));
    return (id: string) => m.get(id) ?? id;
  }, [choices]);

  const paymentTermsLabel = useMemo(() => {
    const m = new Map((choices?.payment_terms ?? []).map((c) => [c.id, c.label]));
    return (id: string | null) => (id && m.get(id)) || id || '—';
  }, [choices]);

  const TH: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef', backgroundColor: '#fafafa',
    whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13.5, color: '#333', outline: 'none', backgroundColor: '#fff', fontFamily: "'Heebo', sans-serif" }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14, borderRadius: 8, border: `1px solid ${(activeFilter !== 'all' || vatFilter || countryFilter) ? '#35C0A3' : '#e0e0e0'}`,
                backgroundColor: (activeFilter !== 'all' || vatFilter || countryFilter) ? '#f0fdf9' : '#fff',
                color: (activeFilter !== 'all' || vatFilter || countryFilter) ? '#35C0A3' : '#555',
                fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}
            >
              <SlidersHorizontal size={14} /> Filter
            </button>
            {filterOpen && (
              <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 260, overflow: 'hidden', padding: 12 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Status</div>
                    <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)} style={{ ...inputSt, height: 34, cursor: 'pointer' }}>
                      {(Object.entries(FILTER_LABELS) as [ActiveFilter, string][]).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>VAT Treatment</div>
                    <select value={vatFilter} onChange={(e) => setVatFilter(e.target.value)} style={{ ...inputSt, height: 34, cursor: 'pointer' }}>
                      <option value="">All</option>
                      {(choices?.vat_treatments ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Country</div>
                    <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={{ ...inputSt, height: 34, cursor: 'pointer' }}>
                      <option value="">All</option>
                      {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                    <button onClick={() => { setActiveFilter('all'); setVatFilter(''); setCountryFilter(''); setFilterOpen(false); }}
                      style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                      Reset
                    </button>
                    <button onClick={() => setFilterOpen(false)}
                      style={{ height: 34, paddingInline: 14, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 500 }}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Vendor ID</th>
              <th style={TH}>Company Name</th>
              <th style={TH}>Primary Contact</th>
              <th style={TH}>VAT Treatment</th>
              <th style={TH}>Tax Reg. Number</th>
              <th style={TH}>Payment Term</th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, width: 80, borderRight: 'none' }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #35C0A3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  No suppliers found.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isHovered = hoveredRow === r.id;
                const isDeleting = deletingId === r.id;
                return (
                  <tr key={r.id} onMouseEnter={() => setHoveredRow(r.id)} onMouseLeave={() => setHoveredRow(null)} style={{ backgroundColor: isHovered ? '#fafefe' : '#fff', transition: 'background-color 0.12s' }}>
                    <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{(r as any).vendor_id ?? '—'}</td>
                    <td style={{ ...TD, fontWeight: 500, color: r.is_active ? '#111827' : '#9ca3af' }}>
                      {r.company_name}
                      {r.company_name_ar && <span style={{ display: 'block', fontSize: 11.5, color: '#9ca3af', direction: 'rtl', fontWeight: 400 }}>{r.company_name_ar}</span>}
                    </td>
                    <td style={{ ...TD, color: '#6b7280' }}>{r.primary_contact_name || '—'}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{vatLabel(r.vat_treatment)}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{r.tax_registration_number || '—'}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{paymentTermsLabel(r.payment_terms)}</td>
                    <td style={TD}><StatusBadge active={r.is_active} /></td>
                    <td style={{ ...TD, width: 80, borderRight: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => openEdit(r)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: '#f0fdf9', color: '#35C0A3', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteRow(r)} disabled={isDeleting} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: '#fff5f5', color: '#e53e3e', cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {!loading && rows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{total} {total === 1 ? 'supplier' : 'suppliers'}</span>
          </div>
        )}
      </div>

      {showCreate && (
        <SuppliersModal
          key="supplier-modal-create"
          mode="create"
          choices={choices}
          countries={countries}
          accounts={accounts}
          onClose={() => {
            setShowCreate(false);
            if (pathname === '/purchase/suppliers/add') navigate('/purchase/suppliers', { replace: true });
          }}
          onSaved={(s) => {
            onSaved(s);
            if (pathname === '/purchase/suppliers/add') navigate('/purchase/suppliers', { replace: true });
          }}
        />
      )}
      {editRow && (
        <SuppliersModal key={editRow.id} mode="edit" initial={editRow} choices={choices} countries={countries} accounts={accounts} onClose={() => setEditRow(null)} onSaved={onSaved} />
      )}
    </div>
  );
}

