import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { sidebarConfig, type SidebarGroup, type SidebarItem } from './sidebarConfig';

function normalizePath(p: string) {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

function isRouteMatch(currentPath: string, item: SidebarItem): boolean {
  const current = normalizePath(currentPath);
  const matchers = item.matchPaths ?? (item.path ? [item.path] : []);
  for (const m of matchers) {
    if (!m) continue;
    if (m.includes(':')) {
      if (matchPath({ path: m, end: !!item.exact }, current)) return true;
    } else {
      const target = normalizePath(m);
      if (item.exact) {
        if (current === target) return true;
      } else {
        if (current === target || current.startsWith(target + '/')) return true;
      }
    }
  }
  return false;
}

function flatten(items: SidebarItem[]): SidebarItem[] {
  const out: SidebarItem[] = [];
  for (const it of items) {
    out.push(it);
    if (it.children?.length) out.push(...flatten(it.children));
  }
  return out;
}

function findActiveTrail(groups: SidebarGroup[], currentPath: string): string[] {
  for (const g of groups) {
    for (const root of g.items) {
      const trail: string[] = [];
      const found = dfs(root, currentPath, trail);
      if (found) return trail;
    }
  }
  return [];

  function dfs(node: SidebarItem, current: string, trail: string[]): boolean {
    trail.push(node.id);
    const selfActive = isRouteMatch(current, node);
    if (selfActive) return true;
    if (node.children) {
      for (const child of node.children.filter((c) => !c.isHidden)) {
        const childTrail = [...trail];
        if (dfs(child, current, childTrail)) {
          trail.splice(0, trail.length, ...childTrail);
          return true;
        }
      }
      for (const child of node.children.filter((c) => c.isHidden)) {
        if (isRouteMatch(current, child)) return true;
      }
    }
    trail.pop();
    return false;
  }
}

function getTopLevelIds(groups: SidebarGroup[]) {
  return new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
}

// Section headings intentionally hidden per design spec.
function GroupLabel(_: { label?: string; collapsed: boolean }) {
  return null;
}

/* ─── Parent nav item (depth = 0) ─────────────────────────────────────────── */
function ParentNavItem({
  item,
  collapsed,
  active,
  isExpanded,
  onToggle,
}: {
  item: SidebarItem;
  collapsed: boolean;
  active: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const hasChildren = !!item.children?.some((c) => !c.isHidden);

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 48,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: collapsed ? 14 : 27,
    paddingRight: collapsed ? 14 : 27,
    borderRadius: 8,
    boxSizing: 'border-box',
    border: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    textDecoration: 'none',
    fontFamily: "'Heebo', sans-serif",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    lineHeight: '21px',
    letterSpacing: '0.02em',
    marginBottom: 6,
    transition: 'background 0.15s',
    ...(active
      ? {
          background: 'linear-gradient(111.18deg, #35C0A3 16.87%, #E2F0D3 129.13%)',
          color: '#ffffff',
        }
      : hovered
        ? { backgroundColor: '#F2F7F6', color: '#616161' }
        : { backgroundColor: 'transparent', color: '#616161' }),
  };

  const leftContent = (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {Icon && (
        <Icon
          size={24}
          strokeWidth={active ? 2.2 : 1.8}
          style={{ flexShrink: 0, color: active ? '#ffffff' : '#616161' }}
        />
      )}
      {!collapsed && (
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
      )}
    </div>
  );

  // Chevron only visible when the item is expanded (not when collapsed/closed).
  const rightContent = hasChildren && !collapsed && isExpanded ? (
    <ChevronDown
      size={14}
      style={{ flexShrink: 0, color: active ? '#ffffff' : '#9ca3af' }}
    />
  ) : null;

  const sharedHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    title: collapsed ? item.label : undefined,
  };

  // Items with children are always buttons (toggle expand)
  if (hasChildren || !item.path) {
    return (
      <button type="button" onClick={onToggle} style={baseStyle} {...sharedHandlers}>
        {leftContent}
        {rightContent}
      </button>
    );
  }

  return (
    <NavLink to={item.path} end={!!item.exact} style={baseStyle} onClick={onToggle} {...sharedHandlers}>
      {leftContent}
      {rightContent}
    </NavLink>
  );
}

