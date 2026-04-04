import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

function supplierRefundIdempotencyKey() {
  return crypto.randomUUID();
}

interface SupplierRefund {
  id: string;
  refund_number: string;
  supplier: string;
  supplier_name: string;
  paid_through: string;
  paid_through_code: string;
  paid_through_name: string;
  amount_refunded: string;
  refund_date: string;
  description: string;
  is_posted: boolean;
  journal_entry?: string | null;
  amount_applied: string;
  remaining_amount: string;
  allocations: { debit_note: string; amount: string }[];
  created_at: string;
  updated_at: string;
}

interface SupplierChoice { id: string; company_name: string; }
interface AccountChoice { id: string; code: string; name: string; }
interface OutstandingDebitNote {
  id: string;
  debit_note_number: string;
  date: string;
  total_amount: string;
  refunded_amount: string;
  balance_amount: string;
}

const inputSt: CSSProperties = {
  width: '100%', height: 34, borderRadius: 7, border: '1px solid #e0e0e0',
  padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
  fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff',
};

function fmt(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '0.00');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RefundsList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<SupplierRefund[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierChoice[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const { data } = await api.get<{ results: any[] }>('/api/v1/purchases/suppliers/?page_size=200&active=true');
      setSuppliers((data.results ?? []).map((s) => ({ id: s.id, company_name: s.company_name })));
    } catch { /* silent */ }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (supplier) params.set('supplier', supplier);
      const { data } = await api.get<{ count: number; results: SupplierRefund[] }>(`/api/v1/purchases/supplier-refunds/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [search, supplier]);

  useEffect(() => { void fetchMeta(); }, [fetchMeta]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, supplier, fetchRows]);

  const TH: CSSProperties = {
    padding: '10px 12px', fontSize: 12, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '9px 12px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ ...inputSt, paddingLeft: 30 }} />
        </div>
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button onClick={() => setFilterOpen((o) => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer' }}>
            <SlidersHorizontal size={14} /> Filter
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 260, overflow: 'hidden', padding: 12 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Supplier</div>
                  <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setSupplier(''); setFilterOpen(false); }}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => nav('/purchase/supplier-refunds/add')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Refund #</th>
              <th style={TH}>Supplier</th>
              <th style={TH}>Paid Through</th>
              <th style={{ ...TH, textAlign: 'right' }}>Amount Refunded</th>
              <th style={{ ...TH, textAlign: 'right' }}>Applied</th>
              <th style={{ ...TH, textAlign: 'right' }}>Remaining</th>
              <th style={TH}>Date</th>
              <th style={TH}>Posted</th>
              <th style={{ ...TH, borderRight: 'none' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading supplier refunds…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No supplier refunds found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => nav(`/purchase/supplier-refunds/${r.id}`)}>
                <td style={{ ...TD, fontWeight: 600 }}>{r.refund_number}</td>
                <td style={TD}>{r.supplier_name}</td>
                <td style={TD}>{r.paid_through_code} - {r.paid_through_name}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount_refunded)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount_applied)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.remaining_amount)}</td>
                <td style={TD}>{r.refund_date}</td>
                <td style={TD}>{r.is_posted ? 'Yes' : 'No'}</td>
                <td style={{ ...TD, borderRight: 'none' }}>{r.created_at?.replace('T', ' ').slice(0, 16) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{total} {total === 1 ? 'refund' : 'refunds'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RefundEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = id === 'add';
  const nav = useNavigate();

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [refundId, setRefundId] = useState<string | null>(isCreate ? null : id || null);
  const [refundNumber, setRefundNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [paidThrough, setPaidThrough] = useState('');
  const [amountRefunded, setAmountRefunded] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [description, setDescription] = useState('');

  const [suppliers, setSuppliers] = useState<SupplierChoice[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingDebitNote[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const amountApplied = useMemo(
    () => Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0),
    [allocations],
  );
  const remaining = useMemo(() => (Number(amountRefunded) || 0) - amountApplied, [amountRefunded, amountApplied]);

  const fetchMeta = useCallback(async () => {
    try {
      const [sRes, aRes, choicesRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/purchases/suppliers/?page_size=200&active=true'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
        api.get<{ next_number?: string }>('/api/v1/purchases/supplier-refunds/choices/'),
      ]);
      setSuppliers((sRes.data.results ?? []).map((s) => ({ id: s.id, company_name: s.company_name })));
      if (isCreate && choicesRes.data.next_number) {
        setRefundNumber(choicesRes.data.next_number);
      }
      const flat: AccountChoice[] = [];
      function walk(nodes: any[]) {
        nodes.forEach((n) => {
          if (!n.is_archived) flat.push({ id: n.id, code: n.code, name: n.name });
          if (n.children && Array.isArray(n.children)) walk(n.children);
        });
      }
      if (Array.isArray(aRes.data)) walk(aRes.data);
      setAccounts(flat);
    } catch { /* silent */ }
  }, [isCreate]);

  const fetchOutstanding = useCallback(async (supplierId: string) => {
    if (!supplierId) { setOutstanding([]); return; }
    try {
      const { data } = await api.get<{ results: OutstandingDebitNote[] }>(
        `/api/v1/purchases/supplier-refunds/outstanding-debit-notes/?supplier=${encodeURIComponent(supplierId)}`,
      );
      setOutstanding(data.results ?? []);
    } catch { setOutstanding([]); }
  }, []);

  const fetchRefund = useCallback(async () => {
    if (isCreate || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<SupplierRefund>(`/api/v1/purchases/supplier-refunds/${id}/`);
      setRefundId(data.id);
      setRefundNumber(data.refund_number ?? '');
      setSupplier(data.supplier ?? '');
      setPaidThrough(data.paid_through ?? '');
      setAmountRefunded(data.amount_refunded ?? '');
      setRefundDate(data.refund_date ?? '');
      setDescription(data.description ?? '');
      const allocMap: Record<string, string> = {};
      (data.allocations ?? []).forEach((a) => { allocMap[a.debit_note] = a.amount; });
      setAllocations(allocMap);
      await fetchOutstanding(data.supplier ?? '');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isCreate, fetchOutstanding]);

  useEffect(() => { void fetchMeta(); }, [fetchMeta]);
  useEffect(() => { void fetchRefund(); }, [fetchRefund]);
  useEffect(() => { if (supplier) void fetchOutstanding(supplier); }, [supplier, fetchOutstanding]);

  function setAlloc(debitNoteId: string, val: string) {
    setAllocations((prev) => ({ ...prev, [debitNoteId]: val }));
  }

  async function save() {
    setError('');

    const validationErrors: string[] = [];

    if (!supplier) validationErrors.push('Supplier is required.');
    if (!paidThrough) validationErrors.push('Paid through account is required.');
    if (!refundDate) validationErrors.push('Refund date is required.');

    const refundedNum = Number(amountRefunded);
    if (!amountRefunded || isNaN(refundedNum)) {
      validationErrors.push('Amount received must be a valid number.');
    } else if (refundedNum <= 0) {
      validationErrors.push('Amount received must be greater than 0.');
    }

    if (validationErrors.length === 0) {
      if (amountApplied > refundedNum) {
        validationErrors.push(
          `Total allocated (${fmt(amountApplied)}) exceeds amount received (${fmt(refundedNum)}). Please reduce allocations or increase the amount received.`,
        );
      }
      for (const dn of outstanding) {
        const a = Number(allocations[dn.id] || 0);
        if (a < 0) {
          validationErrors.push(`Allocation for debit note ${dn.debit_note_number} cannot be negative.`);
        } else if (a > (Number(dn.balance_amount) || 0)) {
          validationErrors.push(
            `Allocation of ${fmt(a)} for debit note ${dn.debit_note_number} exceeds its outstanding balance of ${fmt(dn.balance_amount)}.`,
          );
        }
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        refund_number: refundNumber.trim(),
        supplier,
        paid_through: paidThrough,
        amount_refunded: amountRefunded,
        refund_date: refundDate,
        description,
        allocations: Object.entries(allocations)
          .filter(([, v]) => (Number(v) || 0) > 0)
          .map(([debit_note, amount]) => ({ debit_note, amount })),
      };

      await (refundId
        ? api.patch<SupplierRefund>(`/api/v1/purchases/supplier-refunds/${refundId}/`, body)
        : api.post<SupplierRefund>('/api/v1/purchases/supplier-refunds/', body, {
            headers: { 'Idempotency-Key': supplierRefundIdempotencyKey() },
          }));

      nav('/purchase/supplier-refunds', { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRefund() {
    if (!refundId) return;
    if (!window.confirm('Delete this supplier refund?')) return;
    try {
      await api.delete(`/api/v1/purchases/supplier-refunds/${refundId}/`);
      nav('/purchase/supplier-refunds');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  if (loading) return <div style={{ padding: '32px', color: '#999', fontFamily: "'Heebo', sans-serif" }}>Loading…</div>;

  const labelSt: CSSProperties = { fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' };
  const sectionHeadSt: CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#374151',
    padding: '10px 20px', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8fafb',
  };
  const TH: CSSProperties = {
    padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#6b7280',
    backgroundColor: '#edf7f4', borderBottom: '1px solid #d1fae5',
    textAlign: 'left', whiteSpace: 'nowrap',
  };
  const TD: CSSProperties = {
    padding: '9px 14px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #f0f4f8', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#fff' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
          Record Supplier Refund
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => nav('/purchase/supplier-refunds')}
            style={{ height: 36, paddingInline: 16, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
            Cancel
          </button>
          {refundId && (
            <button onClick={deleteRefund}
              style={{ height: 36, paddingInline: 14, borderRadius: 7, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button onClick={save} disabled={saving}
            style={{ height: 36, paddingInline: 22, borderRadius: 7, border: 'none', backgroundColor: saving ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          {error.split('\n').map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < error.split('\n').length - 1 ? 4 : 0 }}>
              <span style={{ marginTop: 2, flexShrink: 0 }}>•</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Basic Information */}
      <div style={{ border: '1px solid #e9ecef', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
        <div style={sectionHeadSt}>Basic Information</div>
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr', gap: '14px 24px', alignItems: 'center' }}>

          <span style={labelSt}>Supplier*</span>
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={inputSt}>
            <option value="">Select</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>

          <span style={labelSt}>Paid through*</span>
          <select value={paidThrough} onChange={(e) => setPaidThrough(e.target.value)} style={inputSt}>
            <option value="">Select</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>

          <span style={labelSt}>Amount Received*</span>
          <input
            type="number" step="0.01" value={amountRefunded}
            onChange={(e) => setAmountRefunded(e.target.value)}
            style={inputSt} placeholder="Empty" />

          <span style={labelSt}>Refund #</span>
          <input
            value={refundNumber} readOnly
            style={{ ...inputSt, backgroundColor: '#f5f5f5', color: '#888', cursor: 'default' }} />

          <span style={labelSt}>Date*</span>
          <input type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} style={inputSt} />

          <span style={{ ...labelSt, alignSelf: 'start', paddingTop: 8 }}>Description</span>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputSt, height: 72, paddingTop: 8, resize: 'vertical', gridColumn: '4 / 5' }}
            placeholder="Empty" />

        </div>
      </div>

      {/* Payment Details */}
      <div style={{ border: '1px solid #e9ecef', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ ...sectionHeadSt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Debit note list of this record</span>
          {Object.values(allocations).some((v) => Number(v) > 0) && (
            <button
              onClick={() => setAllocations({})}
              style={{ fontSize: 12, color: '#35C0A3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              Clear all applied amount
            </button>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Debit note</th>
              <th style={TH}>Date</th>
              <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
              <th style={{ ...TH, textAlign: 'right' }}>Balance</th>
              <th style={{ ...TH, textAlign: 'right' }}>Payment to Apply</th>
              <th style={{ ...TH, textAlign: 'right' }}>In Bank Currency</th>
            </tr>
          </thead>
          <tbody>
            {outstanding.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                  {supplier ? 'No outstanding debit notes for this supplier.' : 'Select supplier to fetch outstanding debit note'}
                </td>
              </tr>
            ) : outstanding.map((dn) => (
              <tr key={dn.id} style={{ backgroundColor: '#fff' }}>
                <td style={{ ...TD, fontWeight: 600, color: '#1d4ed8' }}>{dn.debit_note_number}</td>
                <td style={TD}>{dn.date}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(dn.total_amount)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(dn.balance_amount)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <input
                    type="number" step="0.01" min={0} max={Number(dn.balance_amount)}
                    value={allocations[dn.id] ?? ''}
                    onChange={(e) => setAlloc(dn.id, e.target.value)}
                    style={{ ...inputSt, height: 32, width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                  />
                </td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(allocations[dn.id] || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary footer */}
        <div style={{ borderTop: '1px solid #e9ecef', padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 120px', gap: 8, alignItems: 'center', textAlign: 'right' }}>
            <span style={{ fontSize: 13.5, color: '#6b7280' }}>Amount to apply</span>
            <span style={{ fontSize: 13.5, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(amountApplied)}</span>

            <span style={{ fontSize: 13.5, color: '#6b7280' }}>Amount paid</span>
            <span style={{ fontSize: 13.5, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(amountRefunded || 0)}</span>

            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', paddingTop: 8, borderTop: '1px solid #e9ecef' }}>Remaining</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: remaining >= 0 ? '#111827' : '#dc2626', fontVariantNumeric: 'tabular-nums', paddingTop: 8, borderTop: '1px solid #e9ecef' }}>
              {fmt(remaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierRefunds() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <RefundEditor />;
  return <RefundsList />;
}
