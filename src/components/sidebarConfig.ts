import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Box,
  Users,
  Landmark,
  BookOpen,
  BarChart2,
  Settings,
} from 'lucide-react';

export type SidebarIcon = ComponentType<LucideProps>;

export type SidebarItem = {
  /** Stable id for state + keys */
  id: string;
  label: string;
  icon?: SidebarIcon;
  /** Click target */
  path?: string;
  /** Match rules for active highlight */
  matchPaths?: string[]; // defaults to [path]
  exact?: boolean;       // if true, only exact match
  /** Hide from UI but keep matching/route mapping */
  isHidden?: boolean;
  children?: SidebarItem[];
};

export type SidebarGroup = {
  id: string;
  label?: string; // optional section heading
  items: SidebarItem[];
};

/**
 * Single source of truth for sidebar navigation.
 * IMPORTANT: All existing routes are represented here (including hidden ones).
 */
export const sidebarConfig: SidebarGroup[] = [
  {
    id: 'core',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    items: [
      {
        id: 'sales',
        label: 'Sales',
        icon: ShoppingCart,
        path: '/sales',
        matchPaths: ['/sales', '/customers', '/customers/add', '/sales/quotes', '/sales/invoices', '/sales/customer-payments', '/sales/customer-refunds', '/sales/credit-notes'],
        children: [
          { id: 'sales_home', label: 'Overview', path: '/sales' },
          { id: 'quotes', label: 'Quotes', path: '/sales/quotes' },
          { id: 'invoices', label: 'Invoices', path: '/sales/invoices' },
          { id: 'credit_notes', label: 'Credit Notes', path: '/sales/credit-notes' },
          { id: 'customer_payments', label: 'Customer Payments', path: '/sales/customer-payments' },
          { id: 'customer_refunds', label: 'Customer Refunds', path: '/sales/customer-refunds' },
          { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
        ],
      },
      {
        id: 'purchase',
        label: 'Purchase',
        icon: Package,
        path: '/purchase',
        // Note: suppliers route not present yet; placeholder kept hidden until route exists.
        matchPaths: ['/purchase', '/purchase/suppliers', '/purchase/supplier-payments', '/purchase/debit-notes'],
        children: [
          { id: 'purchase_home', label: 'Overview', path: '/purchase' },
          { id: 'bills', label: 'Bills', path: '/purchase/bills' },
          { id: 'debit_notes', label: 'Debit Notes', path: '/purchase/debit-notes' },
          { id: 'suppliers', label: 'Suppliers', path: '/purchase/suppliers' },
          { id: 'supplier_payments', label: 'Supplier Payments', path: '/purchase/supplier-payments' },
        ],
      },
      { id: 'vat', label: 'VAT & ZATCA', icon: Receipt, path: '/vat-zatca' },
      { id: 'banking', label: 'Banking', icon: Landmark, path: '/banking' },
      { id: 'reports', label: 'Reports', icon: BarChart2, path: '/reports' },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    items: [
      {
        id: 'products',
        label: 'Products',
        icon: Box,
        path: '/products/items',
        // Parent highlights for any /products/... page
        matchPaths: ['/products'],
        children: [
          { id: 'items', label: 'Items', path: '/products/items' },
          { id: 'categories', label: 'Categories', path: '/products/categories' },
          { id: 'warehouses', label: 'Warehouses', path: '/products/warehouses' },
          {
            id: 'inventory_adjustments',
            label: 'Inventory',
            path: '/products/inventory/adjustments',
            matchPaths: ['/products/inventory/adjustments'],
            // Keep editor route accessible via matching (but don’t add extra menu clutter)
            children: [
              {
                id: 'inventory_adjustment_editor',
                label: 'Inventory Adjustment Editor',
                path: '/products/inventory/adjustments/:id',
                matchPaths: ['/products/inventory/adjustments/'],
                isHidden: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    items: [
      {
        id: 'accounting',
        label: 'Accounting',
        icon: BookOpen,
        path: '/accounting',
        exact: true, // avoid highlighting for /accounting/tax-rates
        children: [
          { id: 'chart_of_accounts', label: 'Chart of Accounts', path: '/accounting' },
          { id: 'tax_rates', label: 'Tax Rates', path: '/accounting/tax-rates' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings',
        exact: true, // avoid highlighting for /settings/company-settings
        children: [
          { id: 'user_roles', label: 'Users & Roles', path: '/settings' },
          { id: 'org_settings', label: 'Organization', path: '/settings/company-settings' },
        ],
      },
    ],
  },
];

/** Example mapping of *all current routes* covered by sidebarConfig. */
export const sidebarRouteMap: { route: string; sidebarIdPath: string }[] = [
  { route: '/dashboard', sidebarIdPath: 'core.dashboard' },
  { route: '/sales', sidebarIdPath: 'ops.sales' },
  { route: '/sales/quotes', sidebarIdPath: 'ops.sales.quotes' },
  { route: '/sales/quotes/:id', sidebarIdPath: 'ops.sales.quotes' },
  { route: '/sales/invoices', sidebarIdPath: 'ops.sales.invoices' },
  { route: '/sales/invoices/:id', sidebarIdPath: 'ops.sales.invoices' },
  { route: '/sales/customer-payments', sidebarIdPath: 'ops.sales.customer_payments' },
  { route: '/sales/customer-payments/:id', sidebarIdPath: 'ops.sales.customer_payments' },
  { route: '/sales/customer-refunds', sidebarIdPath: 'ops.sales.customer_refunds' },
  { route: '/sales/customer-refunds/:id', sidebarIdPath: 'ops.sales.customer_refunds' },
  { route: '/sales/credit-notes', sidebarIdPath: 'ops.sales.credit_notes' },
  { route: '/sales/credit-notes/:id', sidebarIdPath: 'ops.sales.credit_notes' },
  { route: '/purchase', sidebarIdPath: 'ops.purchase' },
  { route: '/purchase/bills', sidebarIdPath: 'ops.purchase.bills' },
  { route: '/purchase/bills/:id', sidebarIdPath: 'ops.purchase.bills' },
  { route: '/purchase/suppliers', sidebarIdPath: 'ops.purchase.suppliers' },
  { route: '/purchase/supplier-payments', sidebarIdPath: 'ops.purchase.supplier_payments' },
  { route: '/purchase/supplier-payments/:id', sidebarIdPath: 'ops.purchase.supplier_payments' },
  { route: '/purchase/debit-notes', sidebarIdPath: 'ops.purchase.debit_notes' },
  { route: '/purchase/debit-notes/:id', sidebarIdPath: 'ops.purchase.debit_notes' },
  { route: '/vat-zatca', sidebarIdPath: 'ops.vat' },
  { route: '/customers', sidebarIdPath: 'ops.customers' },
  { route: '/customers/add', sidebarIdPath: 'ops.customers' },
  { route: '/banking', sidebarIdPath: 'ops.banking' },
  { route: '/reports', sidebarIdPath: 'ops.reports' },

  { route: '/products/items', sidebarIdPath: 'products.products.items' },
  { route: '/products/categories', sidebarIdPath: 'products.products.categories' },
  { route: '/products/warehouses', sidebarIdPath: 'products.products.warehouses' },
  { route: '/products/inventory/adjustments', sidebarIdPath: 'products.products.inventory_adjustments' },
  { route: '/products/inventory/adjustments/:id', sidebarIdPath: 'products.products.inventory_adjustment_editor (hidden)' },

  { route: '/accounting', sidebarIdPath: 'accounting.accounting.chart_of_accounts' },
  { route: '/accounting/tax-rates', sidebarIdPath: 'accounting.accounting.tax_rates' },

  { route: '/settings', sidebarIdPath: 'admin.settings.user_roles' },
  { route: '/settings/company-settings', sidebarIdPath: 'admin.settings.org_settings' },
];

