import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, X, ArrowUpDown, SlidersHorizontal, Copy, ChevronDown, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  parent: string | null;
  parent_name: string | null;
  product_count: number;
  has_children: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryChoice {
  id: string;
  name: string;
  name_ar: string;
  parent: string | null;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 7, border: '1.5px solid #e0e0e0',
  padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
  fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff', transition: 'border-color 0.15s',
};
const labelSt: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 500, color: '#555', marginBottom: 4, display: 'block',
};

// ── Category Form Modal (Create & Edit) ───────────────────────────────────────
interface CategoryModalProps {
  mode: 'create' | 'edit';
  initial?: Category;
  onClose: () => void;
  onSaved: (cat: Category) => void;
}

function CategoryModal({ mode, initial, onClose, onSaved }: CategoryModalProps) {
  const [name,        setName]        = useState(initial?.name ?? '');
  const [nameAr,      setNameAr]      = useState(initial?.name_ar ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [parent,      setParent]      = useState(initial?.parent ?? '');
  const [isActive,    setIsActive]    = useState(initial?.is_active ?? true);
  const [choices,     setChoices]     = useState<CategoryChoice[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    setName(initial?.name ?? '');
    setNameAr(initial?.name_ar ?? '');
    setDescription(initial?.description ?? '');
    setParent(initial?.parent ?? '');
    setIsActive(initial?.is_active ?? true);
  }, [mode, initial?.id]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (mode === 'edit' && initial?.id) params.set('exclude', initial.id);
    api.get<CategoryChoice[]>(`/api/v1/products/categories/choices/?${params}`)
      .then(({ data }) => setChoices(data))
      .catch(() => {/* silent */});
  }, [mode, initial?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const body = {
      name, name_ar: nameAr, description,
      parent: parent || null,
      is_active: isActive,
    };
    try {
      const { data } = mode === 'create'
        ? await api.post<Category>('/api/v1/products/categories/', body)
        : await api.patch<Category>(`/api/v1/products/categories/${initial!.id}/`, body);
      onSaved(data);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally { setLoading(false); }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '24px 28px 22px',
        width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', fontFamily: "'Heebo', sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
            {mode === 'create' ? 'Create Category' : 'Edit Category'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b',
            borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Category Name EN + AR */}
          <div>
            <label style={labelSt}>Category Name<span style={{ color: '#35C0A3' }}>*</span></label>
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

          {/* Description */}
          <div>
            <label style={labelSt}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description"
              style={inputSt}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')} />
          </div>

          {/* Parent Category */}
          <div>
            <label style={labelSt}>Parent Category</label>
            <select value={parent} onChange={(e) => setParent(e.target.value)}
              style={{ ...inputSt, cursor: 'pointer', color: '#1a1a1a' }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
            >
              <option value="">None (Top Level)</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#fafafa', borderRadius: 8, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#333', margin: 0 }}>Active</p>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                Inactive categories are hidden from product forms
              </p>
            </div>
            <button type="button" onClick={() => setIsActive((p) => !p)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                backgroundColor: isActive ? '#35C0A3' : '#d1d5db', position: 'relative',
                transition: 'background-color 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.2s',
                left: isActive ? 21 : 3,
              }} />
            </button>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ height: 36, paddingInline: 18, borderRadius: 8, border: '1px solid #e0e0e0',
                backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer',
                fontFamily: "'Heebo', sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ height: 36, paddingInline: 24, borderRadius: 8, border: 'none',
                backgroundColor: loading ? '#a8e4d8' : '#35C0A3', color: '#fff',
                fontSize: 13.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Heebo', sans-serif" }}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
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

// ── Sort & Filter types ────────────────────────────────────────────────────────
type SortKey    = 'name_asc' | 'name_desc' | 'newest' | 'oldest';
type ActiveFilter = 'all' | 'active' | 'inactive';

const SORT_LABELS: Record<SortKey, string> = {
  name_asc:  'Name A → Z',
  name_desc: 'Name Z → A',
  newest:    'Newest first',
  oldest:    'Oldest first',
};
const FILTER_LABELS: Record<ActiveFilter, string> = {
  all:      'All',
  active:   'Active only',
  inactive: 'Inactive only',
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductCategories() {
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [sortKey,       setSortKey]       = useState<SortKey>('name_asc');
  const [activeFilter,  setActiveFilter]  = useState<ActiveFilter>('all');
  const [sortOpen,      setSortOpen]      = useState(false);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [showCreate,    setShowCreate]    = useState(false);
  const [editCat,       setEditCat]       = useState<Category | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [hoveredRow,    setHoveredRow]    = useState<string | null>(null);
  const [bulkLoading,   setBulkLoading]   = useState(false);
  const [showBulkDel,   setShowBulkDel]   = useState(false);
  const [statusDropOpen,setStatusDropOpen]= useState(false);
  const [parentChoices, setParentChoices] = useState<CategoryChoice[]>([]);
  const [activeCell,    setActiveCell]    = useState<{ rowId: string; col: EditCol } | null>(null);
  const [cellDraft,     setCellDraft]     = useState('');
  const [cellSaving,    setCellSaving]    = useState<Set<string>>(new Set());
  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortRef      = useRef<HTMLDivElement>(null);
  const filterRef    = useRef<HTMLDivElement>(null);
  const statusDropRef= useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLDivElement>(null);

  type EditCol = 'name' | 'name_ar' | 'description' | 'parent' | 'is_active';
  const EDIT_COLS: EditCol[] = ['name', 'name_ar', 'description', 'parent', 'is_active'];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current      && !sortRef.current.contains(e.target as Node))      setSortOpen(false);
      if (filterRef.current    && !filterRef.current.contains(e.target as Node))    setFilterOpen(false);
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node)) setStatusDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Parent choices for inline "Parent" selector (active only)
  useEffect(() => {
    api.get<CategoryChoice[]>('/api/v1/products/categories/choices/')
      .then(({ data }) => setParentChoices(data ?? []))
      .catch(() => {/* silent */});
  }, []);

  async function bulkAction(action: 'delete' | 'duplicate' | 'set_status', extra?: { status?: string }) {
    setBulkLoading(true);
    try {
      const body: Record<string, unknown> = { action, ids: Array.from(selected), ...extra };
      const { data } = await api.post<{
        message: string;
        deleted?: number; skipped?: { id: string; name: string; reason: string; detail: string }[];
        created?: number; categories?: { id: string; name: string; copied_from: string }[];
        updated?: number;
      }>('/api/v1/products/categories/bulk/', body);

      if (action === 'delete') {
        const skippedIds = new Set((data.skipped ?? []).map((s) => s.id));
        setCategories((prev) => prev.filter((c) => !selected.has(c.id) || skippedIds.has(c.id)));
        setSelected(new Set(skippedIds));
        if ((data.skipped ?? []).length > 0) {
          const names = (data.skipped ?? []).map((s) => `• ${s.name}: ${s.detail}`).join('\n');
          alert(`${data.message}\n\nSkipped:\n${names}`);
        }
      } else if (action === 'set_status') {
        const isActive = extra?.status === 'active';
        setCategories((prev) =>
          prev.map((c) => selected.has(c.id) ? { ...c, is_active: isActive } : c)
        );
        setSelected(new Set());
      } else if (action === 'duplicate') {
        await fetchCategories(search, activeFilter);
        setSelected(new Set());
      }
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setBulkLoading(false);
      setShowBulkDel(false);
      setStatusDropOpen(false);
    }
  }

  const fetchCategories = useCallback(async (q = '', af: ActiveFilter = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (q.trim()) params.set('search', q.trim());
      if (af === 'active')   params.set('active', 'true');
      if (af === 'inactive') params.set('active', 'false');
      const { data } = await api.get<{ count: number; results: Category[] }>(
        `/api/v1/products/categories/?${params}`
      );
      setCategories(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories('', activeFilter); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCategories(search, activeFilter), 320);
  }, [search, activeFilter]);

  // Client-side sort applied to whatever the API returned
  const sorted = [...categories].sort((a, b) => {
    if (sortKey === 'name_asc')  return a.name.localeCompare(b.name);
    if (sortKey === 'name_desc') return b.name.localeCompare(a.name);
    if (sortKey === 'newest')    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    /* oldest */                 return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  function cellKey(rowId: string, col: EditCol) {
    return `${rowId}__${col}`;
  }

  function activateCell(rowId: string, col: EditCol, seed?: string) {
    setActiveCell({ rowId, col });
    setCellDraft(seed ?? '');
    requestAnimationFrame(() => tableRef.current?.focus());
  }

  async function commitCell(rowId: string, col: EditCol, value: string) {
    const key = cellKey(rowId, col);
    setCellSaving((prev) => new Set(prev).add(key));
    try {
      const body: Record<string, unknown> = {};
      if (col === 'parent') body.parent = value ? value : null;
      else if (col === 'is_active') body.is_active = value === 'true';
      else body[col] = value;

      const { data } = await api.patch<Category>(`/api/v1/products/categories/${rowId}/`, body);
      setCategories((prev) => prev.map((c) => (c.id === rowId ? data : c)));
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setCellSaving((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  }

  function deactivateAndSave() {
    if (!activeCell) return;
    const row = sorted.find((r) => r.id === activeCell.rowId);
    if (!row) { setActiveCell(null); return; }

    const { col } = activeCell;
    const current =
      col === 'parent' ? (row.parent ?? '') :
      col === 'is_active' ? String(row.is_active) :
      (row[col] ?? '');

    if (cellDraft !== current) {
      void commitCell(activeCell.rowId, col, cellDraft);
    }
    setActiveCell(null);
  }

  function navigateCell(dir: 'left' | 'right' | 'up' | 'down') {
    if (!activeCell) return;
    const rowIdx = sorted.findIndex((r) => r.id === activeCell.rowId);
    if (rowIdx === -1) return;
    const colIdx = EDIT_COLS.indexOf(activeCell.col);
    if (colIdx === -1) return;

    let nextRow = rowIdx;
    let nextCol = colIdx;
    if (dir === 'left')  nextCol = Math.max(0, colIdx - 1);
    if (dir === 'right') nextCol = Math.min(EDIT_COLS.length - 1, colIdx + 1);
    if (dir === 'up')    nextRow = Math.max(0, rowIdx - 1);
    if (dir === 'down')  nextRow = Math.min(sorted.length - 1, rowIdx + 1);

    const next = sorted[nextRow];
    const nc = EDIT_COLS[nextCol];
    const seed =
      nc === 'parent' ? (next.parent ?? '') :
      nc === 'is_active' ? String(next.is_active) :
      (next[nc] ?? '');
    setActiveCell({ rowId: next.id, col: nc });
    setCellDraft(seed);
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

    // Don't hijack arrows while typing in a field
    if (!isFormEl) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateCell('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateCell('right'); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); navigateCell('up'); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); navigateCell('down'); }
    }
  }

  async function openEdit(cat: Category) {
    try {
      const { data } = await api.get<Category>(`/api/v1/products/categories/${cat.id}/`);
      setEditCat(data);
    } catch { setEditCat(cat); }
  }

  async function deleteCategory(cat: Category) {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      await api.delete(`/api/v1/products/categories/${cat.id}/`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setSelected((prev) => { const s = new Set(prev); s.delete(cat.id); return s; });
    } catch (err) {
      alert(parseApiError(err));
    } finally { setDeletingId(null); }
  }

  function onSaved(updated: Category) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      return idx === -1 ? [updated, ...prev] : prev.map((c) => c.id === updated.id ? updated : c);
    });
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((c) => c.id)));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // ── Column header style ────────────────────────────────────────────────────
  const TH: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef', backgroundColor: '#fafafa',
    whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5', verticalAlign: 'middle',
  };
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
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%',
      overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>

      {/* ── Bulk action bar (shown when rows are selected) ── */}
      {selected.size > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          backgroundColor: '#f0fdf9', border: '1px solid #a7f3d0', borderRadius: 10,
          padding: '8px 14px', fontFamily: "'Heebo', sans-serif" }}>
          {/* Deselect */}
          <button onClick={() => setSelected(new Set())}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#35C0A3' }}>
            <X size={16} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0d9488' }}>Bulk Action</span>
          <span style={{ fontSize: 13, color: '#666' }}>
            {selected.size} {selected.size === 1 ? 'Product/Service' : 'Products/Services'} Selected
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Make a copy */}
            <button
              disabled={bulkLoading}
              onClick={() => bulkAction('duplicate')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14,
                borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff',
                color: '#555', fontSize: 13.5, cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontFamily: "'Heebo', sans-serif", opacity: bulkLoading ? 0.6 : 1 }}>
              <Copy size={14} /> Make a copy
            </button>

            {/* Set Status as dropdown */}
            <div ref={statusDropRef} style={{ position: 'relative' }}>
              <button
                disabled={bulkLoading}
                onClick={() => setStatusDropOpen((o) => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14,
                  borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff',
                  color: '#555', fontSize: 13.5, cursor: bulkLoading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Heebo', sans-serif", opacity: bulkLoading ? 0.6 : 1 }}>
                Set Status as <ChevronDown size={13} />
              </button>
              {statusDropOpen && (
                <div style={{ position: 'absolute', top: 40, right: 0, zIndex: 40, backgroundColor: '#fff',
                  border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                  minWidth: 130, overflow: 'hidden', fontFamily: "'Heebo', sans-serif" }}>
                  {(['active', 'inactive'] as const).map((s) => (
                    <button key={s}
                      onClick={() => bulkAction('set_status', { status: s })}
                      style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none',
                        textAlign: 'left', backgroundColor: '#fff', color: '#333',
                        fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
                        textTransform: 'capitalize' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              disabled={bulkLoading}
              onClick={() => setShowBulkDel(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14,
                borderRadius: 8, border: '1px solid #fca5a5', backgroundColor: '#fff5f5',
                color: '#dc2626', fontSize: 13.5, cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontFamily: "'Heebo', sans-serif", opacity: bulkLoading ? 0.6 : 1 }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ) : (
      /* ── Normal toolbar ── */
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, borderRadius: 8,
              border: '1px solid #e0e0e0', fontSize: 13.5, color: '#333', outline: 'none',
              backgroundColor: '#fff', fontFamily: "'Heebo', sans-serif" }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* ── Sort dropdown ── */}
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setSortOpen((o) => !o); setFilterOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14,
                borderRadius: 8, border: `1px solid ${sortKey !== 'name_asc' ? '#35C0A3' : '#e0e0e0'}`,
                backgroundColor: sortKey !== 'name_asc' ? '#f0fdf9' : '#fff',
                color: sortKey !== 'name_asc' ? '#35C0A3' : '#555',
                fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}
            >
              <ArrowUpDown size={14} />
              {sortKey !== 'name_asc' ? SORT_LABELS[sortKey] : 'Sort'}
            </button>
            {sortOpen && (
              <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff',
                border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                minWidth: 160, overflow: 'hidden', fontFamily: "'Heebo', sans-serif" }}>
                {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                  <button key={key}
                    onClick={() => { setSortKey(key); setSortOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '9px 14px', border: 'none', textAlign: 'left',
                      backgroundColor: sortKey === key ? '#f0fdf9' : '#fff',
                      color: sortKey === key ? '#35C0A3' : '#333',
                      fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
                      fontWeight: sortKey === key ? 500 : 400 }}>
                    {label}
                    {sortKey === key && <span style={{ fontSize: 16 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Filter dropdown ── */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setFilterOpen((o) => !o); setSortOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14,
                borderRadius: 8, border: `1px solid ${activeFilter !== 'all' ? '#35C0A3' : '#e0e0e0'}`,
                backgroundColor: activeFilter !== 'all' ? '#f0fdf9' : '#fff',
                color: activeFilter !== 'all' ? '#35C0A3' : '#555',
                fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}
            >
              <SlidersHorizontal size={14} />
              {activeFilter !== 'all' ? FILTER_LABELS[activeFilter] : 'Filter'}
            </button>
            {filterOpen && (
              <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff',
                border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                minWidth: 150, overflow: 'hidden', fontFamily: "'Heebo', sans-serif" }}>
                {(Object.entries(FILTER_LABELS) as [ActiveFilter, string][]).map(([key, label]) => (
                  <button key={key}
                    onClick={() => { setActiveFilter(key); setFilterOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '9px 14px', border: 'none', textAlign: 'left',
                      backgroundColor: activeFilter === key ? '#f0fdf9' : '#fff',
                      color: activeFilter === key ? '#35C0A3' : '#333',
                      fontSize: 13.5, cursor: 'pointer', fontFamily: "'Heebo', sans-serif",
                      fontWeight: activeFilter === key ? 500 : 400 }}>
                    {label}
                    {activeFilter === key && <span style={{ fontSize: 16 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add */}
          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16,
              borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff',
              fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>
      )}

      {/* Table card */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div ref={tableRef} tabIndex={0} onKeyDown={handleTableKeyDown} style={{ outline: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 40, textAlign: 'center' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  style={{ cursor: 'pointer', accentColor: '#35C0A3' }} />
              </th>
              <th style={TH}>Name (EN)</th>
              <th style={TH}>Name (AR)</th>
              <th style={TH}>Description</th>
              <th style={TH}>Parent</th>
              <th style={{ ...TH, textAlign: 'right' }}>Products</th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>
                  <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #35C0A3',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite' }} />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 13, borderRight: 'none' }}>
                  {search || activeFilter !== 'all' ? 'No categories match your filters.' : 'No categories yet. Click Add to create one.'}
                </td>
              </tr>
            ) : (
              sorted.map((cat) => {
                const isHovered = hoveredRow === cat.id;
                const isDeleting = deletingId === cat.id;
                return (
                  <tr key={cat.id}
                    onMouseEnter={() => setHoveredRow(cat.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ backgroundColor: isHovered ? '#fafefe' : '#fff',
                      transition: 'background-color 0.12s' }}
                  >
                    {/* Checkbox */}
                    <td style={{ ...TD, textAlign: 'center', width: 40 }}>
                      <input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggleRow(cat.id)}
                        style={{ cursor: 'pointer', accentColor: '#35C0A3' }} />
                    </td>

                    {/* Name EN (inline editable) */}
                    <td
                      style={cellStyle(cat.id, 'name', { fontWeight: 500, color: cat.is_active ? '#1a1a1a' : '#aaa' })}
                      onClick={() => activateCell(cat.id, 'name', cat.name)}
                    >
                      {activeCell?.rowId === cat.id && activeCell?.col === 'name' ? (
                        <input
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => setCellDraft(e.target.value)}
                          onBlur={() => deactivateAndSave()}
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                            fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111' }}
                        />
                      ) : (
                        cat.name
                      )}
                    </td>

                    {/* Name AR (inline editable) */}
                    <td
                      dir="rtl"
                      style={cellStyle(cat.id, 'name_ar', { color: cat.is_active ? '#555' : '#bbb' })}
                      onClick={() => activateCell(cat.id, 'name_ar', cat.name_ar ?? '')}
                    >
                      {activeCell?.rowId === cat.id && activeCell?.col === 'name_ar' ? (
                        <input
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => setCellDraft(e.target.value)}
                          onBlur={() => deactivateAndSave()}
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                            fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111' }}
                        />
                      ) : (
                        cat.name_ar || <span style={{ color: '#ddd', direction: 'ltr' }}>—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td
                      style={cellStyle(cat.id, 'description', { color: '#666', maxWidth: 240 })}
                      onClick={() => activateCell(cat.id, 'description', cat.description ?? '')}
                    >
                      {activeCell?.rowId === cat.id && activeCell?.col === 'description' ? (
                        <input
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => setCellDraft(e.target.value)}
                          onBlur={() => deactivateAndSave()}
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                            fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111' }}
                        />
                      ) : (
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {cat.description || '—'}
                        </span>
                      )}
                    </td>

                    {/* Parent */}
                    <td
                      style={cellStyle(cat.id, 'parent', { color: '#888' })}
                      onClick={() => activateCell(cat.id, 'parent', cat.parent ?? '')}
                    >
                      {activeCell?.rowId === cat.id && activeCell?.col === 'parent' ? (
                        <select
                          autoFocus
                          value={cellDraft}
                          onChange={(e) => setCellDraft(e.target.value)}
                          onBlur={() => deactivateAndSave()}
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                            fontSize: 13.5, fontFamily: "'Heebo', sans-serif", color: '#111', cursor: 'pointer' }}
                        >
                          <option value="">None (Top Level)</option>
                          {parentChoices
                            .filter((p) => p.id !== cat.id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                      ) : (
                        cat.parent_name ?? '—'
                      )}
                    </td>

                    {/* Product count */}
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                      color: cat.product_count > 0 ? '#333' : '#bbb' }}>
                      {cat.product_count}
                    </td>

                    {/* Status */}
                    <td
                      style={cellStyle(cat.id, 'is_active')}
                      onClick={() => activateCell(cat.id, 'is_active', String(cat.is_active))}
                    >
                      {activeCell?.rowId === cat.id && activeCell?.col === 'is_active' ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCellDraft((p) => (p === 'true' ? 'false' : 'true')); }}
                          onBlur={() => deactivateAndSave()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'transparent',
                            border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          <span style={{
                            width: 38, height: 20, borderRadius: 10, border: 'none',
                            backgroundColor: cellDraft === 'true' ? '#35C0A3' : '#d1d5db', position: 'relative',
                            transition: 'background-color 0.2s',
                          }}>
                            <span style={{
                              position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
                              backgroundColor: '#fff', left: cellDraft === 'true' ? 20 : 2, transition: 'left 0.2s',
                            }} />
                          </span>
                          <span style={{ fontSize: 12.5, color: '#666' }}>{cellDraft === 'true' ? 'ACTIVE' : 'INACTIVE'}</span>
                        </button>
                      ) : (
                        <StatusBadge active={cat.is_active} />
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ ...TD, width: 80 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                        opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(cat)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none',
                            backgroundColor: '#f0fdf9', color: '#35C0A3', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteCategory(cat)} disabled={isDeleting}
                          style={{ width: 28, height: 28, borderRadius: 6, border: 'none',
                            backgroundColor: '#fff5f5', color: '#e53e3e',
                            cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        </div>

        {/* Footer */}
        {!loading && sorted.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>
              {selected.size > 0 ? `${selected.size} selected · ` : ''}{total} {total === 1 ? 'category' : 'categories'}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CategoryModal key="create" mode="create" onClose={() => setShowCreate(false)} onSaved={onSaved} />
      )}
      {editCat && (
        <CategoryModal key={editCat.id} mode="edit" initial={editCat} onClose={() => setEditCat(null)} onSaved={onSaved} />
      )}

      {/* Bulk delete confirmation */}
      {showBulkDel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => e.target === e.currentTarget && setShowBulkDel(false)}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '28px 28px 22px',
            width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', fontFamily: "'Heebo', sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                Delete {selected.size} {selected.size === 1 ? 'Category' : 'Categories'}
              </span>
              <button onClick={() => setShowBulkDel(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24,
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px' }}>
              <AlertTriangle size={18} style={{ color: '#ea580c', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13.5, color: '#333', lineHeight: 1.5 }}>
                You're about to permanently delete {selected.size} {selected.size === 1 ? 'category' : 'categories'}.
                Categories with sub-categories or products will be skipped.
                Are you sure you want to proceed?
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowBulkDel(false)} disabled={bulkLoading}
                style={{ height: 36, paddingInline: 18, borderRadius: 8, border: '1px solid #e0e0e0',
                  backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer',
                  fontFamily: "'Heebo', sans-serif" }}>
                Cancel
              </button>
              <button onClick={() => bulkAction('delete')} disabled={bulkLoading}
                style={{ height: 36, paddingInline: 24, borderRadius: 8, border: 'none',
                  backgroundColor: bulkLoading ? '#fca5a5' : '#dc2626', color: '#fff',
                  fontSize: 13.5, fontWeight: 500, cursor: bulkLoading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Heebo', sans-serif" }}>
                {bulkLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
