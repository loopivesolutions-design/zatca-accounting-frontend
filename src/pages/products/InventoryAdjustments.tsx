import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

// ── Types ─────────────────────────────────────────────────────────────────────
type AdjustmentStatus = 'draft' | 'posted';

interface AdjustmentLineRow {
  id: string; // line id (list is one row per line)
  /** Parent adjustment header UUID — use for detail URL when present (never use human `adjustment_id`). */
  adjustment?: string | null;
  adjustment_header_id?: string | null;
  adjustment_id: string | null;
  reference: string;
  status: AdjustmentStatus;
  date: string; // YYYY-MM-DD
  warehouse_id: string;
  warehouse_name: string;
  product: string;
  product_code: string;
  product_name: string;
  description: string;
  quantity_delta: string;
  inventory_value_delta: string;
  account: string;
  account_code: string;
  account_name: string;
  total_adjustment_amount: string;
  created_at: string;
  updated_at: string;
}

interface WarehouseChoice {
  id: string;
  code: string;
  name: string;
}

interface ItemChoice {
  id: string;
  code: string;
  name: string;
}

interface AccountChoice {
  id: string;
  code: string;
  name: string;
}

interface AdjustmentDraftLine {
  id?: string;
  product: string;
  description: string;
  quantity_delta: string;
  inventory_value_delta: string;
  account: string;
}

interface AdjustmentDraft {
  id: string;
  adjustment_id: string | null;
  reference: string;
  status: AdjustmentStatus;
  date: string;
  warehouse: string;
  warehouse_name?: string | null;
  lines: AdjustmentDraftLine[];
  total_adjustment_amount?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
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

function StatusPill({ status }: { status: AdjustmentStatus }) {
  const isPosted = status === 'posted';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 18,
        paddingInline: 8,
        borderRadius: 5,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        backgroundColor: isPosted ? '#dcfce7' : '#fef3c7',
        color: isPosted ? '#16a34a' : '#b45309',
      }}
    >
      {isPosted ? 'POSTED' : 'DRAFT'}
    </span>
  );
}

