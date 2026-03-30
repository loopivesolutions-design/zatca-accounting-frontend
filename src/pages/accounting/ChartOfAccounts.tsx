import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Lock, ChevronRight, ChevronDown,
  Plus, Download, Pencil, Trash2, X, Info, Folder, FolderOpen, Archive, ArchiveRestore,
} from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

// ── Types ─────────────────────────────────────────────────────────────────────
interface EditMetadata {
  has_transactions?: boolean;
  lock_reason?: string | null;
  locked_fields?: string[];
  editable_fields?: string[];
  balance?: number;
  balance_direction?: string;
  account_type_locked_by_balance?: boolean;
  zatca_mapping?: string | null;
}

interface Account {
  id: string;
  parent: string | null;
  parent_name: string | null;
  name: string;
  name_ar: string;
  code: string;
  cash_flow_type: string;
  cash_flow_type_display: string;
  account_type: string;
  account_type_display: string;
  account_sub_type?: string;
  zatca_mapping?: string;
  zatca_mapping_display?: string;
  enable_payment: boolean;
  show_in_expense_claim: boolean;
  is_locked: boolean;
  is_archived?: boolean;
  has_children: boolean;
  has_transactions?: boolean;
  edit_metadata?: EditMetadata;
}

interface DisplayRow extends Account {
  level: number;
  expanded: boolean;
  loadingChildren: boolean;
}

interface Choice   { value: string; label: string; }
interface ParentChoice { id: string; code: string; name: string; }
interface Choices {
  cash_flow_types: Choice[];
  account_types: Choice[];
  zatca_mappings?: Choice[];
  parent_accounts: ParentChoice[];
}

// ── Account-type colour palette ───────────────────────────────────────────────
const TYPE_PALETTE: Record<string, { bg: string; text: string; light: string; folder: string }> = {
  asset:     { bg: '#eef2ff', text: '#4f46e5', light: '#f5f7ff', folder: '#4f46e5' },
  liability: { bg: '#fff1f2', text: '#e11d48', light: '#fff7f8', folder: '#e11d48' },
  equity:    { bg: '#faf5ff', text: '#9333ea', light: '#fdfaff', folder: '#9333ea' },
  revenue:   { bg: '#f0fdf4', text: '#16a34a', light: '#f7fff9', folder: '#16a34a' },
  expense:   { bg: '#fff7ed', text: '#ea580c', light: '#fffbf5', folder: '#fb923c' },
};

function palette(type: string, light = false) {
  const p = TYPE_PALETTE[type] ?? { bg: '#f9fafb', text: '#374151', light: '#f9fafb', folder: '#374151' };
  return light ? p.light : p.bg;
}
function paletteText(type: string) {
  return (TYPE_PALETTE[type] ?? { text: '#374151' }).text;
}
function paletteFolder(type: string) {
  return (TYPE_PALETTE[type] ?? { folder: '#374151' }).folder;
}

// ── Tree helpers ──────────────────────────────────────────────────────────────
function insertAfter(rows: DisplayRow[], parentId: string, children: DisplayRow[]): DisplayRow[] {
  const idx = rows.findIndex((r) => r.id === parentId);
  if (idx === -1) return rows;
  return [...rows.slice(0, idx + 1), ...children, ...rows.slice(idx + 1)];
}

function removeDescendants(rows: DisplayRow[], parentId: string, parentLevel: number): DisplayRow[] {
  const idx = rows.findIndex((r) => r.id === parentId);
  if (idx === -1) return rows;
  let end = idx + 1;
  while (end < rows.length && rows[end].level > parentLevel) end++;
  return [...rows.slice(0, idx + 1), ...rows.slice(end)];
}

function toDisplayRow(a: Account, level: number): DisplayRow {
  return { ...a, level, expanded: false, loadingChildren: false };
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
interface AccountFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<Account>;
  choices: Choices | null;
  onClose: () => void;
  onSaved: (account: Account) => void;
}

