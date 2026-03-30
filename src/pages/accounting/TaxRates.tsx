import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, X, ArrowUpDown, MoreVertical, Lock, Info } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TaxRate {
  id: string;
  name: string;
  name_ar: string;
  tax_type: string;
  tax_type_display: string;
  rate: string;
  description: string;
  zatca_category: string;
  zatca_category_display: string;
  is_default: boolean;
  is_active: boolean;
  has_transactions: boolean;
  created_at: string;
  updated_at: string;
}

interface Choice { value: string; label: string; }
// zatca_categories intentionally absent — system-managed, never user input
interface Choices { tax_types: Choice[]; }

// ── Colour palettes ───────────────────────────────────────────────────────────
const TAX_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  sales:          { bg: '#e8f8f5', text: '#35C0A3' },
  purchases:      { bg: '#eef2ff', text: '#4f46e5' },
  reverse_charge: { bg: '#fff7ed', text: '#ea580c' },
  out_of_scope:   { bg: '#f3f4f6', text: '#6b7280' },
};

const ZATCA_COLORS: Record<string, { bg: string; text: string }> = {
  S: { bg: '#e8f8f5', text: '#35C0A3' },
  Z: { bg: '#eef2ff', text: '#4f46e5' },
  E: { bg: '#fff1f2', text: '#e11d48' },
  O: { bg: '#f3f4f6', text: '#6b7280' },
};