function fmtMoney(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v || '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v || '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Detail screen is keyed by adjustment header UUID, not JE-style `adjustment_id` (e.g. ADJ-000001). */
function adjustmentDetailId(row: AdjustmentLineRow): string {
  return row.adjustment_header_id || row.adjustment || row.id;
}

// ── List Page ────────────────────────────────────────────────────────────────
function InventoryAdjustmentsList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<AdjustmentLineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | AdjustmentStatus>('');
  const [warehouse, setWarehouse] = useState('');
  const [item, setItem] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [warehouses, setWarehouses] = useState<WarehouseChoice[]>([]);
  const [items, setItems] = useState<ItemChoice[]>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchChoices = useCallback(async () => {
    try {
      const [wRes, iRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/products/warehouses/?page_size=200'),
        api.get<{ results: any[] }>('/api/v1/products/items/?page_size=200'),
      ]);
      setWarehouses(
        (wRes.data.results ?? []).map((w) => ({ id: w.id, code: w.code, name: w.name })),
      );
      setItems(
        (iRes.data.results ?? []).map((p) => ({ id: p.id, code: p.code, name: p.name })),
      );
    } catch {
      /* silent */
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (warehouse) params.set('warehouse', warehouse);
      if (item) params.set('item', item);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get<{ count: number; results: AdjustmentLineRow[] }>(
        `/api/v1/products/inventory/adjustments/?${params}`,
      );
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, status, warehouse, item, dateFrom, dateTo]);

  useEffect(() => {
    void fetchChoices();
  }, [fetchChoices]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, status, warehouse, item, dateFrom, dateTo, fetchRows]);

  const TH: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: 12.5,
    color: '#333',
    borderBottom: '1px solid #eef2f5',
    borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ fontFamily: "'Heebo', sans-serif", backgroundColor: '#f4f6f8', padding: '24px 28px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            style={{ ...inputSt, paddingLeft: 30 }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          />
        </div>

        <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ ...inputSt, width: 140, cursor: 'pointer' }}>
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
        </select>

        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} style={{ ...inputSt, width: 190, cursor: 'pointer' }}>
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <select value={item} onChange={(e) => setItem(e.target.value)} style={{ ...inputSt, width: 190, cursor: 'pointer' }}>
          <option value="">All items</option>
          {items.map((p) => (
            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Calendar size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputSt, width: 150, paddingLeft: 30 }} />
          </div>
          <span style={{ color: '#bbb' }}>—</span>
          <div style={{ position: 'relative' }}>
            <Calendar size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputSt, width: 150, paddingLeft: 30 }} />
          </div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => nav('/products/inventory/adjustments/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 76 }}>Status</th>
              <th style={TH}>Reference</th>
              <th style={TH}>Date</th>
              <th style={TH}>Warehouse</th>
              <th style={TH}>Item</th>
              <th style={TH}>Item description</th>
              <th style={{ ...TH, textAlign: 'right' }}>Qty +/-</th>
              <th style={{ ...TH, textAlign: 'right' }}>Inventory value +/-</th>
              <th style={TH}>Account</th>
              <th style={{ ...TH, textAlign: 'right' }}>Total adjustment amount</th>
              <th style={TH}>Adjustment ID</th>
              <th style={TH}>Modified</th>
              <th style={{ ...TH, borderRight: 'none' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #35C0A3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  No adjustments found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ backgroundColor: '#fff', cursor: 'pointer' }}
                  onClick={() => nav(`/products/inventory/adjustments/${adjustmentDetailId(r)}`)}
                >
                  <td style={TD}><StatusPill status={r.status} /></td>
                  <td style={{ ...TD, color: '#374151', fontWeight: 600 }}>{r.reference || '—'}</td>
                  <td style={TD}>{r.date}</td>
                  <td style={{ ...TD, color: '#4b5563' }}>{r.warehouse_name}</td>
                  <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{r.product_name}</td>
                  <td style={{ ...TD, color: '#6b7280', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.description || '—'}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: Number(r.quantity_delta) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {(Number(r.quantity_delta) >= 0 ? '+' : '') + fmtQty(r.quantity_delta)}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: Number(r.inventory_value_delta) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {(Number(r.inventory_value_delta) >= 0 ? '+' : '') + fmtMoney(r.inventory_value_delta)}
                  </td>
                  <td style={{ ...TD, color: '#4b5563' }}>{r.account_code} - {r.account_name}</td>
                  <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtMoney(r.total_adjustment_amount)}</td>
                  <td style={{ ...TD, color: '#6b7280' }}>{r.adjustment_id ?? '—'}</td>
                  <td style={{ ...TD, color: '#6b7280' }}>{r.updated_at?.replace('T', ' ').slice(0, 16) ?? '—'}</td>
                  <td style={{ ...TD, color: '#6b7280', borderRight: 'none' }}>{r.created_at?.replace('T', ' ').slice(0, 16) ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && rows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{total} {total === 1 ? 'line' : 'lines'}</span>
            <Link to="/products/inventory/adjustments/new" style={{ fontSize: 12.5, color: '#35C0A3', textDecoration: 'none' }}>New adjustment</Link>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12.5, color: '#9ca3af' }}>
        Each row represents one line. Multiple lines can share the same adjustment entry and are posted together as one journal entry.
      </div>
    </div>
  );
}

