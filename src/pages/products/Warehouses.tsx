import { useEffect, useCallback, useRef, useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Copy, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  phone: string;
  street_address: string;
  street_address_ar: string;
  building_number: string;
  district: string;
  district_ar: string;
  city: string;
  city_ar: string;
  postal_code: string;
  address_display: string;
  is_active: boolean;
  is_locked?: boolean;
  coa_account?: string | null;
  coa_account_code?: string | null;
  coa_account_name?: string | null;
  created_at: string;
  updated_at: string;
}

const inputSt: React.CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 7,
  border: '1.5px solid #e0e0e0',
  padding: '0 10px',
  fontSize: 13.5,
  color: '#1a1a1a',
  outline: 'none',
  fontFamily: "'Heebo', sans-serif",
  backgroundColor: '#fff',
  transition: 'border-color 0.15s',
};

const labelSt: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: '#555',
  marginBottom: 4,
  display: 'block',
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        paddingInline: 10,
        borderRadius: 5,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: 0.3,
        backgroundColor: active ? '#dcfce7' : '#fee2e2',
        color: active ? '#16a34a' : '#dc2626',
      }}
    >
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

function WarehouseModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: Warehouse;
  onClose: () => void;
  onSaved: (w: Warehouse) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [street, setStreet] = useState(initial?.street_address ?? '');
  const [streetAr, setStreetAr] = useState(initial?.street_address_ar ?? '');
  const [building, setBuilding] = useState(initial?.building_number ?? '');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [districtAr, setDistrictAr] = useState(initial?.district_ar ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [cityAr, setCityAr] = useState(initial?.city_ar ?? '');
  const [postal, setPostal] = useState(initial?.postal_code ?? '');

  const [addrOpen, setAddrOpen] = useState(true);
  const [coaAccount, setCoaAccount] = useState(initial?.coa_account ?? '');
  const [coaChoices, setCoaChoices] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCoaAccount(initial?.coa_account ?? '');
  }, [initial?.id, initial?.coa_account]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ parent_accounts: { id: string; code: string; name: string }[] }>(
          '/api/v1/accounting/chart-of-accounts/choices/',
        );
        setCoaChoices(data.parent_accounts ?? []);
      } catch {
        setCoaChoices([]);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        name,
        name_ar: nameAr,
        code,
        phone,
        is_active: isActive,
        street_address: street,
        street_address_ar: streetAr,
        building_number: building,
        district,
        district_ar: districtAr,
        city,
        city_ar: cityAr,
        postal_code: postal,
        coa_account: coaAccount || null,
      };
      const { data } =
        mode === 'create'
          ? await api.post<Warehouse>('/api/v1/products/warehouses/', body)
          : await api.patch<Warehouse>(`/api/v1/products/warehouses/${initial!.id}/`, body);
      onSaved(data);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: '18px 22px 18px',
          width: 980,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.17)',
          fontFamily: "'Heebo', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>
            {mode === 'create' ? 'Create Warehouse' : 'Edit Warehouse'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 32,
                paddingInline: 14,
                borderRadius: 7,
                border: '1px solid #e0e0e0',
                backgroundColor: '#fff',
                color: '#555',
                cursor: 'pointer',
                fontSize: 13.5,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="warehouse-form"
              disabled={loading}
              style={{
                height: 32,
                paddingInline: 18,
                borderRadius: 7,
                border: 'none',
                backgroundColor: loading ? '#a8e4d8' : '#35C0A3',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fff0f0',
              border: '1px solid #fecaca',
              color: '#c0392b',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <form id="warehouse-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Basic info */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #efefef', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f0fdf9', borderBottom: '1px solid #e7f8f3', padding: '10px 14px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f766e' }}>
                Basic Information <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required)</span>
              </span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, alignItems: 'center' }}>
                <span style={labelSt}>Name*</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputSt}
                  placeholder="English"
                  onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                  onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                />
                <input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  style={inputSt}
                  placeholder="عربي"
                  dir="rtl"
                  onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                  onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                />

                <span style={labelSt}>Code*</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  style={inputSt}
                  placeholder="WH-001"
                  onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                  onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                />
                <div />

                <span style={labelSt}>CoA account</span>
                <select
                  value={coaAccount}
                  onChange={(e) => setCoaAccount(e.target.value)}
                  style={{ ...inputSt, cursor: 'pointer' }}
                >
                  <option value="">None</option>
                  {coaChoices.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
                <div />

                <span style={labelSt}>Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputSt}
                  placeholder="05xxxxxxxx"
                  onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                  onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12.5, color: '#666' }}>Status</span>
                  <button
                    type="button"
                    onClick={() => setIsActive((p) => !p)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#35C0A3' : '#d1d5db',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        transition: 'left 0.2s',
                        left: isActive ? 21 : 3,
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Address (optional) */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #efefef', borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setAddrOpen((o) => !o)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                border: 'none',
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                Address <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
              </span>
              {addrOpen ? <ChevronDown size={16} style={{ color: '#9ca3af' }} /> : <ChevronRight size={16} style={{ color: '#9ca3af' }} />}
            </button>
            {addrOpen && (
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, alignItems: 'center' }}>
                  <span style={labelSt}>Street Address</span>
                  <input value={street} onChange={(e) => setStreet(e.target.value)} style={inputSt} placeholder="English" />
                  <input value={streetAr} onChange={(e) => setStreetAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                  <span style={labelSt}>Building Number</span>
                  <input value={building} onChange={(e) => setBuilding(e.target.value)} style={inputSt} />
                  <div />

                  <span style={labelSt}>District</span>
                  <input value={district} onChange={(e) => setDistrict(e.target.value)} style={inputSt} placeholder="English" />
                  <input value={districtAr} onChange={(e) => setDistrictAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                  <span style={labelSt}>City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} style={inputSt} placeholder="English" />
                  <input value={cityAr} onChange={(e) => setCityAr(e.target.value)} style={inputSt} placeholder="عربي" dir="rtl" />

                  <span style={labelSt}>Postal Code</span>
                  <input value={postal} onChange={(e) => setPostal(e.target.value)} style={inputSt} />
                  <div />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editWh, setEditWh] = useState<Warehouse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWarehouses = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (q.trim()) params.set('search', q.trim());
      const { data } = await api.get<{ count: number; results: Warehouse[] }>(`/api/v1/products/warehouses/?${params}`);
      setWarehouses(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchWarehouses(search), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, fetchWarehouses]);

  const allSelected = warehouses.length > 0 && selected.size === warehouses.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(warehouses.map((w) => w.id)));
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function bulkAction(action: 'duplicate' | 'delete') {
    setBulkLoading(true);
    try {
      const { data } = await api.post<{
        message: string;
        deleted?: number;
        created?: number;
        skipped?: { id: string; name: string; reason: string; detail: string }[];
        not_found?: string[];
      }>(
        '/api/v1/products/warehouses/bulk/',
        { action, ids: Array.from(selected) },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );

      if (action === 'delete') {
        const skippedIds = new Set((data.skipped ?? []).map((s) => s.id));
        setWarehouses((prev) => prev.filter((w) => !selected.has(w.id) || skippedIds.has(w.id)));
        setSelected(new Set(skippedIds));
        if ((data.skipped ?? []).length > 0) {
          const names = (data.skipped ?? []).map((s) => `• ${s.name}: ${s.detail}`).join('\n');
          alert(`${data.message}\n\nSkipped:\n${names}`);
        }
      } else {
        await fetchWarehouses(search);
        setSelected(new Set());
      }
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setBulkLoading(false);
    }
  }

  async function deleteWarehouse(w: Warehouse) {
    if (!window.confirm(`Delete "${w.name}"?`)) return;
    setDeletingId(w.id);
    try {
      await api.delete(`/api/v1/products/warehouses/${w.id}/`);
      setWarehouses((prev) => prev.filter((x) => x.id !== w.id));
      setSelected((prev) => { const s = new Set(prev); s.delete(w.id); return s; });
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setDeletingId(null);
    }
  }

  function onSaved(updated: Warehouse) {
    setWarehouses((prev) => {
      const idx = prev.findIndex((w) => w.id === updated.id);
      return idx === -1 ? [updated, ...prev] : prev.map((w) => (w.id === updated.id ? updated : w));
    });
  }

  const TH: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 12.5,
    fontWeight: 500,
    color: '#888',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '11px 14px',
    fontSize: 13.5,
    color: '#333',
    borderBottom: '1px solid #eef2f5',
    borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      {selected.size > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: '#f0fdf9', border: '1px solid #a7f3d0', borderRadius: 10, padding: '8px 14px' }}>
          <button onClick={() => setSelected(new Set())}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#35C0A3' }}>
            <X size={16} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0d9488' }}>Bulk Action</span>
          <span style={{ fontSize: 13, color: '#666' }}>
            {selected.size} {selected.size === 1 ? 'Warehouse' : 'Warehouses'} Selected
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              disabled={bulkLoading}
              onClick={() => bulkAction('duplicate')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: bulkLoading ? 'not-allowed' : 'pointer', opacity: bulkLoading ? 0.6 : 1 }}
            >
              <Copy size={14} /> Make a copy
            </button>
            <button
              disabled={bulkLoading}
              onClick={() => bulkAction('delete')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', fontSize: 13.5, cursor: bulkLoading ? 'not-allowed' : 'pointer', opacity: bulkLoading ? 0.6 : 1 }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ) : (
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
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 40, textAlign: 'center' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#35C0A3' }} />
              </th>
              <th style={TH}>Code</th>
              <th style={TH}>Name</th>
              <th style={TH}>Address</th>
              <th style={TH}>City</th>
              <th style={TH}>Phone</th>
              <th style={TH}>CoA</th>
              <th style={{ ...TH, textAlign: 'center', width: 44 }}> </th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, width: 80, borderRight: 'none' }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #35C0A3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </td>
              </tr>
            ) : warehouses.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  No warehouses found.
                </td>
              </tr>
            ) : (
              warehouses.map((w) => {
                const isHovered = hoveredRow === w.id;
                const isDeleting = deletingId === w.id;
                return (
                  <tr
                    key={w.id}
                    onMouseEnter={() => setHoveredRow(w.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ backgroundColor: isHovered ? '#fafefe' : '#fff', transition: 'background-color 0.12s' }}
                  >
                    <td style={{ ...TD, textAlign: 'center', width: 40 }}>
                      <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleRow(w.id)} style={{ cursor: 'pointer', accentColor: '#35C0A3' }} />
                    </td>
                    <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{w.code}</td>
                    <td style={{ ...TD, fontWeight: 500, color: '#111827' }}>
                      {w.name}
                      {w.name_ar && <span style={{ display: 'block', fontSize: 11.5, color: '#9ca3af', direction: 'rtl', fontWeight: 400 }}>{w.name_ar}</span>}
                    </td>
                    <td style={{ ...TD, color: '#6b7280', maxWidth: 380 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.address_display || '—'}
                      </span>
                    </td>
                    <td style={{ ...TD, color: '#6b7280' }}>{w.city || '—'}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{w.phone || '—'}</td>
                    <td style={{ ...TD, color: '#6b7280', fontSize: 12.5 }}>
                      {w.coa_account_code ? `${w.coa_account_code} — ${w.coa_account_name ?? ''}` : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }} title={w.is_locked ? 'Has posted inventory activity' : ''}>
                      {w.is_locked ? <Lock size={14} style={{ color: '#f59e0b' }} /> : '—'}
                    </td>
                    <td style={TD}>
                      <StatusBadge active={w.is_active} />
                    </td>
                    <td style={{ ...TD, width: 80, borderRight: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                        <button
                          onClick={() => { setEditWh(w); }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: '#f0fdf9', color: '#35C0A3', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteWarehouse(w)}
                          disabled={isDeleting || w.is_locked}
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: '#fff5f5', color: '#e53e3e', cursor: isDeleting || w.is_locked ? 'not-allowed' : 'pointer', opacity: isDeleting || w.is_locked ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
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

        {!loading && warehouses.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>
              {selected.size > 0 ? `${selected.size} selected · ` : ''}{total} {total === 1 ? 'warehouse' : 'warehouses'}
            </span>
          </div>
        )}
      </div>

      {showCreate && (
        <WarehouseModal mode="create" onClose={() => setShowCreate(false)} onSaved={onSaved} />
      )}
      {editWh && (
        <WarehouseModal mode="edit" initial={editWh} onClose={() => setEditWh(null)} onSaved={onSaved} />
      )}
    </div>
  );
}

