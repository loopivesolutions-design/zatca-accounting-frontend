import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

function customerRefundIdempotencyKey() {
  return crypto.randomUUID();
}

interface CustomerRefund {
  id: string;
  refund_number: string;
  customer: string;
  customer_name: string;
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
  allocations: { credit_note: string; amount: string }[];
  created_at: string;
  updated_at: string;
}

interface CustomerChoice { id: string; company_name: string; }
interface AccountChoice { id: string; code: string; name: string; }
interface OutstandingCreditNote {
  id: string;
  credit_note_number: string;
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
  const [rows, setRows] = useState<CustomerRefund[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState('');
  const [customers, setCustomers] = useState<CustomerChoice[]>([]);
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
      const { data } = await api.get<{ results: any[] }>('/api/v1/sales/customers/?page_size=200&active=true');
      setCustomers((data.results ?? []).map((c) => ({ id: c.id, company_name: c.company_name })));
    } catch {
      /* silent */
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (customer) params.set('customer', customer);
      const { data } = await api.get<{ count: number; results: CustomerRefund[] }>(`/api/v1/sales/customer-refunds/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, customer]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, customer, fetchRows]);

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
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 280, overflow: 'hidden', padding: 12 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Customer</div>
                  <select value={customer} onChange={(e) => setCustomer(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {customers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setCustomer(''); setFilterOpen(false); }}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => nav('/sales/customer-refunds/add')}
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
              <th style={TH}>Customer</th>
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
              <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading customer refunds…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No customer refunds found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => nav(`/sales/customer-refunds/${r.id}`)}>
                <td style={{ ...TD, fontWeight: 600 }}>{r.refund_number}</td>
                <td style={TD}>{r.customer_name}</td>
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
  const [customer, setCustomer] = useState('');
  const [paidThrough, setPaidThrough] = useState('');
  const [amountRefunded, setAmountRefunded] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [description, setDescription] = useState('');

  const [customers, setCustomers] = useState<CustomerChoice[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingCreditNote[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const amountApplied = useMemo(
    () => Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0),
    [allocations],
  );
  const remaining = useMemo(() => (Number(amountRefunded) || 0) - amountApplied, [amountRefunded, amountApplied]);

  const fetchMeta = useCallback(async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/sales/customers/?page_size=200&active=true'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
      ]);
      setCustomers((cRes.data.results ?? []).map((c) => ({ id: c.id, company_name: c.company_name })));
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

  const fetchOutstanding = useCallback(async (customerId: string) => {
    if (!customerId) {
      setOutstanding([]);
      return;
    }
    try {
      const { data } = await api.get<{ results: OutstandingCreditNote[] }>(
        `/api/v1/sales/customer-refunds/outstanding-credit-notes/?customer=${encodeURIComponent(customerId)}`,
      );
      setOutstanding(data.results ?? []);
    } catch {
      setOutstanding([]);
    }
  }, []);

  const fetchRefund = useCallback(async () => {
    if (isCreate || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<CustomerRefund>(`/api/v1/sales/customer-refunds/${id}/`);
      setRefundId(data.id);
      setRefundNumber(data.refund_number ?? '');
      setCustomer(data.customer ?? '');
      setPaidThrough(data.paid_through ?? '');
      setAmountRefunded(data.amount_refunded ?? '');
      setRefundDate(data.refund_date ?? '');
      setDescription(data.description ?? '');
      const allocMap: Record<string, string> = {};
      (data.allocations ?? []).forEach((a) => { allocMap[a.credit_note] = a.amount; });
      setAllocations(allocMap);
      await fetchOutstanding(data.customer ?? '');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isCreate, fetchOutstanding]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    void fetchRefund();
  }, [fetchRefund]);

  useEffect(() => {
    if (customer) void fetchOutstanding(customer);
  }, [customer, fetchOutstanding]);

  function setAlloc(creditNoteId: string, val: string) {
    setAllocations((prev) => ({ ...prev, [creditNoteId]: val }));
  }

  async function save() {
    setError('');

    if ((Number(amountRefunded) || 0) <= 0) {
      setError('Amount refunded must be greater than 0.');
      return;
    }
    if (amountApplied > (Number(amountRefunded) || 0)) {
      setError('Total allocations cannot exceed amount refunded.');
      return;
    }
    for (const cn of outstanding) {
      const a = Number(allocations[cn.id] || 0);
      if (a > (Number(cn.balance_amount) || 0)) {
        setError(`Allocation exceeds credit note balance for ${cn.credit_note_number}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        refund_number: refundNumber,
        customer,
        paid_through: paidThrough,
        amount_refunded: amountRefunded,
        refund_date: refundDate,
        description,
        allocations: Object.entries(allocations)
          .filter(([, v]) => (Number(v) || 0) > 0)
          .map(([credit_note, amount]) => ({ credit_note, amount })),
      };

      const { data } = refundId
        ? await api.patch<CustomerRefund>(`/api/v1/sales/customer-refunds/${refundId}/`, body)
        : await api.post<CustomerRefund>('/api/v1/sales/customer-refunds/', body, {
            headers: { 'Idempotency-Key': customerRefundIdempotencyKey() },
          });

      setRefundId(data.id);
      nav('/sales/customer-refunds', { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRefund() {
    if (!refundId) return;
    if (!window.confirm('Delete this customer refund?')) return;
    try {
      await api.delete(`/api/v1/sales/customer-refunds/${refundId}/`);
      nav('/sales/customer-refunds');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  if (loading) return <div style={{ padding: '24px 28px', color: '#999', fontFamily: "'Heebo', sans-serif" }}>Loading…</div>;

  const TH: CSSProperties = {
    padding: '8px 10px', fontSize: 11.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '7px 10px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Record Customer Refund</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => nav('/sales/customer-refunds')} style={{ height: 32, paddingInline: 12, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: saving ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {refundId && (
              <button onClick={deleteRefund} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ margin: 12, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>{error}</div>}

        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
          <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #edf2f7', fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
              Basic Information
            </div>
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: '#555' }}>Customer*</span>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputSt}>
                <option value="">Select</option>
                {customers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>

              <span style={{ fontSize: 12.5, color: '#555' }}>Paid through*</span>
              <select value={paidThrough} onChange={(e) => setPaidThrough(e.target.value)} style={inputSt}>
                <option value="">Select</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>

              <span style={{ fontSize: 12.5, color: '#555' }}>Refund #*</span>
              <input value={refundNumber} onChange={(e) => setRefundNumber(e.target.value)} style={inputSt} placeholder="CRF-0001" />

              <span style={{ fontSize: 12.5, color: '#555' }}>Amount Refunded*</span>
              <input type="number" step="0.01" value={amountRefunded} onChange={(e) => setAmountRefunded(e.target.value)} style={inputSt} placeholder="Empty" />

              <span style={{ fontSize: 12.5, color: '#555' }}>Date*</span>
              <input type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} style={inputSt} />

              <span style={{ fontSize: 12.5, color: '#555' }}>Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputSt, height: 62, paddingTop: 8, resize: 'vertical' }} placeholder="Empty" />
            </div>
          </div>