// ── Editor Page ───────────────────────────────────────────────────────────────
function InventoryAdjustmentEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const nav = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const [warehouses, setWarehouses] = useState<WarehouseChoice[]>([]);
  const [items, setItems] = useState<ItemChoice[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<AdjustmentStatus>('draft');
  const [adjustmentId, setAdjustmentId] = useState<string | null>(null);

  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [lines, setLines] = useState<AdjustmentDraftLine[]>([
    { product: '', description: '', quantity_delta: '', inventory_value_delta: '', account: '' },
  ]);

  const totalAmount = useMemo(() => {
    const sum = lines.reduce((acc, l) => acc + (Number(l.inventory_value_delta) || 0), 0);
    return sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [lines]);

  const canEdit = status === 'draft';

  const fetchChoices = useCallback(async () => {
    try {
      const [wRes, iRes, aRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/products/warehouses/?page_size=200'),
        api.get<{ results: any[] }>('/api/v1/products/items/?page_size=200'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
      ]);
      setWarehouses((wRes.data.results ?? []).map((w) => ({ id: w.id, code: w.code, name: w.name })));
      setItems((iRes.data.results ?? []).map((p) => ({ id: p.id, code: p.code, name: p.name })));

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

  const fetchDraft = useCallback(async () => {
    if (isNew || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<any>(`/api/v1/products/inventory/adjustments/${id}/`);
      const d: AdjustmentDraft = {
        id: data.id ?? id,
        adjustment_id: data.adjustment_id ?? null,
        reference: data.reference ?? '',
        status: data.status ?? 'draft',
        date: data.date ?? '',
        warehouse: data.warehouse ?? data.warehouse_id ?? '',
        warehouse_name: data.warehouse_name ?? null,
        lines: (data.lines ?? []).map((l: any) => ({
          id: l.id,
          product: l.product ?? '',
          description: l.description ?? '',
          quantity_delta: String(l.quantity_delta ?? ''),
          inventory_value_delta: String(l.inventory_value_delta ?? ''),
          account: l.account ?? '',
        })),
        total_adjustment_amount: data.total_adjustment_amount,
      };
      setDraftId(d.id);
      setAdjustmentId(d.adjustment_id);
      setStatus(d.status);
      setReference(d.reference);
      setDate(d.date);
      setWarehouse(d.warehouse);
      setLines(d.lines.length ? d.lines : [{ product: '', description: '', quantity_delta: '', inventory_value_delta: '', account: '' }]);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    void fetchChoices();
  }, [fetchChoices]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setDraftId(null);
      setStatus('draft');
      setAdjustmentId(null);
      setReference('');
      setDate(new Date().toISOString().slice(0, 10));
      setWarehouse('');
      setLines([{ product: '', description: '', quantity_delta: '', inventory_value_delta: '', account: '' }]);
      setError('');
      return;
    }
    if (id) void fetchDraft();
  }, [id, isNew, fetchDraft]);

  function setLine(idx: number, patch: Partial<AdjustmentDraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { product: '', description: '', quantity_delta: '', inventory_value_delta: '', account: '' }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }

  function lineHasError(l: AdjustmentDraftLine) {
    const qty = Number(l.quantity_delta);
    const val = Number(l.inventory_value_delta);
    return !l.product || !l.account || !l.description || !Number.isFinite(qty) || qty === 0 || !Number.isFinite(val) || val === 0;
  }

  async function saveDraft() {
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        reference,
        date,
        warehouse,
        lines: lines.map((l) => ({
          product: l.product,
          description: l.description,
          quantity_delta: Number(l.quantity_delta) || 0,
          inventory_value_delta: Number(l.inventory_value_delta) || 0,
          account: l.account,
        })),
      };

      const { data } = isNew || !draftId
        ? await api.post<any>('/api/v1/products/inventory/adjustments/', body)
        : await api.patch<any>(`/api/v1/products/inventory/adjustments/${draftId}/`, body);

      // Refresh state from response if present
      setDraftId(data.id ?? draftId);
      setStatus(data.status ?? 'draft');
      setAdjustmentId(data.adjustment_id ?? adjustmentId);
      if (data.lines) {
        setLines(
          (data.lines ?? []).map((x: any) => ({
            id: x.id,
            product: x.product ?? '',
            description: x.description ?? '',
            quantity_delta: String(x.quantity_delta ?? ''),
            inventory_value_delta: String(x.inventory_value_delta ?? ''),
            account: x.account ?? '',
          })) || lines,
        );
      }
      if (isNew && data.id) nav(`/products/inventory/adjustments/${data.id}`, { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteDraft() {
    if (!draftId) return;
    if (!window.confirm('Delete this draft adjustment?')) return;
    try {
      await api.delete(`/api/v1/products/inventory/adjustments/${draftId}/`);
      nav('/products/inventory/adjustments');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  async function postDraft() {
    if (!draftId) return;
    setPosting(true);
    setError('');
    try {
      await api.post(`/api/v1/products/inventory/adjustments/${draftId}/post/`);
      // Reload
      await fetchDraft();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setPosting(false);
    }
  }

  const TH: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 12.5,
    color: '#333',
    borderBottom: '1px solid #eef2f5',
    borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ fontFamily: "'Heebo', sans-serif", backgroundColor: '#f4f6f8', padding: '24px 28px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Inventory Adjustment</span>
          <StatusPill status={status} />
          {adjustmentId && <span style={{ fontSize: 12.5, color: '#6b7280' }}>{adjustmentId}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => nav('/products/inventory/adjustments')}
            style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer' }}
          >
            Cancel
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: saving ? '#a8e4d8' : '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          {canEdit && draftId && (
            <button
              type="button"
              onClick={postDraft}
              disabled={posting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 16, borderRadius: 8, border: '1px solid #bbf7e8', backgroundColor: '#f0fdf9', color: '#0f766e', fontSize: 13.5, fontWeight: 600, cursor: posting ? 'not-allowed' : 'pointer' }}
            >
              <Upload size={14} /> {posting ? 'Posting…' : 'Post'}
            </button>
          )}
          {canEdit && draftId && (
            <button
              type="button"
              onClick={deleteDraft}
              style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', fontSize: 13.5, cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {/* Header inputs */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 240px 140px 200px', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: '#555', fontWeight: 500 }}>Reference</span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5', color: canEdit ? '#111' : '#999' }} placeholder="e.g. 11" />
              <span style={{ fontSize: 12.5, color: '#555', fontWeight: 500 }}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5', color: canEdit ? '#111' : '#999' }} />

              <span style={{ fontSize: 12.5, color: '#555', fontWeight: 500 }}>Warehouse</span>
              <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} disabled={!canEdit} style={{ ...inputSt, cursor: canEdit ? 'pointer' : 'not-allowed', backgroundColor: canEdit ? '#fff' : '#f5f5f5', color: warehouse ? '#111' : '#9ca3af' }}>
                <option value="">{canEdit ? 'Select' : '—'}</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div />
            </div>
          </div>

          {/* Lines grid */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: 28 }} />
                  <th style={TH}>Item</th>
                  <th style={TH}>Description</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Qty +/-</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Inventory value +/-</th>
                  <th style={TH}>Account</th>
                  <th style={{ ...TH, width: 40, borderRight: 'none' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const bad = lineHasError(l);
                  return (
                    <tr key={idx} style={{ backgroundColor: bad ? '#fff7ed' : '#fff' }}>
                      <td style={{ ...TD, textAlign: 'center' }}>
                        {bad && (
                          <span title="Missing required field" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                          </span>
                        )}
                      </td>
                      <td style={TD}>
                        <select value={l.product} disabled={!canEdit} onChange={(e) => setLine(idx, { product: e.target.value })} style={{ ...inputSt, height: 32, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                          <option value="">Select</option>
                          {items.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                        </select>
                      </td>
                      <td style={TD}>
                        <input value={l.description} disabled={!canEdit} onChange={(e) => setLine(idx, { description: e.target.value })} style={{ ...inputSt, height: 32 }} placeholder="Required" />
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <input type="number" step="0.01" value={l.quantity_delta} disabled={!canEdit} onChange={(e) => setLine(idx, { quantity_delta: e.target.value })} style={{ ...inputSt, height: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} placeholder="Required" />
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <input type="number" step="0.01" value={l.inventory_value_delta} disabled={!canEdit} onChange={(e) => setLine(idx, { inventory_value_delta: e.target.value })} style={{ ...inputSt, height: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} placeholder="Required" />
                      </td>
                      <td style={TD}>
                        <select value={l.account} disabled={!canEdit} onChange={(e) => setLine(idx, { account: e.target.value })} style={{ ...inputSt, height: 32, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                          <option value="">Select</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </td>
                      <td style={{ ...TD, textAlign: 'center', borderRight: 'none' }}>
                        {canEdit && (
                          <button type="button" onClick={() => removeLine(idx)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #f5f5f5' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {canEdit && (
                  <button type="button" onClick={addLine} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #bbf7e8', backgroundColor: '#f0fdf9', color: '#0f766e', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                    <Plus size={14} /> Add line
                  </button>
                )}
                <span style={{ fontSize: 12.5, color: '#9ca3af' }}>
                  Multiple lines are posted together into one journal entry.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>Total adjustment amount</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                  {totalAmount}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Route wrapper ─────────────────────────────────────────────────────────────
export default function InventoryAdjustments() {
  const { id } = useParams<{ id?: string }>();
  // If id is present, we're in editor mode; otherwise list.
  if (id) return <InventoryAdjustmentEditor />;
  return <InventoryAdjustmentsList />;
}

