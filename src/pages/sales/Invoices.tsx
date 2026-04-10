import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';
import { ZatcaSubmissionLogsPanel, type ZatcaSubmissionLogRow } from '../../components/ZatcaSubmissionLogsPanel';

function invoiceIdempotencyKey() {
  return crypto.randomUUID();
}

type InvoiceStatus = 'draft' | 'confirmed' | 'posted' | 'reported' | 'paid' | 'partially_paid' | 'overdue';
type ZatcaSubmissionStatus = 'not_submitted' | 'pending' | 'reported' | 'cleared' | 'rejected' | 'failed';

interface Choice { id: string; label: string; }
interface CustomerChoice { id: string; company_name: string; }
interface TaxRateChoice { id: string; name: string; rate: string; }
interface ProductChoice { id: string; code: string; name: string; }
interface AccountChoice { id: string; code: string; name: string; }

interface InvoiceListRow {
  id: string;
  invoice_number: string;
  customer: string;
  customer_name: string;
  date: string;
  due_date: string | null;
  status: InvoiceStatus;
  status_display: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceLine {
  id?: string;
  product: string | null;
  description: string;
  account: string | null;
  quantity: string;
  unit_price: string;
  tax_rate: string | null;
  discount_percent: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  external_reference?: string | null;
  customer: string;
  customer_name: string;
  date: string;
  due_date: string | null;
  note: string;
  attachment: string | null;
  status: InvoiceStatus;
  status_display: string;
  posted_at: string | null;
  qr_code_text: string | null;
  zatca_uuid?: string | null;
  zatca_previous_hash?: string | null;
  zatca_invoice_hash?: string | null;
  zatca_signed_hash?: string | null;
  zatca_submission_status?: ZatcaSubmissionStatus | string;
  zatca_submission_type?: string | null;
  zatca_submission_reference?: string | null;
  zatca_submission_error?: string | null;
  zatca_submitted_at?: string | null;
  zatca_cleared_at?: string | null;
  zatca_submission_logs?: ZatcaSubmissionLogRow[];
  journal_entry: string | null;
  subtotal: string;
  total_vat: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  issuer_details?: {
    company_name?: string;
    street_address?: string;
    vat_registration_number?: string;
    logo?: string | null;
  };
  lines: InvoiceLine[];
  created_at: string;
  updated_at: string;
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

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function statusPill(status: InvoiceStatus) {
  let bg = '#f3f4f6';
  let color = '#374151';
  let label = status.replace('_', ' ').toUpperCase();
  if (status === 'confirmed') { bg = '#fef9c3'; color = '#854d0e'; label = 'CONFIRMED'; }
  if (status === 'posted') { bg = '#dbeafe'; color = '#1d4ed8'; label = 'POSTED'; }
  if (status === 'reported') { bg = '#d1fae5'; color = '#065f46'; label = 'REPORTED'; }
  if (status === 'paid') { bg = '#dcfce7'; color = '#16a34a'; label = 'PAID'; }
  if (status === 'partially_paid') { bg = '#e9d5ff'; color = '#7e22ce'; label = 'PARTIALLY PAID'; }
  if (status === 'overdue') { bg = '#fee2e2'; color = '#dc2626'; label = 'OVERDUE'; }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, paddingInline: 8, borderRadius: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, backgroundColor: bg, color }}>
      {label}
    </span>
  );
}