// ── Shared input styles ───────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 7, border: '1.5px solid #e0e0e0',
  padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
  fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff', transition: 'border-color 0.15s',
};
const lockedSt: React.CSSProperties = {
  ...inputSt, backgroundColor: '#f5f5f5', color: '#aaa',
  cursor: 'not-allowed', border: '1.5px solid #ebebeb',
};
const labelSt: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 500, color: '#555', marginBottom: 4, display: 'block',
};

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateModal({ choices, onClose, onSaved }: {
  choices: Choices | null;
  onClose: () => void;
  onSaved: (t: TaxRate) => void;
}) {
  const [name,        setName]        = useState('');
  const [nameAr,      setNameAr]      = useState('');
  const [taxType,     setTaxType]     = useState('');
  const [rate,        setRate]        = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const defaultTypes: Choice[] = [
    { value: 'sales',          label: 'Sales'          },
    { value: 'purchases',      label: 'Purchases'      },
    { value: 'reverse_charge', label: 'Reverse Charge' },
    { value: 'out_of_scope',   label: 'Out of Scope'   },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // zatca_category is NOT sent — the system auto-assigns it
      const rateNum = parseFloat(rate);
      const { data } = await api.post<TaxRate>('/api/v1/accounting/tax-rates/', {
        name,
        name_ar: nameAr,
        tax_type: taxType,
        rate: Number.isFinite(rateNum) ? rateNum : 0,
        description,
      });
      onSaved(data); onClose();
    } catch (err: unknown) {
      setError(parseApiError(err));
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Create Tax Rate" onClose={onClose}>
      {/* ZATCA auto-assign note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, backgroundColor: '#f0fdf9',
        border: '1px solid #bbf7e8', borderRadius: 7, padding: '9px 12px', marginBottom: 14 }}>
        <Info size={13} style={{ color: '#35C0A3', marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#047857', lineHeight: 1.5 }}>
          ZATCA Category is automatically derived from the Tax Type and Rate — no manual selection needed.
        </span>
      </div>

      {error && <ErrorBanner msg={error} />}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {/* Name EN + AR */}
        <div>
          <label style={labelSt}>Tax Name<span style={{ color: '#35C0A3' }}>*</span></label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="English"
              style={{ ...inputSt, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="عربي" dir="rtl"
              style={{ ...inputSt, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
          </div>
        </div>

        {/* Tax Type */}
        <div>
          <label style={labelSt}>Tax Type<span style={{ color: '#35C0A3' }}>*</span></label>
          <select required value={taxType} onChange={(e) => setTaxType(e.target.value)}
            style={{ ...inputSt, cursor: 'pointer', color: taxType ? '#1a1a1a' : '#aaa' }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          >
            <option value="">Select type</option>
            {(choices?.tax_types ?? defaultTypes).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Tax Rate */}
        <div>
          <label style={labelSt}>Tax Rate (%)<span style={{ color: '#35C0A3' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input type="number" min={0} max={100} step="0.01" value={rate}
              onChange={(e) => setRate(e.target.value)} required placeholder="e.g. 15"
              style={{ ...inputSt, paddingRight: 28 }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#aaa', pointerEvents: 'none' }}>%</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelSt}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes"
            style={inputSt}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
        </div>

        <ModalFooter onClose={onClose} loading={loading} />
      </form>
    </Modal>
  );
}

// ── Edit Modal (only name / name_ar / description are editable) ───────────────
function EditModal({ rate, onClose, onSaved }: {
  rate: TaxRate;
  onClose: () => void;
  onSaved: (t: TaxRate) => void;
}) {
  const [name,        setName]        = useState(rate.name);
  const [nameAr,      setNameAr]      = useState(rate.name_ar);
  const [description, setDescription] = useState(rate.description);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.patch<TaxRate>(
        `/api/v1/accounting/tax-rates/${rate.id}/`,
        { name, name_ar: nameAr, description }
      );
      onSaved(data); onClose();
    } catch (err: unknown) {
      setError(parseApiError(err));
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Edit Tax Rate" onClose={onClose}>
      {/* Locked notice */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, backgroundColor: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 7, padding: '10px 12px', marginBottom: 16 }}>
        <Lock size={14} style={{ color: '#818cf8', marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: '#4f46e5', lineHeight: 1.5 }}>
          <strong>Tax Type and Tax Rate are permanently locked</strong> — changing them would corrupt historical invoices, VAT reports, and ZATCA XML.
          ZATCA Category is always <strong>system-managed</strong>. Only Name and Description can be edited.
        </span>
      </div>

      {error && <ErrorBanner msg={error} />}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {/* Name EN + AR — editable */}
        <div>
          <label style={labelSt}>Tax Name</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="English"
              style={{ ...inputSt, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="عربي" dir="rtl"
              style={{ ...inputSt, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
          </div>
          <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 5, lineHeight: 1.4 }}>
            Name is for display only — changing it does not affect the tax rate or ZATCA category.
          </p>
        </div>

        {/* Tax Type — locked */}
        <div>
          <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 5 }}>
            Tax type <Lock size={11} style={{ color: '#ccc' }} />
          </label>
          <input value={rate.tax_type_display} disabled style={lockedSt} />
        </div>

        {/* Tax Rate — locked */}
        <div>
          <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 5 }}>
            Tax Rate <Lock size={11} style={{ color: '#ccc' }} />
          </label>
          <input value={`${parseFloat(rate.rate).toFixed(2)}%`} disabled style={lockedSt} />
        </div>

        {/* ZATCA Category — system-assigned, informational only */}
        <div>
          <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 5 }}>
            ZATCA Category
            <span style={{ fontSize: 11, fontWeight: 400, color: '#35C0A3', backgroundColor: '#e8f8f5', borderRadius: 4, padding: '1px 6px' }}>auto</span>
            <span title="Derived by the system from Tax Type and Rate. Cannot be changed." style={{ display: 'flex' }}><Info size={11} style={{ color: '#bbb', cursor: 'help' }} /></span>
          </label>
          <input value={rate.zatca_category_display || rate.zatca_category || '—'} disabled style={lockedSt} />
        </div>

        {/* Description — editable */}
        <div>
          <label style={labelSt}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes"
            style={inputSt}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
        </div>

        <ModalFooter onClose={onClose} loading={loading} />
      </form>
    </Modal>
  );
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '24px 28px 22px', width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', fontFamily: "'Heebo', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{msg}</div>
  );
}

function ModalFooter({ onClose, loading }: { onClose: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
      <button type="button" onClick={onClose}
        style={{ height: 36, paddingInline: 18, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
        Cancel
      </button>
      <button type="submit" disabled={loading}
        style={{ height: 36, paddingInline: 24, borderRadius: 8, border: 'none', backgroundColor: loading ? '#a8e4d8' : '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Heebo', sans-serif" }}>
        {loading ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TaxRates() {
  const [taxRates,   setTaxRates]   = useState<TaxRate[]>([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [choices,    setChoices]    = useState<Choices | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRate,   setEditRate]   = useState<TaxRate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [taxTypeFilter, setTaxTypeFilter] = useState('');
  const [zatcaFilter, setZatcaFilter] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableRef    = useRef<HTMLDivElement>(null);
  type EditCol = 'name' | 'name_ar' | 'description';
  const EDIT_COLS: EditCol[] = ['name', 'name_ar', 'description'];
  const [activeCell, setActiveCell] = useState<{ rowId: string; col: EditCol } | null>(null);
  const [cellDraft,  setCellDraft]  = useState('');
  const [cellSaving, setCellSaving] = useState<Set<string>>(new Set());

  const fetchRates = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (q.trim()) params.set('search', q.trim());
      if (activeFilter) params.set('active', activeFilter);
      if (taxTypeFilter) params.set('tax_type', taxTypeFilter);
      if (zatcaFilter) params.set('zatca_category', zatcaFilter);
      const { data } = await api.get<{ results: TaxRate[] }>(`/api/v1/accounting/tax-rates/?${params}`);
      setTaxRates(data.results ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [activeFilter, taxTypeFilter, zatcaFilter]);

  const fetchChoices = useCallback(async () => {
    try {
      const { data } = await api.get<Choices>('/api/v1/accounting/tax-rates/choices/');
      setChoices(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchChoices();
  }, [fetchChoices]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRates(search), 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, activeFilter, taxTypeFilter, zatcaFilter, fetchRates]);

  async function openEdit(rate: TaxRate) {
    try {
      const { data } = await api.get<TaxRate>(`/api/v1/accounting/tax-rates/${rate.id}/`);
      setEditRate(data);
    } catch { setEditRate(rate); }
  }

  async function deleteRate(rate: TaxRate) {
    if (!window.confirm(`Delete "${rate.name}"?`)) return;
    setDeletingId(rate.id);
    try {
      await api.delete(`/api/v1/accounting/tax-rates/${rate.id}/`);
      setTaxRates((prev) => prev.filter((r) => r.id !== rate.id));
    } catch (err: unknown) {
      alert(parseApiError(err));
    } finally { setDeletingId(null); }
  }

  function onSaved(updated: TaxRate) {
    setTaxRates((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      return idx === -1 ? [updated, ...prev] : prev.map((r) => r.id === updated.id ? updated : r);
    });
  }

  function cellKey(rowId: string, col: EditCol) {
    return `${rowId}__${col}`;
  }

  function activateCell(rowId: string, col: EditCol, seed: string) {
    setActiveCell({ rowId, col });
    setCellDraft(seed);
    requestAnimationFrame(() => tableRef.current?.focus());
  }

  async function commitCell(rowId: string, col: EditCol, value: string) {
    const key = cellKey(rowId, col);
    setCellSaving((prev) => new Set(prev).add(key));
    try {
      const { data } = await api.patch<TaxRate>(`/api/v1/accounting/tax-rates/${rowId}/`, { [col]: value });
      setTaxRates((prev) => prev.map((r) => (r.id === rowId ? data : r)));
    } catch (err: unknown) {
      alert(parseApiError(err));
    } finally {
      setCellSaving((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  }

  function deactivateAndSave() {
    if (!activeCell) return;
    const row = taxRates.find((r) => r.id === activeCell.rowId);
    if (!row) { setActiveCell(null); return; }
    const current = row[activeCell.col] ?? '';
    if (cellDraft !== current) void commitCell(activeCell.rowId, activeCell.col, cellDraft);
    setActiveCell(null);
  }

  function navigateCell(dir: 'left' | 'right' | 'up' | 'down') {
    if (!activeCell) return;
    const rowIdx = taxRates.findIndex((r) => r.id === activeCell.rowId);
    if (rowIdx === -1) return;
    const colIdx = EDIT_COLS.indexOf(activeCell.col);
    if (colIdx === -1) return;

    let nextRow = rowIdx;
    let nextCol = colIdx;
    if (dir === 'left')  nextCol = Math.max(0, colIdx - 1);
    if (dir === 'right') nextCol = Math.min(EDIT_COLS.length - 1, colIdx + 1);
    if (dir === 'up')    nextRow = Math.max(0, rowIdx - 1);
    if (dir === 'down')  nextRow = Math.min(taxRates.length - 1, rowIdx + 1);

    const next = taxRates[nextRow];
    const nc = EDIT_COLS[nextCol];
    setActiveCell({ rowId: next.id, col: nc });
    setCellDraft(next[nc] ?? '');
  }

  function handleTableKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!activeCell) return;
    const t = e.target as HTMLElement | null;
    const tag = (t?.tagName ?? '').toLowerCase();
    const isFormEl = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveCell(null);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      deactivateAndSave();
      navigateCell('down');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      deactivateAndSave();
      navigateCell(e.shiftKey ? 'left' : 'right');
      return;
    }
    if (!isFormEl) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateCell('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateCell('right'); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); navigateCell('up'); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); navigateCell('down'); }
    }
  }

  const COL: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef', backgroundColor: '#fafafa', whiteSpace: 'nowrap',
  };
  const TD: React.CSSProperties = { padding: '10px 14px', fontSize: 13.5, color: '#444', verticalAlign: 'middle', borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5' };
  function cellStyle(rowId: string, col: EditCol, extra?: React.CSSProperties): React.CSSProperties {
    const isActive = activeCell?.rowId === rowId && activeCell?.col === col;
    const isSaving = cellSaving.has(cellKey(rowId, col));
    return {
      ...TD,
      backgroundColor: isSaving ? '#fff9db' : isActive ? '#ecfeff' : undefined,
      outline: isActive ? '2px solid #35C0A3' : 'none',
      outlineOffset: -2,
      padding: isActive ? '8px 10px' : TD.padding,
      ...extra,
    };
  }

  return (
    <div style={{ fontFamily: "'Heebo', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
            style={{ paddingLeft: 30, paddingRight: 12, height: 34, borderRadius: 7, border: '1px solid #e8e8e8', fontSize: 13.5, color: '#333', outline: 'none', fontFamily: "'Heebo', sans-serif", width: 220, backgroundColor: '#fff' }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e8e8e8')} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as '' | 'true' | 'false')}
            style={{ height: 34, borderRadius: 7, border: '1px solid #e8e8e8', paddingInline: 8, fontSize: 13, fontFamily: "'Heebo', sans-serif", color: '#333', backgroundColor: '#fff' }}
          >
            <option value="">All status</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <select
            value={taxTypeFilter}
            onChange={(e) => setTaxTypeFilter(e.target.value)}
            style={{ height: 34, borderRadius: 7, border: '1px solid #e8e8e8', paddingInline: 8, fontSize: 13, fontFamily: "'Heebo', sans-serif", color: '#333', minWidth: 140, backgroundColor: '#fff' }}
          >
            <option value="">All tax types</option>
            {(choices?.tax_types ?? []).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={zatcaFilter}
            onChange={(e) => setZatcaFilter(e.target.value)}
            style={{ height: 34, borderRadius: 7, border: '1px solid #e8e8e8', paddingInline: 8, fontSize: 13, fontFamily: "'Heebo', sans-serif", color: '#333', backgroundColor: '#fff' }}
          >
            <option value="">All ZATCA codes</option>
            <option value="S">S — Standard</option>
            <option value="Z">Z — Zero</option>
            <option value="E">E — Exempt</option>
            <option value="O">O — Out of scope</option>
          </select>
          <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, paddingInline: 14, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#666', fontSize: 13.5, cursor: 'pointer' }}>
            <ArrowUpDown size={13} /> Sort
          </button>
          <button type="button" style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 7, padding: '0 8px', height: 34, cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}>
            <MoreVertical size={14} />
          </button>
          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 18, borderRadius: 7, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        <div ref={tableRef} tabIndex={0} onKeyDown={handleTableKeyDown} style={{ outline: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...COL, textAlign: 'left'  }}>Tax Rate Name (English)</th>
              <th style={{ ...COL, textAlign: 'left'  }}>Tax Rate Name (Arabic)</th>
              <th style={COL}>Tax Type</th>
              <th style={COL}>Tax Rate</th>
              <th style={{ ...COL, textAlign: 'left'  }}>Description</th>
              <th style={COL}>ZATCA Category</th>
              <th style={{ ...COL, width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading tax rates…</td></tr>
            ) : taxRates.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No tax rates found.</td></tr>
            ) : taxRates.map((rate, i) => {
              const tc = TAX_TYPE_COLORS[rate.tax_type]    ?? { bg: '#f3f4f6', text: '#6b7280' };
              const zc = ZATCA_COLORS[rate.zatca_category] ?? { bg: '#f3f4f6', text: '#6b7280' };
              const canDelete = !rate.is_default && !rate.has_transactions;

              return (
                <tr key={rate.id} style={{ borderBottom: i < taxRates.length - 1 ? '1px solid #f5f5f5' : 'none', backgroundColor: '#fff' }}>
                  {/* EN Name */}
                  <td
                    style={cellStyle(rate.id, 'name', { fontWeight: 500, color: '#222' })}
                    onClick={() => activateCell(rate.id, 'name', rate.name)}
                  >
                    {activeCell?.rowId === rate.id && activeCell?.col === 'name' ? (
                      <input
                        autoFocus
                        value={cellDraft}
                        onChange={(e) => setCellDraft(e.target.value)}
                        onBlur={() => deactivateAndSave()}
                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                          fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111', fontWeight: 500 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {rate.is_default && (
                          <span style={{ fontSize: 10, backgroundColor: '#e8f8f5', color: '#35C0A3', borderRadius: 4, padding: '1px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>Default</span>
                        )}
                        {rate.name}
                      </div>
                    )}
                  </td>

                  {/* AR Name */}
                  <td
                    dir="rtl"
                    style={cellStyle(rate.id, 'name_ar', { color: '#555' })}
                    onClick={() => activateCell(rate.id, 'name_ar', rate.name_ar ?? '')}
                  >
                    {activeCell?.rowId === rate.id && activeCell?.col === 'name_ar' ? (
                      <input
                        autoFocus
                        value={cellDraft}
                        onChange={(e) => setCellDraft(e.target.value)}
                        onBlur={() => deactivateAndSave()}
                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                          fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111' }}
                      />
                    ) : (
                      rate.name_ar || <span style={{ color: '#ccc', direction: 'ltr' }}>—</span>
                    )}
                  </td>

                  {/* Tax Type */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <span style={{ backgroundColor: tc.bg, color: tc.text, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {rate.tax_type_display}
                    </span>
                  </td>

                  {/* Rate */}
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 600, color: '#333' }}>
                    {parseFloat(rate.rate).toFixed(0)}%
                  </td>

                  {/* Description */}
                  <td
                    style={cellStyle(rate.id, 'description', { color: '#777', maxWidth: 240 })}
                    onClick={() => activateCell(rate.id, 'description', rate.description ?? '')}
                  >
                    {activeCell?.rowId === rate.id && activeCell?.col === 'description' ? (
                      <input
                        autoFocus
                        value={cellDraft}
                        onChange={(e) => setCellDraft(e.target.value)}
                        onBlur={() => deactivateAndSave()}
                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                          fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111' }}
                      />
                    ) : (
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rate.description || <span style={{ color: '#ddd' }}>—</span>}
                      </span>
                    )}
                  </td>

                  {/* ZATCA Category */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {rate.zatca_category
                      ? <span style={{ backgroundColor: zc.bg, color: zc.text, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                          {rate.zatca_category_display || rate.zatca_category}
                        </span>
                      : <span style={{ color: '#ddd' }}>—</span>}
                  </td>

                  {/* Actions */}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <button onClick={() => openEdit(rate)} title="Edit"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#35C0A3', padding: 2, display: 'flex', alignItems: 'center' }}>
                        <Pencil size={14} />
                      </button>
                      {canDelete && (
                        <button onClick={() => deleteRate(rate)} disabled={deletingId === rate.id} title="Delete"
                          style={{ background: 'none', border: 'none', cursor: deletingId === rate.id ? 'not-allowed' : 'pointer', color: deletingId === rate.id ? '#fca5a5' : '#f87171', padding: 2, display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateModal choices={choices} onClose={() => setShowCreate(false)} onSaved={onSaved} />}
      {editRate   && <EditModal   rate={editRate}   onClose={() => setEditRate(null)}    onSaved={onSaved} />}
    </div>
  );
}