          <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #edf2f7', fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
              Payment Details
            </div>
            <div style={{ padding: 12, display: 'grid', gap: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Credit note</th>
                    <th style={TH}>Date</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Refunded</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Payment to Apply</th>
                    <th style={{ ...TH, textAlign: 'right' }}>In SAR Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '18px 0', color: '#9ca3af', borderRight: 'none' }}>Select customer to fetch outstanding credit notes</td></tr>
                  ) : outstanding.map((cn) => (
                    <tr key={cn.id}>
                      <td style={TD}>{cn.credit_note_number}</td>
                      <td style={TD}>{cn.date}</td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(cn.total_amount)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(cn.refunded_amount)}</td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <input type="number" step="0.01" min={0} max={Number(cn.balance_amount)} value={allocations[cn.id] ?? ''} onChange={(e) => setAlloc(cn.id, e.target.value)} style={{ ...inputSt, height: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRight: 'none' }}>{fmt(allocations[cn.id] || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Amount to apply</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(amountApplied)}</span>

                <span style={{ fontSize: 13, color: '#666' }}>Amount paid</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(amountRefunded || 0)}</span>

                <span style={{ fontSize: 13, color: '#666' }}>Remaining</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: remaining >= 0 ? '#111827' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmt(remaining)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerRefunds() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <RefundEditor />;
  return <RefundsList />;
}