/* ─── Child nav item (depth = 1) ──────────────────────────────────────────── */
function ChildNavItem({
  item,
  active,
}: {
  item: SidebarItem;
  active: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: 194,
    height: 30,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: active ? 36 : 35,
    paddingRight: active ? 36 : 35,
    borderRadius: 4,
    boxSizing: 'border-box',
    border: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    textDecoration: 'none',
    fontFamily: "'Heebo', sans-serif",
    fontSize: 14,
    fontWeight: hovered && !active ? 500 : 400,
    lineHeight: '21px',
    letterSpacing: '0.02em',
    marginBottom: 2,
    ...(active
      ? { backgroundColor: '#E2F0D3', color: '#616161' }
      : hovered
        ? { backgroundColor: '#F2F7F6', color: '#979797' }
        : { backgroundColor: 'transparent', color: '#979797' }),
  };

  const label = (
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {item.label}
    </span>
  );

  const sharedHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (!item.path) {
    return (
      <button type="button" style={style} {...sharedHandlers}>
        {label}
      </button>
    );
  }

  return (
    <NavLink to={item.path} end={!!item.exact} style={style} {...sharedHandlers}>
      {label}
    </NavLink>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const { pathname } = useLocation();

  const topLevelIds = useMemo(() => getTopLevelIds(sidebarConfig), []);
  const activeTrail = useMemo(() => findActiveTrail(sidebarConfig, pathname), [pathname]);
  const activeTop = activeTrail.find((id) => topLevelIds.has(id)) ?? null;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar:collapsed') === '1'; } catch { return false; }
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar:expanded');
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch { return {}; }
  });

  // Accordion: keep only the active top-level item open on navigation.
  useEffect(() => {
    if (activeTop) {
      setExpanded((prev) => (prev[activeTop] && Object.keys(prev).length === 1 ? prev : { [activeTop]: true }));
    }
  }, [activeTop]);

  useEffect(() => {
    try { localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0'); } catch { /* noop */ }
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem('sidebar:expanded', JSON.stringify(expanded)); } catch { /* noop */ }
  }, [expanded]);

  const groups = useMemo(() => {
    return sidebarConfig.map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.isHidden),
    }));
  }, []);

  return (
    <>
    <style>{`
      .sidebar-nav::-webkit-scrollbar { width: 4px; }
      .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
      .sidebar-nav::-webkit-scrollbar-thumb { background-color: #E6E6E6; border-radius: 4px; }
    `}</style>
    <aside
      style={{
        width: collapsed ? 64 : 260,
        minWidth: collapsed ? 64 : 260,
        maxWidth: collapsed ? 64 : 260,
        fontFamily: "'Heebo', sans-serif",
        backgroundColor: '#ffffff',
        borderRight: '1px solid #efefef',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
          padding: collapsed ? '18px 10px 12px' : '22px 14px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: '#35C0A3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
            title="ZATCAPro"
          >
            Z
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ZATCA<span style={{ color: '#35C0A3' }}>Pro</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid #efefef',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            flexShrink: 0,
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="sidebar-nav"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: collapsed ? '0 8px' : '0 8px',
          paddingTop: 60,
          flex: 1,
          overflowY: 'auto',
          scrollbarColor: '#E6E6E6 transparent',
          scrollbarWidth: 'thin',
        }}
      >
        {groups.map((group) => (
          <div key={group.id} style={{ paddingBottom: 4 }}>
            <GroupLabel label={group.label} collapsed={collapsed} />
            {group.items.map((item) => {
              const hasVisibleChildren = !!item.children?.some((c) => !c.isHidden);
              const active =
                isRouteMatch(pathname, item) ||
                (item.children ? flatten(item.children).some((c) => isRouteMatch(pathname, c)) : false);
              const isExpanded = !!expanded[item.id];

              return (
                <div key={item.id}>
                  <ParentNavItem
                    item={item}
                    collapsed={collapsed}
                    active={active}
                    isExpanded={isExpanded}
                    onToggle={() => {
                      if (hasVisibleChildren) {
                        // Accordion: opening one closes all others.
                        setExpanded((prev) => {
                          const wasOpen = !!prev[item.id];
                          return wasOpen ? {} : { [item.id]: true };
                        });
                        if (collapsed) setCollapsed(false);
                      } else if (collapsed) {
                        setCollapsed(false);
                      }
                    }}
                  />

                  {/* Children */}
                  {!collapsed && hasVisibleChildren && isExpanded && (
                    <div style={{ marginBottom: 4, paddingLeft: 8 }}>
                      {item.children!
                        .filter((c) => !c.isHidden)
                        .map((child) => {
                          const childActive =
                            isRouteMatch(pathname, child) ||
                            (child.children
                              ? flatten(child.children).some((c) => isRouteMatch(pathname, c))
                              : false);
                          return (
                            <ChildNavItem
                              key={child.id}
                              item={child}
                              active={childActive}
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom user */}
      <div style={{ padding: '12px 10px 14px', borderTop: '1px solid #efefef' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#35C0A3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            AU
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#333333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Admin User
              </span>
              <span style={{ fontSize: 10.5, color: '#999999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                admin@company.com
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