function AccountModal({ mode, initial, choices, onClose, onSaved }: AccountFormProps) {
  const [parent,              setParent]              = useState(initial?.parent ?? '');
  const [name,                setName]                = useState(initial?.name ?? '');
  const [nameAr,              setNameAr]              = useState(initial?.name_ar ?? '');
  const [code,                setCode]                = useState(initial?.code ?? '');
  const [cashFlowType,        setCashFlowType]        = useState(initial?.cash_flow_type ?? '');
  const [accountType,         setAccountType]         = useState(initial?.account_type ?? '');
  const [accountSubType,      setAccountSubType]      = useState(initial?.account_sub_type ?? '');
  const [enablePayment,       setEnablePayment]       = useState(initial?.enable_payment ?? false);
  const [showInExpenseClaim,  setShowInExpenseClaim]  = useState(initial?.show_in_expense_claim ?? false);
  const [isArchived,          setIsArchived]          = useState(!!initial?.is_archived);
  const [meta,                setMeta]                = useState<EditMetadata | null>(initial?.edit_metadata ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !initial?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [accRes, emRes] = await Promise.all([
          api.get<Account>(`/api/v1/accounting/chart-of-accounts/${initial.id}/`),
          api.get<EditMetadata>(`/api/v1/accounting/chart-of-accounts/${initial.id}/edit-metadata/`),
        ]);
        if (cancelled) return;
        const a = accRes.data;
        setMeta(emRes.data);
        setParent(a.parent ?? '');
        setName(a.name);
        setNameAr(a.name_ar);
        setCode(a.code);
        setCashFlowType(a.cash_flow_type ?? '');
        setAccountType(a.account_type);
        setAccountSubType(a.account_sub_type ?? '');
        setEnablePayment(a.enable_payment);
        setShowInExpenseClaim(a.show_in_expense_claim);
        setIsArchived(!!a.is_archived);
      } catch {
        /* keep initial */
      }
    })();
    return () => { cancelled = true; };
  }, [mode, initial?.id]);

  const isSystemLocked = mode === 'edit' && !!initial?.is_locked;
  const hasTransactions = mode === 'edit' && !!initial?.has_transactions;
  const legacyStructural = isSystemLocked || hasTransactions;

  const locked = useMemo(() => {
    return (field: string) => {
      if (mode === 'create') return false;
      if (meta?.locked_fields?.length) return meta.locked_fields.includes(field);
      return ['parent', 'code', 'cash_flow_type', 'account_type'].includes(field) ? legacyStructural : false;
    };
  }, [mode, meta, legacyStructural]);

  const structuralLocked = locked('code');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);

    const body: Record<string, unknown> = mode === 'create'
      ? {
          parent: parent || null, name, name_ar: nameAr, code, cash_flow_type: cashFlowType || null,
          account_type: accountType, account_sub_type: accountSubType || undefined,
          enable_payment: enablePayment, show_in_expense_claim: showInExpenseClaim,
        }
      : {
          name, name_ar: nameAr,
          enable_payment: enablePayment, show_in_expense_claim: showInExpenseClaim,
        };

    if (mode === 'edit') {
      if (!locked('parent')) body.parent = parent || null;
      if (!locked('code')) body.code = code;
      if (!locked('cash_flow_type')) body.cash_flow_type = cashFlowType || null;
      if (!locked('account_type')) body.account_type = accountType;
      if (!locked('account_sub_type')) body.account_sub_type = accountSubType || null;
      if (meta?.editable_fields?.includes('is_archived')) body.is_archived = isArchived;
    }

    try {
      const { data } = mode === 'create'
        ? await api.post<Account>('/api/v1/accounting/chart-of-accounts/', body)
        : await api.patch<Account>(`/api/v1/accounting/chart-of-accounts/${initial!.id}/`, body);
      onSaved(data);
      onClose();
    } catch (err: unknown) {
      setError(parseApiError(err));
    } finally { setLoading(false); }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', height: 36, borderRadius: 7, border: '1.5px solid #e0e0e0',
    padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
    fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff', transition: 'border-color 0.15s',
  };
  const labelSt: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, color: '#555', marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '24px 28px 22px', width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', fontFamily: "'Heebo', sans-serif" }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
            {mode === 'create' ? 'Create Account' : 'Edit Account'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={18} /></button>
        </div>

        {/* Lock notice for edit mode */}
        {mode === 'edit' && (structuralLocked || meta?.lock_reason) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, backgroundColor: '#f8faff',
            border: '1px solid #e0e7ff', borderRadius: 7, padding: '10px 12px', marginBottom: 4 }}>
            <Lock size={13} style={{ color: '#818cf8', marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: '#4f46e5', lineHeight: 1.5 }}>
              {meta?.lock_reason === 'ZATCA_MAPPED'
                ? <><strong>ZATCA-mapped account</strong> — Structural fields are locked to protect VAT reports.</>
                : meta?.lock_reason === 'HAS_TRANSACTIONS' || hasTransactions
                  ? <><strong>Has transactions</strong> — Some fields are locked to protect historical records.</>
                  : isSystemLocked
                    ? <><strong>System account</strong> — Only permitted fields can be changed.</>
                    : <><strong>Restricted</strong> — Some fields are locked by policy.</>}
            </span>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {/* Parent Account */}
          {!locked('parent') && (
            <div>
              <label style={labelSt}>Parent Account<span style={{ color: '#35C0A3' }}>*</span></label>
              <select value={parent} onChange={(e) => setParent(e.target.value)}
                style={{ ...inputSt, cursor: 'pointer', color: parent ? '#1a1a1a' : '#aaa' }}
                onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
              >
                <option value="">Select</option>
                {choices?.parent_accounts.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Account Name EN + AR */}
          <div>
            <label style={labelSt}>Account Name<span style={{ color: '#35C0A3' }}>*</span></label>
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

          {/* Code */}
          <div>
            <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 4 }}>
              Code{!locked('code') && <span style={{ color: '#35C0A3' }}>*</span>}
              {locked('code')
                ? <Lock size={11} style={{ color: '#ccc' }} />
                : <span title="Unique numeric code for this account" style={{ display: 'inline-flex' }}><Info size={13} style={{ color: '#bbb', cursor: 'help' }} /></span>
              }
            </label>
            <input value={code} onChange={(e) => setCode(e.target.value)}
              required={!locked('code')} disabled={locked('code')} placeholder="e.g. 111"
              style={{ ...inputSt, ...(locked('code') ? { backgroundColor: '#f5f5f5', color: '#aaa', cursor: 'not-allowed' } : {}) }}
              onFocus={(e) => !locked('code') && (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
          </div>

          {/* Cash Flow Type */}
          <div>
            <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 4 }}>
              Cash flow type{!locked('cash_flow_type') && <span style={{ color: '#35C0A3' }}>*</span>}
              {locked('cash_flow_type') && <Lock size={11} style={{ color: '#ccc' }} />}
            </label>
            {locked('cash_flow_type') ? (
              <input value={cashFlowType || '—'} disabled
                style={{ ...inputSt, backgroundColor: '#f5f5f5', color: '#aaa', cursor: 'not-allowed' }} />
            ) : (
              <select value={cashFlowType} onChange={(e) => setCashFlowType(e.target.value)}
                style={{ ...inputSt, cursor: 'pointer' }}
                onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
              >
                <option value="">Select</option>
                {(choices?.cash_flow_types ?? [
                  { value: 'cash', label: 'Cash' },
                  { value: 'operating', label: 'Operating' },
                  { value: 'investing', label: 'Investing' },
                  { value: 'financing', label: 'Financing' },
                ]).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
          </div>

          {/* Account Type — create, or edit when metadata allows */}
          {!locked('account_type') && (
            <div>
              <label style={labelSt}>
                Account Type{mode === 'create' && <span style={{ color: '#35C0A3' }}>*</span>}
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                required={mode === 'create'}
                style={{ ...inputSt, cursor: 'pointer' }}
                onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
              >
                <option value="">Select</option>
                {(choices?.account_types ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}

          {/* Account sub-type */}
          {(mode === 'create' || (mode === 'edit' && !locked('account_sub_type'))) && (
            <div>
              <label style={labelSt}>Account sub-type</label>
              <input value={accountSubType} onChange={(e) => setAccountSubType(e.target.value)}
                placeholder="e.g. Cash and Cash Equivalents"
                style={inputSt}
                onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
            </div>
          )}

          {mode === 'edit' && meta?.editable_fields?.includes('is_archived') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={isArchived} onChange={(e) => setIsArchived(e.target.checked)}
                style={{ accentColor: '#35C0A3', width: 14, height: 14, cursor: 'pointer' }} />
              Archived (excluded from new transactions)
            </label>
          )}

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={enablePayment} onChange={(e) => setEnablePayment(e.target.checked)}
                style={{ accentColor: '#35C0A3', width: 14, height: 14, cursor: 'pointer' }} />
              Enable payment
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={showInExpenseClaim} onChange={(e) => setShowInExpenseClaim(e.target.checked)}
                style={{ accentColor: '#35C0A3', width: 14, height: 14, cursor: 'pointer' }} />
              Show in expense claim
            </label>
          </div>

          {/* Footer */}
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
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChartOfAccounts() {
  const [displayRows,  setDisplayRows]  = useState<DisplayRow[]>([]);
  const [searchRows,   setSearchRows]   = useState<Account[]>([]);
  const [search,       setSearch]       = useState('');
  const [searching,    setSearching]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [choices,      setChoices]      = useState<Choices | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editAccount,  setEditAccount]  = useState<Account | null>(null);
  const [exporting,    setExporting]    = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [activeCell,   setActiveCell]   = useState<{ rowId: string; col: string } | null>(null);
  const [cellDraft,    setCellDraft]    = useState('');
  const [cellSaving,   setCellSaving]   = useState<Set<string>>(new Set());
  const searchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  const EDIT_COLS = ['name', 'name_ar', 'cash_flow_type', 'enable_payment', 'show_in_expense_claim', 'is_archived'];
  function editableCols(acc: Account): string[] {
    const m = acc.edit_metadata;
    if (m?.editable_fields?.length) {
      return EDIT_COLS.filter((c) => m.editable_fields!.includes(c));
    }
    if (acc.is_locked) return ['name', 'name_ar'];
    return ['name', 'name_ar', 'cash_flow_type', 'enable_payment', 'show_in_expense_claim'];
  }

  function allRows(): Account[] {
    return (search.trim() ? searchRows : displayRows) as Account[];
  }

  async function commitCell(rowId: string, col: string, value: string | boolean) {
    const account = allRows().find((r) => r.id === rowId);
    if (!account) return;
    if ((account as unknown as Record<string, unknown>)[col] === value) return;
    const key = `${rowId}:${col}`;
    setCellSaving((prev) => new Set([...prev, key]));
    try {
      const { data } = await api.patch<Account>(
        `/api/v1/accounting/chart-of-accounts/${rowId}/`, { [col]: value }
      );
      setDisplayRows((prev) => prev.map((r) =>
        r.id === rowId ? {
          ...toDisplayRow(data, r.level),
          expanded: r.expanded,
          loadingChildren: r.loadingChildren,
          // preserve has_children — PATCH response may omit it
          has_children: data.has_children ?? r.has_children,
        } : r
      ));
      setSearchRows((prev) => prev.map((r) => r.id === rowId ? data : r));
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setCellSaving((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  }

  function activateCell(rowId: string, col: string) {
    const account = allRows().find((r) => r.id === rowId);
    if (!account || !editableCols(account).includes(col)) return;
    const raw = (account as unknown as Record<string, unknown>)[col];
    setActiveCell({ rowId, col });
    setCellDraft(typeof raw === 'boolean' ? String(raw) : (raw as string) ?? '');
  }

  function deactivateAndSave() {
    if (!activeCell) return;
    const { rowId, col } = activeCell;
    if (col !== 'enable_payment' && col !== 'show_in_expense_claim' && col !== 'is_archived') {
      const account = allRows().find((r) => r.id === rowId);
      if (account && cellDraft !== (account as unknown as Record<string, unknown>)[col]) {
        commitCell(rowId, col, cellDraft);
      }
    }
    setActiveCell(null);
    setCellDraft('');
  }

  function navigateCell(
    direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'shift-tab'
  ) {
    if (!activeCell) return;
    deactivateAndSave();                        // save current first
    const rows = allRows();
    const rowIdx = rows.findIndex((r) => r.id === activeCell.rowId);
    if (rowIdx === -1) return;
    const eCols = editableCols(rows[rowIdx]);
    const colIdx = eCols.indexOf(activeCell.col);

    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (direction === 'down' || direction === 'up') {
      const delta = direction === 'down' ? 1 : -1;
      for (let i = rowIdx + delta; direction === 'down' ? i < rows.length : i >= 0; i += delta) {
        if (editableCols(rows[i]).includes(activeCell.col)) { nextRow = i; break; }
      }
    } else if (direction === 'right' || direction === 'tab') {
      if (colIdx < eCols.length - 1) {
        nextCol = colIdx + 1;
      } else {
        for (let i = rowIdx + 1; i < rows.length; i++) {
          const ec = editableCols(rows[i]);
          if (ec.length) { nextRow = i; nextCol = 0; break; }
        }
      }
    } else if (direction === 'left' || direction === 'shift-tab') {
      if (colIdx > 0) {
        nextCol = colIdx - 1;
      } else {
        for (let i = rowIdx - 1; i >= 0; i--) {
          const ec = editableCols(rows[i]);
          if (ec.length) { nextRow = i; nextCol = ec.length - 1; break; }
        }
      }
    }

    const targetAcc = rows[nextRow];
    const targetCols = editableCols(targetAcc);
    if (targetCols[nextCol]) activateCell(targetAcc.id, targetCols[nextCol]);
  }

  function handleTableKeyDown(e: React.KeyboardEvent) {
    if (!activeCell) return;
    const isText = activeCell.col === 'name' || activeCell.col === 'name_ar';
    if (e.key === 'Escape') { e.preventDefault(); setActiveCell(null); setCellDraft(''); }
    else if (e.key === 'Enter')       { e.preventDefault(); navigateCell('down'); }
    else if (e.key === 'Tab')         { e.preventDefault(); navigateCell(e.shiftKey ? 'shift-tab' : 'tab'); }
    else if (e.key === 'ArrowDown')   { if (!isText) { e.preventDefault(); navigateCell('down');  } }
    else if (e.key === 'ArrowUp')     { if (!isText) { e.preventDefault(); navigateCell('up');    } }
    else if (e.key === 'ArrowRight')  { if (!isText) { e.preventDefault(); navigateCell('right'); } }
    else if (e.key === 'ArrowLeft')   { if (!isText) { e.preventDefault(); navigateCell('left');  } }
  }

  // ── Load root accounts ──────────────────────────────────────────────────────
  const loadRoots = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ root_only: 'true' });
      if (includeArchived) q.set('include_archived', 'true');
      const { data } = await api.get<Account[]>(`/api/v1/accounting/chart-of-accounts/tree/?${q}`);
      setDisplayRows(data.map((a) => toDisplayRow(a, 0)));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [includeArchived]);

  // ── Load choices for form ───────────────────────────────────────────────────
  const loadChoices = useCallback(async () => {
    try {
      const { data } = await api.get<Choices>('/api/v1/accounting/chart-of-accounts/choices/');
      setChoices(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadChoices(); }, []);
  useEffect(() => { void loadRoots(); }, [loadRoots]);

  const refreshData = useCallback(async () => {
    await loadRoots();
    if (search.trim()) {
      const q = new URLSearchParams({ search: search.trim(), page_size: '50' });
      if (includeArchived) q.set('include_archived', 'true');
      try {
        const { data } = await api.get<{ results: Account[] }>(`/api/v1/accounting/chart-of-accounts/?${q}`);
        setSearchRows(data.results ?? []);
      } catch {
        /* silent */
      }
    }
  }, [loadRoots, search, includeArchived]);

  // ── Search (debounced) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search.trim()) { setSearchRows([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const q = new URLSearchParams({
          search: search.trim(),
          page_size: '50',
        });
        if (includeArchived) q.set('include_archived', 'true');
        const { data } = await api.get<{ results: Account[] }>(
          `/api/v1/accounting/chart-of-accounts/?${q}`
        );
        setSearchRows(data.results ?? []);
      } catch { setSearchRows([]); }
      finally { setSearching(false); }
    }, 350);
  }, [search, includeArchived]);

  const isSearching = search.trim().length > 0;

  // ── Expand / collapse ───────────────────────────────────────────────────────
  async function toggleRow(rowId: string) {
    const row = displayRows.find((r) => r.id === rowId);
    if (!row) return;

    if (row.expanded) {
      setDisplayRows((prev) =>
        removeDescendants(prev, rowId, row.level).map((r) =>
          r.id === rowId ? { ...r, expanded: false } : r
        )
      );
      return;
    }

    // Mark as loading
    setDisplayRows((prev) => prev.map((r) => r.id === rowId ? { ...r, loadingChildren: true } : r));

    try {
      const childQ = includeArchived ? '?include_archived=true' : '';
      const { data } = await api.get<Account[]>(`/api/v1/accounting/chart-of-accounts/${rowId}/children/${childQ}`);
      const children = data.map((a) => toDisplayRow(a, row.level + 1));
      setDisplayRows((prev) =>
        insertAfter(
          prev.map((r) => r.id === rowId ? { ...r, expanded: true, loadingChildren: false } : r),
          rowId,
          children
        )
      );
    } catch {
      setDisplayRows((prev) => prev.map((r) => r.id === rowId ? { ...r, loadingChildren: false } : r));
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function deleteAccount(id: string) {
    if (!window.confirm('Delete this account?')) return;
    try {
      await api.delete(`/api/v1/accounting/chart-of-accounts/${id}/`);
      setDisplayRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (!row) return prev;
        const pruned = removeDescendants(prev, id, row.level);
        return pruned.filter((r) => r.id !== id);
      });
    } catch (err: unknown) {
      alert(parseApiError(err));
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const exportQs = includeArchived ? '?include_archived=true' : '';
      const { data, headers } = await api.get(
        `/api/v1/accounting/chart-of-accounts/export/${exportQs}`,
        { responseType: 'blob' },
      );
      const contentDisposition = headers['content-disposition'] ?? '';
      const fileName = contentDisposition.match(/filename="?(.+)"?/)?.[1] ?? 'chart_of_accounts.csv';
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
    finally { setExporting(false); }
  }

  // ── After create/edit ───────────────────────────────────────────────────────
  function onAccountSaved(account: Account) {
    const existing = displayRows.find((r) => r.id === account.id);
    if (existing) {
      // Edit: update in-place
      setDisplayRows((prev) => prev.map((r) => r.id === account.id ? { ...toDisplayRow(account, r.level), expanded: r.expanded } : r));
    } else {
      // Create: reload tree to reflect correct position
      loadRoots();
    }
  }

  // ── Render row ──────────────────────────────────────────────────────────────
  const INDENT = 20;

  function cellStyle(
    account: Account, col: string, base: React.CSSProperties = {}
  ): React.CSSProperties {
    const isActive  = activeCell?.rowId === account.id && activeCell?.col === col;
    const isSaving  = cellSaving.has(`${account.id}:${col}`);
    const canEdit   = editableCols(account).includes(col);
    return {
      ...base,
      position: 'relative',
      outline: isActive ? '2px solid #35C0A3' : 'none',
      outlineOffset: -2,
      borderRight: base.borderRight ?? '1px solid rgba(0,0,0,0.06)',
      backgroundColor: isActive
        ? '#f0fdf9'
        : isSaving
          ? '#fffbea'
          : base.backgroundColor,
      cursor: canEdit ? 'cell' : 'default',
      userSelect: 'none' as const,
    };
  }

  function renderRow(account: Account, level = 0, isDisplayRow = false, displayRow?: DisplayRow) {
    const isRoot    = level === 0;
    const rowBg     = isRoot ? palette(account.account_type) : palette(account.account_type, true);
    const textColor   = paletteText(account.account_type);
    const folderColor = paletteFolder(account.account_type);
    const canExpand = account.has_children;
    const dr        = displayRow;
    const isRowActive = activeCell?.rowId === account.id;

    // ── inline cell helpers ─────────────────────────────────────────────────
    function nameCell() {
      const isActive = isRowActive && activeCell?.col === 'name';
      const canEdit  = editableCols(account).includes('name');
      return (
        <td
          style={cellStyle(account, 'name', { padding: '0' })}
          onClick={() => canEdit && !isActive && activateCell(account.id, 'name')}
        >
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: level * INDENT }}>
            {/* Expand toggle */}
            <span
              style={{ width: 20, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', cursor: canExpand ? 'pointer' : 'default', flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); canExpand && isDisplayRow && toggleRow(account.id); }}
            >
              {canExpand && (
                dr?.loadingChildren
                  ? <span style={{ fontSize: 10, color: '#aaa' }}>…</span>
                  : dr?.expanded
                    ? <ChevronDown size={13} style={{ color: textColor }} />
                    : <ChevronRight size={13} style={{ color: '#888' }} />
              )}
            </span>
            {(isRoot || canExpand || dr?.expanded) && (
              <span style={{ marginRight: 5, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                {(isDisplayRow && dr?.expanded)
                  ? <FolderOpen size={15} fill="none" style={{ color: folderColor }} />
                  : <Folder     size={15} fill={folderColor}       style={{ color: folderColor, strokeWidth: 2 }} />
                }
              </span>
            )}
            {isActive ? (
              <input
                autoFocus
                value={cellDraft}
                onChange={(e) => setCellDraft(e.target.value)}
                onBlur={() => deactivateAndSave()}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
                  fontSize: 13.5, fontFamily: "'Heebo', sans-serif",
                  color: isRoot ? textColor : '#333', fontWeight: isRoot ? 600 : 400,
                  padding: '9px 4px 9px 0', minWidth: 0 }}
              />
            ) : (
              <span style={{ fontSize: 13.5, color: isRoot ? textColor : '#333',
                fontWeight: isRoot ? 600 : 400, padding: '9px 4px 9px 0', flex: 1 }}>
                {account.name}
              </span>
            )}
          </div>
        </td>
      );
    }

    function nameArCell() {
      const isActive = isRowActive && activeCell?.col === 'name_ar';
      const canEdit = editableCols(account).includes('name_ar');
      return (
        <td
          style={cellStyle(account, 'name_ar', { padding: '0' })}
          onClick={() => canEdit && !isActive && activateCell(account.id, 'name_ar')}
        >
          {isActive ? (
            <input
              autoFocus
              dir="rtl"
              value={cellDraft}
              onChange={(e) => setCellDraft(e.target.value)}
              onBlur={() => deactivateAndSave()}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: 13.5,
                fontFamily: "'Heebo', sans-serif",
                color: '#555',
                padding: '9px 10px',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <span
              dir="rtl"
              style={{ display: 'block', fontSize: 13.5, color: account.name_ar ? '#555' : '#ddd', padding: '9px 10px' }}
            >
              {account.name_ar || '–'}
            </span>
          )}
        </td>
      );
    }

    function cashFlowCell() {
      const isActive = isRowActive && activeCell?.col === 'cash_flow_type';
      const canEdit  = editableCols(account).includes('cash_flow_type');
      const cfTypes  = choices?.cash_flow_types ?? [
        { value: 'cash', label: 'Cash' }, { value: 'operating', label: 'Operating' },
        { value: 'investing', label: 'Investing' }, { value: 'financing', label: 'Financing' },
      ];
      return (
        <td
          style={cellStyle(account, 'cash_flow_type', { padding: '9px 14px', fontSize: 13, textAlign: 'center' })}
          onClick={() => canEdit && !isActive && activateCell(account.id, 'cash_flow_type')}
        >
          {isActive ? (
            <select
              autoFocus
              value={cellDraft}
              onChange={(e) => {
                setCellDraft(e.target.value);
                commitCell(account.id, 'cash_flow_type', e.target.value);
              }}
              onBlur={() => { setActiveCell(null); setCellDraft(''); }}
              onClick={(e) => e.stopPropagation()}
              style={{ border: 'none', outline: 'none', backgroundColor: 'transparent',
                fontSize: 13, fontFamily: "'Heebo', sans-serif", color: '#333',
                cursor: 'pointer', width: '100%' }}
            >
              <option value="">—</option>
              {cfTypes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          ) : (
            account.cash_flow_type_display
              ? <span style={{ color: '#555' }}>{account.cash_flow_type_display}</span>
              : <span style={{ color: canEdit ? '#bbb' : '#ddd' }}>–</span>
          )}
        </td>
      );
    }

    function boolCell(col: 'enable_payment' | 'show_in_expense_claim' | 'is_archived') {
      const val = account[col] as boolean;
      const canEdit = editableCols(account).includes(col);
      return (
        <td
          style={cellStyle(account, col, { padding: '9px 14px', textAlign: 'center' })}
          onClick={(e) => {
            e.stopPropagation();
            if (!canEdit) return;
            const newVal = !val;
            // Optimistic update
            setDisplayRows((prev) => prev.map((r) =>
              r.id === account.id ? { ...r, [col]: newVal } : r
            ));
            setSearchRows((prev) => prev.map((r) =>
              r.id === account.id ? { ...r, [col]: newVal } : r
            ));
            commitCell(account.id, col, newVal);
          }}
        >
          {val
            ? <span style={{ color: '#35C0A3', fontSize: 15, cursor: canEdit ? 'pointer' : 'default' }}>✓</span>
            : <span style={{ color: canEdit ? '#ccc' : '#eee',
                fontSize: 14, cursor: canEdit ? 'pointer' : 'default' }}>–</span>
          }
        </td>
      );
    }

    return (
      <tr
        key={account.id}
        style={{
          backgroundColor: rowBg,
          borderBottom: isRowActive ? '1px solid #35C0A320' : '1px solid rgba(0,0,0,0.05)',
          outline: isRowActive ? '1.5px solid #35C0A360' : 'none',
        }}
        onMouseEnter={(e) => { if (!isRowActive) (e.currentTarget as HTMLTableRowElement).style.filter = 'brightness(0.97)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.filter = ''; }}
      >
        {/* Lock */}
        <td style={{ width: 32, paddingLeft: 10, textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          {account.is_locked && <Lock size={12} style={{ color: '#aaa' }} />}
        </td>

        {/* Code */}
        <td style={{ padding: '9px 12px', fontSize: 13,
          color: isRoot ? textColor : '#555', fontWeight: isRoot ? 600 : 400, width: 80, borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          {account.code}
        </td>

        {/* Account Name — inline text */}
        {nameCell()}

        {/* Arabic name — inline */}
        {nameArCell()}

        {/* Cash flow type — inline select */}
        {cashFlowCell()}

        {/* Enable payment — toggle */}
        {boolCell('enable_payment')}

        {/* Show in expense claim — toggle */}
        {boolCell('show_in_expense_claim')}

        {/* Archived */}
        {boolCell('is_archived')}

        {/* Account type — read-only badge */}
        <td style={{ padding: '9px 14px', fontSize: 12.5, textAlign: 'center', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          {account.account_type_display
            ? <span style={{ color: textColor, backgroundColor: rowBg, borderRadius: 5,
                padding: '2px 8px', border: `1px solid ${textColor}30`, fontWeight: 500 }}>
                {account.account_type_display}
              </span>
            : <span style={{ color: '#ccc' }}>–</span>}
        </td>

        {/* Actions */}
        <td style={{ padding: '9px 12px', textAlign: 'right', width: 70, borderRight: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
            opacity: isRowActive ? 1 : 0, transition: 'opacity 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
          >
            <button onClick={(e) => { e.stopPropagation(); setEditAccount(account); }}
              title="Full edit"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#35C0A3',
                padding: 2, display: 'flex', alignItems: 'center' }}>
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                    void (async () => {
                  try {
                    if (account.is_archived) {
                      await api.post(`/api/v1/accounting/chart-of-accounts/${account.id}/unarchive/`);
                    } else {
                      await api.post(`/api/v1/accounting/chart-of-accounts/${account.id}/archive/`);
                    }
                    await refreshData();
                  } catch (err) {
                    alert(parseApiError(err));
                  }
                })();
              }}
              title={account.is_archived ? 'Unarchive' : 'Archive'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                padding: 2, display: 'flex', alignItems: 'center' }}
            >
              {account.is_archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteAccount(account.id); }}
              title="Delete"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171',
                padding: 2, display: 'flex', alignItems: 'center' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const COL_HEADER: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12.5, fontWeight: 500, color: '#888',
    textAlign: 'center', borderBottom: '1px solid #efefef', borderRight: '1px solid #e9ecef', backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleTableKeyDown}
      onClick={(e) => {
        // deactivate if clicking outside a cell (e.g. the table background)
        if ((e.target as HTMLElement).tagName === 'TABLE' ||
            (e.target as HTMLElement).tagName === 'TBODY') {
          setActiveCell(null); setCellDraft('');
        }
      }}
      style={{ fontFamily: "'Heebo', sans-serif", outline: 'none' }}
    >

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            style={{ paddingLeft: 30, paddingRight: 12, height: 34, borderRadius: 7, border: '1px solid #e8e8e8', fontSize: 13.5, color: '#333', outline: 'none', fontFamily: "'Heebo', sans-serif", width: 220, backgroundColor: '#fff' }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e8e8e8')}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} style={{ accentColor: '#35C0A3' }} />
            Include archived
          </label>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 16, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}
          >
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 18, borderRadius: 7, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...COL_HEADER, width: 32 }} />
              <th style={{ ...COL_HEADER, textAlign: 'left', width: 80 }}>Code</th>
              <th style={{ ...COL_HEADER, textAlign: 'left' }}>Account Name</th>
              <th style={{ ...COL_HEADER, textAlign: 'left' }}>Name (AR)</th>
              <th style={COL_HEADER}>Cash flow type</th>
              <th style={COL_HEADER}>Enable payment</th>
              <th style={COL_HEADER}>Show in expense claim</th>
              <th style={COL_HEADER}>Archived</th>
              <th style={COL_HEADER}>Account type</th>
              <th style={{ ...COL_HEADER, width: 96 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading accounts…</td></tr>
            ) : isSearching ? (
              searching ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Searching…</td></tr>
              ) : searchRows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No results for "{search}"</td></tr>
              ) : (
                searchRows.map((a) => renderRow(a, 0))
              )
            ) : displayRows.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No accounts found.</td></tr>
            ) : (
              displayRows.map((dr) => renderRow(dr, dr.level, true, dr))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreate && (
        <AccountModal mode="create" choices={choices} onClose={() => setShowCreate(false)} onSaved={onAccountSaved} />
      )}
      {editAccount && (
        <AccountModal mode="edit" initial={editAccount} choices={choices} onClose={() => setEditAccount(null)} onSaved={onAccountSaved} />
      )}
    </div>
  );
}
