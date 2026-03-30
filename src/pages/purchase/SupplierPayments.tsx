import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

function supplierPaymentIdempotencyKey() {
  return crypto.randomUUID();
}

type PaymentType = 'bill_payment' | 'advance_payment';

interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier: string;
  supplier_name: string;
  paid_through: string;
  paid_through_code: string;
  paid_through_name: string;
  payment_type: PaymentType;
  payment_type_display: string;
  amount_paid: string;
  payment_date: string;
  description: string;
  is_posted: boolean;
  journal_entry?: string | null;
  amount_applied: string;
  remaining_amount: string;
  allocations: { bill: string; amount: string }[];
  created_at: string;
  updated_at: string;
}

interface SupplierChoice { id: string; company_name: string; }
interface AccountChoice { id: string; code: string; name: string; }
interface OutstandingBill {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: string;
  paid_amount: string;
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

function PaymentsList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<SupplierPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('');
  const [paymentType, setPaymentType] = useState('');
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
    } catch {
      /* silent */
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (supplier) params.set('supplier', supplier);
      if (paymentType) params.set('payment_type', paymentType);
      const { data } = await api.get<{ count: number; results: SupplierPayment[] }>(`/api/v1/purchases/supplier-payments/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, supplier, paymentType]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, supplier, paymentType, fetchRows]);

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
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Supplier</div>
                  <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Payment Type</div>
                  <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    <option value="bill_payment">Bill Payments</option>
                    <option value="advance_payment">Advance Payments</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setSupplier(''); setPaymentType(''); setFilterOpen(false); }}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => nav('/purchase/supplier-payments/add')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Payment #</th>
              <th style={TH}>Supplier</th>
              <th style={TH}>Paid Through</th>
              <th style={TH}>Type</th>
              <th style={{ ...TH, textAlign: 'right' }}>Amount Paid</th>
              <th style={{ ...TH, textAlign: 'right' }}>Applied</th>
              <th style={{ ...TH, textAlign: 'right' }}>Remaining</th>
              <th style={TH}>Date</th>
              <th style={TH}>Posted</th>
              <th style={{ ...TH, borderRight: 'none' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading supplier payments…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No supplier payments found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => nav(`/purchase/supplier-payments/${r.id}`)}>
                <td style={{ ...TD, fontWeight: 600 }}>{r.payment_number}</td>
                <td style={TD}>{r.supplier_name}</td>
                <td style={TD}>{r.paid_through_code} - {r.paid_through_name}</td>
                <td style={TD}>{r.payment_type_display}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount_paid)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount_applied)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.remaining_amount)}</td>
                <td style={TD}>{r.payment_date}</td>
                <td style={TD}>{r.is_posted ? 'Yes' : 'No'}</td>
                <td style={{ ...TD, borderRight: 'none' }}>{r.created_at?.replace('T', ' ').slice(0, 16) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{total} {total === 1 ? 'payment' : 'payments'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = id === 'add';
  const nav = useNavigate();

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [paymentId, setPaymentId] = useState<string | null>(isCreate ? null : id || null);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [paidThrough, setPaidThrough] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('bill_payment');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [description, setDescription] = useState('');

  const [suppliers, setSuppliers] = useState<SupplierChoice[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingBill[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<{ id: PaymentType; label: string }[]>([
    { id: 'bill_payment', label: 'Bill Payments' },
    { id: 'advance_payment', label: 'Advance Payments' },
  ]);

  const amountApplied = useMemo(
    () => Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0),
    [allocations],
  );
  const remaining = useMemo(() => (Number(amountPaid) || 0) - amountApplied, [amountPaid, amountApplied]);

  const fetchMeta = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/purchases/suppliers/?page_size=200&active=true'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
      ]);
      setSuppliers((sRes.data.results ?? []).map((s) => ({ id: s.id, company_name: s.company_name })));
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

  const fetchOutstanding = useCallback(async (supplierId: string, paymentTypeOverride?: PaymentType) => {
    const pt = paymentTypeOverride ?? paymentType;
    if (!supplierId || pt !== 'bill_payment') {
      setOutstanding([]);
      return;
    }
    try {
      const { data } = await api.get<{
        results: OutstandingBill[];
        payment_types?: { id: string; label: string }[];
      }>(`/api/v1/purchases/supplier-payments/outstanding-bills/?supplier=${encodeURIComponent(supplierId)}`);
      setOutstanding(data.results ?? []);
      if (data.payment_types?.length) {
        setPaymentTypeOptions(
          data.payment_types.map((p) => ({ id: p.id as PaymentType, label: p.label })),
        );
      }
    } catch {
      setOutstanding([]);
    }
  }, [paymentType]);

  const fetchPayment = useCallback(async () => {
    if (isCreate || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<SupplierPayment>(`/api/v1/purchases/supplier-payments/${id}/`);
      setPaymentId(data.id);
      setPaymentNumber(data.payment_number ?? '');
      setSupplier(data.supplier ?? '');
      setPaidThrough(data.paid_through ?? '');
      setPaymentType(data.payment_type ?? 'bill_payment');
      setAmountPaid(data.amount_paid ?? '');
      setPaymentDate(data.payment_date ?? '');
      setDescription(data.description ?? '');
      const allocMap: Record<string, string> = {};
      (data.allocations ?? []).forEach((a) => { allocMap[a.bill] = a.amount; });
      setAllocations(allocMap);
      await fetchOutstanding(data.supplier ?? '', data.payment_type ?? 'bill_payment');
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
    void fetchPayment();
  }, [fetchPayment]);

  useEffect(() => {
    if (supplier) void fetchOutstanding(supplier);
  }, [supplier, paymentType, fetchOutstanding]);

  function setAlloc(billId: string, val: string) {
    setAllocations((prev) => ({ ...prev, [billId]: val }));
  }

  async function save() {
    setError('');

    if ((Number(amountPaid) || 0) <= 0) {
      setError('Amount paid must be greater than 0.');
      return;
    }
    if (paymentType === 'bill_payment') {
      if (amountApplied > (Number(amountPaid) || 0)) {
        setError('Total allocations cannot exceed amount paid.');
        return;
      }
      for (const b of outstanding) {
        const a = Number(allocations[b.id] || 0);
        if (a > (Number(b.balance_amount) || 0)) {
          setError(`Allocation exceeds bill balance for ${b.bill_number}.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        payment_number: paymentNumber,
        supplier,
        paid_through: paidThrough,
        payment_type: paymentType,
        amount_paid: amountPaid,
        payment_date: paymentDate,
        description,
      };
      if (paymentType === 'bill_payment') {
        body.allocations = Object.entries(allocations)
          .filter(([, v]) => (Number(v) || 0) > 0)
          .map(([bill, amount]) => ({ bill, amount }));
      }

      const { data } = paymentId
        ? await api.patch<SupplierPayment>(`/api/v1/purchases/supplier-payments/${paymentId}/`, body)
        : await api.post<SupplierPayment>('/api/v1/purchases/supplier-payments/', body, {
            headers: { 'Idempotency-Key': supplierPaymentIdempotencyKey() },
          });

      if (!id || id === 'add') nav(`/purchase/supplier-payments/${data.id}`, { replace: true });
      setPaymentId(data.id);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment() {
    if (!paymentId) return;
    if (!window.confirm('Delete this supplier payment?')) return;
    try {
      await api.delete(`/api/v1/purchases/supplier-payments/${paymentId}/`);
      nav('/purchase/supplier-payments');
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
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Record Supplier Payment / Advance</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => nav('/purchase/supplier-payments')} style={{ height: 32, paddingInline: 12, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: saving ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {paymentId && (
              <button onClick={deletePayment} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <span style={{ fontSize: 12.5, color: '#555' }}>Supplier*</span>
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={inputSt}>
                <option value="">Select</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>

              <span style={{ fontSize: 12.5, color: '#555' }}>Paid through*</span>
              <select value={paidThrough} onChange={(e) => setPaidThrough(e.target.value)} style={inputSt}>
                <option value="">Select</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>

              <span style={{ fontSize: 12.5, color: '#555' }}>Payment #*</span>
              <input value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)} style={inputSt} placeholder="SP-0001" />

              <span style={{ fontSize: 12.5, color: '#555' }}>Amount Paid*</span>
              <input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} style={inputSt} placeholder="Empty" />

              <span style={{ fontSize: 12.5, color: '#555' }}>Date*</span>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={inputSt} />

              <span style={{ fontSize: 12.5, color: '#555' }}>Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputSt, height: 62, paddingTop: 8, resize: 'vertical' }} placeholder="Empty" />
            </div>
          </div>

          <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #edf2f7', fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
              Payment Details
            </div>
            <div style={{ padding: 12, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: '#555' }}>Payment Type*</span>
                {paymentTypeOptions.map((opt) => (
                  <label key={opt.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                    <input
                      type="radio"
                      checked={paymentType === opt.id}
                      onChange={() => setPaymentType(opt.id)}
                      style={{ accentColor: '#35C0A3' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Bill</th>
                    <th style={TH}>Date</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Balance</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Payment to Apply</th>
                    <th style={{ ...TH, borderRight: 'none' }} />
                  </tr>
                </thead>
                <tbody>
                  {paymentType === 'advance_payment' ? (
                    <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '18px 0', color: '#9ca3af', borderRight: 'none' }}>Advance payment selected. Bill allocations are ignored.</td></tr>
                  ) : outstanding.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '18px 0', color: '#9ca3af', borderRight: 'none' }}>Select supplier to fetch outstanding bills</td></tr>
                  ) : outstanding.map((b) => (
                    <tr key={b.id}>
                      <td style={TD}>{b.bill_number}</td>
                      <td style={TD}>{b.bill_date}</td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.total_amount)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.balance_amount)}</td>
                      <td style={{ ...TD, textAlign: 'right' }}>
                        <input type="number" step="0.01" min={0} max={Number(b.balance_amount)} value={allocations[b.id] ?? ''} onChange={(e) => setAlloc(b.id, e.target.value)} style={{ ...inputSt, height: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
                      </td>
                      <td style={{ ...TD, borderRight: 'none' }} />
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Amount to apply</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(amountApplied)}</span>

                <span style={{ fontSize: 13, color: '#666' }}>Amount paid</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(amountPaid || 0)}</span>

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

export default function SupplierPayments() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PaymentEditor />;
  return <PaymentsList />;
}

