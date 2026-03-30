import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import Sidebar from './Sidebar';

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

export default function Layout() {
  const { pathname } = useLocation();

  const matchedKey =
    Object.keys(ROUTES)
      .filter((k) => (k === '/' ? pathname === '/' : pathname.startsWith(k)))
      .sort((a, b) => b.length - a.length)[0] ?? '/';

  const { title, parent } = ROUTES[matchedKey];

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                }}
              />
              <input
                type="text"
                placeholder="Search…"
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
                  width: 180,
                  fontFamily: "'Heebo', sans-serif",
                }}
              />
            </div>

            {/* Bell */}
            <button
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
              />
            </button>

            {/* Avatar */}
            <div
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
              }}
            >
              AU
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
