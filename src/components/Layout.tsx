import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import { getSidebarSearchHits, type SidebarSearchHit } from './sidebarConfig';

interface RouteConfig {
  title: string;
  parent?: string;
}

const ROUTES: Record<string, RouteConfig> = {
  '/dashboard':  { title: 'Dashboard' },
  '/sales':      { title: 'Sales' },
  '/sales/quotes': { title: 'Quotes', parent: 'Sales' },
  '/sales/quotes/add': { title: 'Add Quote', parent: 'Sales' },
  '/sales/invoices': { title: 'Invoices', parent: 'Sales' },
  '/sales/invoices/add': { title: 'Add Invoice', parent: 'Sales' },
  '/sales/customer-payments': { title: 'Customer Payments', parent: 'Sales' },
  '/sales/customer-payments/add': { title: 'Add Customer Payment', parent: 'Sales' },
  '/sales/customer-refunds': { title: 'Customer Refunds', parent: 'Sales' },
  '/sales/customer-refunds/add': { title: 'Add Customer Refund', parent: 'Sales' },
  '/sales/credit-notes': { title: 'Credit Notes', parent: 'Sales' },
  '/sales/credit-notes/add': { title: 'Add Credit Note', parent: 'Sales' },
  '/purchase':   { title: 'Purchase' },
  '/purchase/bills': { title: 'Bills', parent: 'Purchase' },
  '/purchase/suppliers/add': { title: 'Add Supplier', parent: 'Purchase / Suppliers' },
  '/purchase/suppliers': { title: 'Suppliers', parent: 'Purchase' },
  '/purchase/supplier-payments': { title: 'Supplier Payments', parent: 'Purchase' },
  '/purchase/supplier-payments/add': { title: 'Add Supplier Payment', parent: 'Purchase' },
  '/purchase/supplier-refunds': { title: 'Supplier Refunds', parent: 'Purchase' },
  '/purchase/debit-notes': { title: 'Debit Notes', parent: 'Purchase' },
  '/purchase/debit-notes/add': { title: 'Add Debit Note', parent: 'Purchase' },
  '/vat-zatca':  { title: 'VAT & ZATCA' },
  '/products/items':      { title: 'Items', parent: 'Products' },
  '/products/categories': { title: 'Categories', parent: 'Products' },
  '/products/warehouses': { title: 'Warehouse', parent: 'Products' },
  '/products/inventory/adjustments': { title: 'Inventory', parent: 'Products' },
  '/products':            { title: 'Products' },
  '/customers':  { title: 'Customers' },
  '/customers/add': { title: 'Add Customer', parent: 'Sales' },
  '/banking':    { title: 'Banking' },
  '/accounting/tax-rates': { title: 'Tax Rates',        parent: 'Accounting' },
  '/accounting/journal-entries': { title: 'Journal Entries', parent: 'Accounting' },
  '/accounting':           { title: 'Chart Of Accounts', parent: 'Accounting' },
  '/reports':    { title: 'Reports' },
  '/reports/statement-of-account': { title: 'Statement of Accounts', parent: 'Reports' },
  '/reports/profit-and-loss': { title: 'Profit and Loss', parent: 'Reports' },
  '/reports/general-ledger': { title: 'General Ledger', parent: 'Reports' },
  '/settings':   { title: 'User & Role Management', parent: 'Settings'  },
  '/settings/company-settings': { title: 'Organization Settings', parent: 'Settings' },
  '/settings/approvals': { title: 'Approvals', parent: 'Settings' },
};

function readAuthInitials(): string {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return 'AU';
    const u = JSON.parse(raw) as Record<string, unknown>;
    const first = String(u.first_name ?? '').trim();
    const last = String(u.last_name ?? '').trim();
    if (first && last) return (first[0] + last[0]).toUpperCase();
    const email = String(u.email ?? '').trim();
    if (email) {
      const local = email.split('@')[0] ?? email;
      if (local.length >= 2) return local.slice(0, 2).toUpperCase();
      if (local.length === 1) return (local[0] + '?').toUpperCase();
    }
  } catch {
    /* ignore */
  }
  return 'AU';
}

function readAuthEmail(): string | null {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as Record<string, unknown>;
    const email = String(u.email ?? '').trim();
    return email || null;
  } catch {
    return null;
  }
}