function InvoicesList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customer, setCustomer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statuses, setStatuses] = useState<Choice[]>([]);
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
      const [iRes, cRes] = await Promise.all([
        api.get<{ statuses?: Choice[]; invoice_statuses?: Choice[] }>('/api/v1/sales/invoices/choices/'),
        api.get<{ results: any[] }>('/api/v1/sales/customers/?page_size=200&active=true'),
      ]);
      setStatuses(iRes.data.statuses ?? iRes.data.invoice_statuses ?? [
        { id: 'draft', label: 'Draft' },
        { id: 'confirmed', label: 'Confirmed' },
        { id: 'reported', label: 'Reported' },
        { id: 'paid', label: 'Paid' },
        { id: 'partially_paid', label: 'Partially paid' },
        { id: 'overdue', label: 'Overdue' },
      ]);
      setCustomers((cRes.data.results ?? []).map((c) => ({ id: c.id, company_name: c.company_name })));
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
      if (customer) params.set('customer', customer);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get<{ count: number; results: InvoiceListRow[] }>(`/api/v1/sales/invoices/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, status, customer, dateFrom, dateTo]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, status, customer, dateFrom, dateTo, fetchRows]);

  const TH: CSSProperties = {
    padding: '10px 10px', fontSize: 12, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '9px 10px', fontSize: 12.5, color: '#333',
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
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Status</div>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Customer</div>
                  <select value={customer} onChange={(e) => setCustomer(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Date from</div>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputSt, height: 34 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Date to</div>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputSt, height: 34 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setStatus(''); setCustomer(''); setDateFrom(''); setDateTo(''); setFilterOpen(false); }}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => nav('/sales/invoices/add')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Status</th>
              <th style={TH}>Invoice #</th>
              <th style={TH}>Customer</th>
              <th style={TH}>Date</th>
              <th style={TH}>Due Date</th>
              <th style={{ ...TH, textAlign: 'right' }}>Total</th>
              <th style={{ ...TH, textAlign: 'right' }}>Paid</th>
              <th style={{ ...TH, textAlign: 'right' }}>Balance</th>
              <th style={{ ...TH, borderRight: 'none' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading invoices…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No invoices found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => nav(`/sales/invoices/${r.id}`)}>
                <td style={TD}>{statusPill(r.status)}</td>
                <td style={{ ...TD, fontWeight: 600 }}>{r.invoice_number}</td>
                <td style={TD}>{r.customer_name}</td>
                <td style={TD}>{r.date}</td>
                <td style={TD}>{r.due_date || '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_amount)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.paid_amount)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.balance_amount)}</td>
                <td style={{ ...TD, borderRight: 'none' }}>{r.created_at?.replace('T', ' ').slice(0, 16) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{rows.length} shown · {total} total</span>
          </div>
        )}
      </div>
    </div>
  );
}

function InvoicesEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = id === 'add';
  const nav = useNavigate();

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [invoiceId, setInvoiceId] = useState<string | null>(isCreate ? null : id || null);
  const [status, setStatus] = useState<InvoiceStatus>('draft');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [customer, setCustomer] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [priceMode, setPriceMode] = useState<'inc_tax' | 'ex_tax'>('inc_tax');
  const [postNotice, setPostNotice] = useState('');
  const [zatcaSubmitting, setZatcaSubmitting] = useState(false);
  const [zatcaVerifying, setZatcaVerifying] = useState(false);
  const [zatcaSubmissionType, setZatcaSubmissionType] = useState<'clearance' | 'reporting'>('clearance');
  const [zatcaVerifyResult, setZatcaVerifyResult] = useState<{ stored_hash: string; computed_hash: string; is_valid: boolean } | null>(null);
  const [zatcaSubmissionLogs, setZatcaSubmissionLogs] = useState<ZatcaSubmissionLogRow[]>([]);
  const [lines, setLines] = useState<InvoiceLine[]>([
    { product: null, description: '', account: null, quantity: '1', unit_price: '', tax_rate: null, discount_percent: '0' },
  ]);

  const [customers, setCustomers] = useState<CustomerChoice[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateChoice[]>([]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [issuer, setIssuer] = useState<InvoiceDetail['issuer_details'] | null>(null);
  const [invoiceQrFromApi, setInvoiceQrFromApi] = useState('');
  const [zatcaDetail, setZatcaDetail] = useState<Partial<Pick<InvoiceDetail,
    'zatca_uuid' | 'zatca_invoice_hash' | 'zatca_submission_status' | 'zatca_submission_type' |
    'zatca_submission_reference' | 'zatca_submission_error' | 'zatca_submitted_at' | 'zatca_cleared_at'
  >> | null>(null);

  const canEdit = status === 'draft';

  const subtotal = useMemo(
    () => lines.reduce((acc, l) => acc + ((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)), 0),
    [lines],
  );
  const totalVat = useMemo(() => lines.reduce((acc, l) => {
    const gross = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
    const disc = Number(l.discount_percent) || 0;
    const afterDisc = gross - (gross * disc / 100);
    const rate = Number(taxRates.find((t) => t.id === l.tax_rate)?.rate ?? 0);
    return acc + (afterDisc * rate / 100);
  }, 0), [lines, taxRates]);
  const total = subtotal + totalVat;

  const fetchMeta = useCallback(async () => {
    try {
      const [cRes, tRes, pRes, aRes, iChoicesRes, csRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/sales/customers/?page_size=200&active=true'),
        api.get<{ results: any[] }>('/api/v1/accounting/tax-rates/?page_size=200&active=true&tax_type=sales'),
        api.get<{ results: any[] }>('/api/v1/products/items/?page_size=200&active=true'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
        api.get<{ next_number?: string }>('/api/v1/sales/invoices/choices/'),
        api.get<{ company_name?: string; street_address?: string; vat_registration_number?: string; logo?: string | null }>('/api/v1/main/company-settings/'),
      ]);
      setCustomers((cRes.data.results ?? []).map((c) => ({ id: c.id, company_name: c.company_name })));
      setTaxRates((tRes.data.results ?? []).map((t) => ({ id: t.id, name: t.name, rate: t.rate })));
      setProducts((pRes.data.results ?? []).map((p) => ({ id: p.id, code: p.code ?? '', name: p.name ?? '' })));
      if (isCreate && iChoicesRes.data.next_number) {
        setInvoiceNumber(iChoicesRes.data.next_number);
      }
      if (isCreate) {
        setDate((prev) => prev || todayISODate());
      }
      if (isCreate) {
        const cs = csRes.data;
        setIssuer({ company_name: cs.company_name, street_address: cs.street_address, vat_registration_number: cs.vat_registration_number, logo: cs.logo ?? null });
      }
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
  }, [isCreate]);

  const fetchInvoice = useCallback(async () => {
    if (isCreate || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<InvoiceDetail>(`/api/v1/sales/invoices/${id}/`);
      setInvoiceId(data.id);
      setStatus(data.status);
      setInvoiceNumber(data.invoice_number ?? '');
      setCustomer(data.customer ?? '');
      setDate(data.date ?? '');
      setDueDate(data.due_date ?? '');
      setNote(data.note ?? '');
      if (data.attachment) setAttachmentNames([data.attachment]);
      else setAttachmentNames([]);
      setIssuer(data.issuer_details ?? null);
      setInvoiceQrFromApi(data.qr_code_text ?? '');
      setZatcaDetail({
        zatca_uuid: data.zatca_uuid,
        zatca_invoice_hash: data.zatca_invoice_hash,
        zatca_submission_status: data.zatca_submission_status,
        zatca_submission_type: data.zatca_submission_type,
        zatca_submission_reference: data.zatca_submission_reference,
        zatca_submission_error: data.zatca_submission_error,
        zatca_submitted_at: data.zatca_submitted_at,
        zatca_cleared_at: data.zatca_cleared_at,
      });
      setZatcaSubmissionLogs(data.zatca_submission_logs ?? []);
      setPostNotice('');
      setZatcaVerifyResult(null);
      setLines((data.lines ?? []).map((l) => ({
        id: l.id,
        product: l.product ?? null,
        description: l.description ?? '',
        account: l.account ?? null,
        quantity: String(l.quantity ?? ''),
        unit_price: String(l.unit_price ?? ''),
        tax_rate: l.tax_rate ?? null,
        discount_percent: String(l.discount_percent ?? '0'),
      })));
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isCreate]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  function setLine(idx: number, patch: Partial<InvoiceLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { product: null, description: '', account: null, quantity: '1', unit_price: '', tax_rate: null, discount_percent: '0' }]);
  }
  function clearLine(idx: number) {
    setLines((prev) => prev.map((l, i) => i === idx ? { product: null, description: '', account: null, quantity: '1', unit_price: '', tax_rate: null, discount_percent: '0' } : l));
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }

  async function saveDraft(navigateAfterCreate = true): Promise<string | null> {
    if (!canEdit) return null;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        invoice_number: invoiceNumber,
        customer,
        date: date || todayISODate(),
        due_date: dueDate || null,
        note,
        lines: lines.map((l) => ({
          product: l.product || null,
          description: l.description,
          account: l.account || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate || null,
          discount_percent: l.discount_percent || '0',
        })),
      };
      if (externalReference.trim()) body.external_reference = externalReference.trim();
      else body.external_reference = '';

      const idem = { headers: { 'Idempotency-Key': invoiceIdempotencyKey() } };
      const { data } = invoiceId
        ? await api.patch<InvoiceDetail>(`/api/v1/sales/invoices/${invoiceId}/`, body, idem)
        : await api.post<InvoiceDetail>('/api/v1/sales/invoices/', body, idem);

      if (attachmentFiles.length > 0 && data.id) {
        for (const file of attachmentFiles) {
          const fd = new FormData();
          fd.append('attachment', file);
          await api.patch(`/api/v1/sales/invoices/${data.id}/`, fd, {
            headers: { 'Idempotency-Key': invoiceIdempotencyKey() },
          });
        }
        setAttachmentFiles([]);
      }

      setInvoiceId(data.id);
      setStatus(data.status);
      setExternalReference(data.external_reference ?? '');
      setIssuer(data.issuer_details ?? null);
      setInvoiceQrFromApi(data.qr_code_text ?? '');
      setZatcaDetail({
        zatca_uuid: data.zatca_uuid,
        zatca_invoice_hash: data.zatca_invoice_hash,
        zatca_submission_status: data.zatca_submission_status,
        zatca_submission_type: data.zatca_submission_type,
        zatca_submission_reference: data.zatca_submission_reference,
        zatca_submission_error: data.zatca_submission_error,
        zatca_submitted_at: data.zatca_submitted_at,
        zatca_cleared_at: data.zatca_cleared_at,
      });
      setZatcaSubmissionLogs(data.zatca_submission_logs ?? []);
      if (navigateAfterCreate) nav('/sales/invoices', { replace: true });
      return data.id;
    } catch (err) {
      setError(parseApiError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function confirmAndPost() {
    let targetId = invoiceId;
    if (!targetId) {
      targetId = await saveDraft(false);
      if (!targetId) return;
      setInvoiceId(targetId);
    }
    setPosting(true);
    setError('');
    setPostNotice('');
    try {
      const response = await api.post<InvoiceDetail>(
        `/api/v1/sales/invoices/${targetId}/post/`,
        {},
        { headers: { 'Idempotency-Key': invoiceIdempotencyKey() } },
      );
      if (response.status === 202) {
        setPostNotice('This invoice was submitted for approval. Confirmation will complete after approval (maker–checker).');
        nav('/sales/invoices', { replace: true });
        return;
      }
      nav('/sales/invoices', { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setPosting(false);
    }
  }

  async function submitZatca() {
    if (!invoiceId || !['confirmed', 'posted', 'reported'].includes(status)) return;
    setZatcaSubmitting(true);
    setError('');
    try {
      const { data } = await api.post<InvoiceDetail>(
        `/api/v1/sales/invoices/${invoiceId}/zatca/submit/`,
        { submission_type: zatcaSubmissionType },
        { headers: { 'Idempotency-Key': invoiceIdempotencyKey() } },
      );
      if (data.status) setStatus(data.status);
      setZatcaDetail({
        zatca_uuid: data.zatca_uuid,
        zatca_invoice_hash: data.zatca_invoice_hash,
        zatca_submission_status: data.zatca_submission_status,
        zatca_submission_type: data.zatca_submission_type,
        zatca_submission_reference: data.zatca_submission_reference,
        zatca_submission_error: data.zatca_submission_error,
        zatca_submitted_at: data.zatca_submitted_at,
        zatca_cleared_at: data.zatca_cleared_at,
      });
      setZatcaSubmissionLogs(data.zatca_submission_logs ?? []);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setZatcaSubmitting(false);
    }
  }

  async function verifyZatcaHash() {
    if (!invoiceId || !['confirmed', 'posted', 'reported'].includes(status)) return;
    setZatcaVerifying(true);
    setError('');
    setZatcaVerifyResult(null);
    try {
      const { data } = await api.get<{ stored_hash: string; computed_hash: string; is_valid: boolean }>(
        `/api/v1/sales/invoices/${invoiceId}/zatca/verify/`,
      );
      setZatcaVerifyResult(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setZatcaVerifying(false);
    }
  }

  async function deleteInvoice() {
    if (!invoiceId) return;
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/api/v1/sales/invoices/${invoiceId}/`, {
        headers: { 'Idempotency-Key': invoiceIdempotencyKey() },
      });
      nav('/sales/invoices');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  if (loading) return <div style={{ padding: '24px 28px', color: '#999', fontFamily: "'Heebo', sans-serif" }}>Loading…</div>;

  const TH: CSSProperties = {
    padding: '8px 8px', fontSize: 11.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#eef8dc', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '6px 8px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Create Invoice</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statusPill(status)}
            <button onClick={() => nav('/sales/invoices')} style={{ height: 32, paddingInline: 12, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
            {canEdit && (
              <button onClick={() => { void saveDraft(); }} disabled={saving}
                style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #d1f1e7', backgroundColor: '#f0fdf9', color: '#0f766e', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5 }}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            )}
            {canEdit && (
              <button onClick={confirmAndPost} disabled={posting}
                style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: posting ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: posting ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                {posting ? 'Confirming…' : 'Confirm'}
              </button>
            )}
            {invoiceId && canEdit && (
              <button onClick={deleteInvoice} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {postNotice && (
          <div style={{ margin: 12, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>{postNotice}</div>
        )}
        {error && <div style={{ margin: 12, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)', gap: 14, padding: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#111827', gridColumn: '1 / span 2' }}>Invoice <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}># {invoiceNumber || 'INV-10101'}</span></span>
              <span style={{ fontSize: 12.5, color: '#555' }}>Customer*</span>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }}>
                <option value="">Select</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              <span style={{ fontSize: 12.5, color: '#555' }}>Date*</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />
              <span style={{ fontSize: 12.5, color: '#555' }}>Due Date*</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />
              <span style={{ fontSize: 12.5, color: '#555' }}>Invoice #</span>
              <input value={invoiceNumber} readOnly style={{ ...inputSt, backgroundColor: '#f5f5f5', color: '#888', cursor: 'default' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div />
              <select value={priceMode} onChange={(e) => setPriceMode(e.target.value as 'inc_tax' | 'ex_tax')} disabled={!canEdit}
                style={{ ...inputSt, width: 130, height: 28, fontSize: 11.5, color: '#666' }}>
                <option value="inc_tax">Price are inc.tax</option>
                <option value="ex_tax">Price are ex.tax</option>
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Description*</th>
                  <th style={TH}>Account*</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Qty*</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Price</th>
                  <th style={TH}>Tax Rate</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Discount</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  <th style={{ ...TH, width: 36, borderRight: 'none' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx}>
                    <td style={TD}>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <select value={l.product ?? ''} onChange={(e) => {
                          const p = products.find((x) => x.id === e.target.value);
                          setLine(idx, { product: e.target.value || null, description: p ? `${p.code} - ${p.name}` : l.description });
                        }} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                          <option value="">Select product</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ''}{p.name}</option>)}
                        </select>
                        <input value={l.description} onChange={(e) => setLine(idx, { description: e.target.value })} disabled={!canEdit}
                          style={{ ...inputSt, height: 30 }} placeholder="Description or search item" />
                      </div>
                    </td>
                    <td style={TD}>
                      <select value={l.account ?? ''} onChange={(e) => setLine(idx, { account: e.target.value || null })} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                        <option value="">Required</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} /></td>
                    <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(idx, { unit_price: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} placeholder="Required" /></td>
                    <td style={TD}>
                      <select value={l.tax_rate ?? ''} onChange={(e) => setLine(idx, { tax_rate: e.target.value || null })} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                        <option value="">Required</option>
                        {taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({fmt(t.rate)}%)</option>)}
                      </select>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.discount_percent} onChange={(e) => setLine(idx, { discount_percent: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} /></td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {(() => {
                        const qty = Number(l.quantity) || 0;
                        const price = Number(l.unit_price) || 0;
                        const disc = Number(l.discount_percent) || 0;
                        const gross = qty * price;
                        const afterDisc = gross - (gross * disc / 100);
                        const rate = Number(taxRates.find((t) => t.id === l.tax_rate)?.rate ?? 0);
                        const tax = afterDisc * rate / 100;
                        const lineTotal = priceMode === 'inc_tax' ? afterDisc : afterDisc + tax;
                        return fmt(String(lineTotal));
                      })()}
                    </td>
                    <td style={{ ...TD, borderRight: 'none' }}>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => clearLine(idx)} type="button" style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#666', cursor: 'pointer', fontSize: 11 }}>↺</button>
                          <button onClick={() => removeLine(idx)} type="button" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {canEdit && (
                <button onClick={addLine} type="button" style={{ height: 30, paddingInline: 12, borderRadius: 7, border: '1px solid #bbf7e8', backgroundColor: '#f0fdf9', color: '#0f766e', cursor: 'pointer', fontSize: 12.5 }}>
                  + Add line
                </button>
              )}
              <div />
            </div>

            <div>
              <div style={{ fontSize: 12.5, color: '#555', marginBottom: 6 }}>Note</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!canEdit} style={{ ...inputSt, minHeight: 64, height: 64, paddingTop: 8, resize: 'vertical' }} placeholder="Empty" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>Issuer Details</div>
              {issuer?.logo ? (
                <img src={issuer.logo} alt="Issuer logo" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }} />
              ) : null}
              <div style={{ fontSize: 12.5, color: '#111827', fontWeight: 600 }}>{issuer?.company_name || 'Your Company Name'}</div>
              {issuer?.street_address && <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>{issuer.street_address}</div>}
              <div style={{ fontSize: 11.5, color: '#6b7280' }}>VAT: {issuer?.vat_registration_number || '-'}</div>
            </div>

            <div style={{ border: '1.5px dashed #d1d5db', borderRadius: 12, backgroundColor: '#f9fafb', padding: '12px 10px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: '#666', marginBottom: 10 }}>Attachments</div>
              {(attachmentNames.length > 0 || attachmentFiles.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {attachmentNames.map((name, i) => (
                    <div key={`saved-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#374151', maxWidth: '100%' }}>
                      <UploadCloud size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
                      <span style={{ wordBreak: 'break-all' }}>{name.split('/').pop()}</span>
                    </div>
                  ))}
                  {attachmentFiles.map((file, i) => (
                    <div key={`new-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#fff', border: '1px solid #d1fae5', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#374151', maxWidth: '100%' }}>
                      <UploadCloud size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ wordBreak: 'break-all' }}>{file.name}</span>
                      {canEdit && (
                        <button onClick={() => setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== i))} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <label style={{ width: '100%', minHeight: attachmentNames.length + attachmentFiles.length > 0 ? 60 : 120, borderRadius: 10, border: '1px dashed #d1d5db', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', textAlign: 'center', padding: 12, boxSizing: 'border-box' }}>
                  <UploadCloud size={18} style={{ marginBottom: 6 }} />
                  <span style={{ fontSize: 12, lineHeight: 1.6 }}>Click to add more files</span>
                  <input type="file" multiple style={{ display: 'none' }} onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) setAttachmentFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>

            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>ZATCA</div>
              {!['confirmed', 'posted', 'reported'].includes(status) ? (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>QR and submission tools appear after the invoice is confirmed.</div>
              ) : (
                <>
                  {invoiceQrFromApi ? (
                    <div style={{ marginBottom: 10, fontSize: 11.5, color: '#374151', wordBreak: 'break-all', lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 500, color: '#6b7280' }}>QR payload</span>
                      <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 11 }}>{invoiceQrFromApi.length > 280 ? `${invoiceQrFromApi.slice(0, 280)}…` : invoiceQrFromApi}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>No QR payload yet.</div>
                  )}
                  <div style={{ display: 'grid', gap: 6, fontSize: 12, color: '#4b5563', marginBottom: 10 }}>
                    <div><span style={{ color: '#9ca3af' }}>Submission status</span>{' '}
                      <strong>{String(zatcaDetail?.zatca_submission_status ?? 'not_submitted')}</strong>
                      {zatcaDetail?.zatca_submission_type ? ` (${zatcaDetail.zatca_submission_type})` : ''}
                    </div>
                    {zatcaDetail?.zatca_uuid ? <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#9ca3af' }}>UUID</span> {zatcaDetail.zatca_uuid}</div> : null}
                    {zatcaDetail?.zatca_submission_reference ? <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#9ca3af' }}>Reference</span> {zatcaDetail.zatca_submission_reference}</div> : null}
                    {zatcaDetail?.zatca_submission_error ? <div style={{ color: '#b91c1c' }}>{zatcaDetail.zatca_submission_error}</div> : null}
                  </div>
                  {['cleared', 'reported'].includes(String(zatcaDetail?.zatca_submission_status ?? '')) || status === 'reported' ? null : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <select
                        value={zatcaSubmissionType}
                        onChange={(e) => setZatcaSubmissionType(e.target.value as 'clearance' | 'reporting')}
                        style={{ ...inputSt, width: 140, height: 32 }}
                      >
                        <option value="clearance">Clearance</option>
                        <option value="reporting">Reporting</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => { void submitZatca(); }}
                        disabled={zatcaSubmitting}
                        style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: zatcaSubmitting ? '#a8e4d8' : '#1d4ed8', color: '#fff', cursor: zatcaSubmitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        {zatcaSubmitting ? 'Submitting…' : 'Submit to ZATCA'}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { void verifyZatcaHash(); }}
                    disabled={zatcaVerifying}
                    style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#374151', cursor: zatcaVerifying ? 'not-allowed' : 'pointer', fontSize: 13 }}
                  >
                    {zatcaVerifying ? 'Verifying…' : 'Verify hash integrity'}
                  </button>
                  {zatcaVerifyResult ? (
                    <div style={{ marginTop: 10, fontSize: 12, color: zatcaVerifyResult.is_valid ? '#15803d' : '#b91c1c' }}>
                      {zatcaVerifyResult.is_valid ? 'Hash matches stored XML.' : 'Hash mismatch — see stored vs computed.'}
                      <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 10.5, wordBreak: 'break-all', color: '#6b7280' }}>
                        Stored: {zatcaVerifyResult.stored_hash}<br />
                        Computed: {zatcaVerifyResult.computed_hash}
                      </div>
                    </div>
                  ) : null}
                  <ZatcaSubmissionLogsPanel logs={zatcaSubmissionLogs} />
                </>
              )}
            </div>

            <div style={{ textAlign: 'right', fontSize: 12.5, color: '#555', lineHeight: 1.8, paddingTop: 8 }}>
              <div>Subtotal <span style={{ marginLeft: 12, minWidth: 90, display: 'inline-block', textAlign: 'right' }}>{fmt(subtotal)}</span></div>
              <div>Total VAT <span style={{ marginLeft: 12, minWidth: 90, display: 'inline-block', textAlign: 'right' }}>{fmt(totalVat)}</span></div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: '#111827' }}>Total <span style={{ fontSize: 18, marginLeft: 8 }}>SAR {fmt(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <InvoicesEditor />;
  return <InvoicesList />;
}