function filterSearchHits(hits: SidebarSearchHit[], query: string): SidebarSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return hits.slice(0, 12);
  const words = q.split(/\s+/).filter(Boolean);
  return hits.filter((h) => {
    const hay = `${h.trail} ${h.label} ${h.path}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  }).slice(0, 20);
}

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const headerActionsRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [initials, setInitials] = useState(readAuthInitials);
  const [userEmail, setUserEmail] = useState<string | null>(readAuthEmail);

  const searchHits = useMemo(() => getSidebarSearchHits(), []);
  const filteredHits = useMemo(
    () => filterSearchHits(searchHits, searchQuery),
    [searchHits, searchQuery],
  );

  const closeAllMenus = useCallback(() => {
    setSearchOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  }, []);

  useEffect(() => {
    if (!searchOpen && !notifOpen && !profileOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (headerActionsRef.current && !headerActionsRef.current.contains(e.target as Node)) {
        closeAllMenus();
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [searchOpen, notifOpen, profileOpen, closeAllMenus]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'auth_user') {
        setInitials(readAuthInitials());
        setUserEmail(readAuthEmail());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const matchedKey =
    Object.keys(ROUTES)
      .filter((k) => (k === '/' ? pathname === '/' : pathname.startsWith(k)))
      .sort((a, b) => b.length - a.length)[0] ?? '/';

  const { title, parent } = ROUTES[matchedKey];

  function goToHit(hit: SidebarSearchHit) {
    navigate(hit.path);
    setSearchQuery('');
    closeAllMenus();
  }

  function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    closeAllMenus();
    navigate('/login', { replace: true });
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 260,
    maxWidth: 320,
    maxHeight: 320,
    overflowY: 'auto',
    backgroundColor: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 10,
    boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
    zIndex: 200,
    padding: 8,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f4f6f8', fontFamily: "'Heebo', sans-serif" }}>
      <Sidebar />

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            height: 52,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #efefef',
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            {parent && (
              <>
                <span style={{ color: '#aaaaaa', fontWeight: 400 }}>{parent}</span>
                <span style={{ color: '#cccccc' }}>/</span>
              </>
            )}
            <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{title}</span>
          </div>

          {/* Right actions */}
          <div
            ref={headerActionsRef}
            style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}
          >
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#aaaaaa',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
              <input
                type="text"
                placeholder="Search pages…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchOpen(true);
                  setNotifOpen(false);
                  setProfileOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    closeAllMenus();
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === 'Enter' && filteredHits.length > 0) {
                    e.preventDefault();
                    goToHit(filteredHits[0]);
                  }
                }}
                aria-expanded={searchOpen}
                aria-controls="layout-search-results"
                autoComplete="off"
                style={{
                  paddingLeft: 30,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontSize: 13,
                  borderRadius: 8,
                  backgroundColor: '#f7f7f7',
                  border: '1px solid #e8e8e8',
                  color: '#444444',
                  outline: 'none',
                  width: 200,
                  fontFamily: "'Heebo', sans-serif",
                }}
              />
              {searchOpen && (
                <div id="layout-search-results" role="listbox" style={{ ...panelStyle, right: 'auto', left: 0, width: 300 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', padding: '4px 8px 8px' }}>
                    {searchQuery.trim() ? 'Matching pages' : 'Quick navigation'}
                  </div>
                  {filteredHits.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#6b7280', padding: '8px 10px' }}>No matching pages.</div>
                  ) : (
                    filteredHits.map((h) => (
                      <button
                        key={h.path}
                        type="button"
                        role="option"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToHit(h)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: pathname === h.path || pathname.startsWith(`${h.path}/`) ? '#f0fdf9' : 'transparent',
                          borderRadius: 8,
                          padding: '8px 10px',
                          cursor: 'pointer',
                          fontFamily: "'Heebo', sans-serif",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{h.label}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{h.trail}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-expanded={notifOpen}
                aria-label="Notifications"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setSearchOpen(false);
                  setProfileOpen(false);
                }}
                style={{
                  position: 'relative',
                  padding: 6,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#666666',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Bell size={17} />
                <span
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#35C0A3',
                  }}
                  aria-hidden
                />
              </button>
              {notifOpen && (
                <div style={panelStyle}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Notifications</div>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>
                    In-app notifications are not connected yet. Use Approvals for pending actions.
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      navigate('/settings/approvals');
                      closeAllMenus();
                    }}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #35C0A3',
                      backgroundColor: '#fff',
                      color: '#0f766e',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: "'Heebo', sans-serif",
                    }}
                  >
                    Open approvals
                  </button>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-label="Account menu"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setSearchOpen(false);
                  setNotifOpen(false);
                  setInitials(readAuthInitials());
                  setUserEmail(readAuthEmail());
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#35C0A3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                  fontFamily: "'Heebo', sans-serif",
                }}
              >
                {initials}
              </button>
              {profileOpen && (
                <div style={panelStyle}>
                  {userEmail && (
                    <div style={{ fontSize: 12, color: '#6b7280', padding: '4px 8px 10px', wordBreak: 'break-all' }}>
                      {userEmail}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      navigate('/settings/company-settings');
                      closeAllMenus();
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#1a1a1a',
                      fontFamily: "'Heebo', sans-serif",
                    }}
                  >
                    Organization settings
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      navigate('/settings');
                      closeAllMenus();
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#1a1a1a',
                      fontFamily: "'Heebo', sans-serif",
                    }}
                  >
                    Users & roles
                  </button>
                  <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0' }} />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={logout}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#dc2626',
                      fontWeight: 600,
                      fontFamily: "'Heebo', sans-serif",
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
