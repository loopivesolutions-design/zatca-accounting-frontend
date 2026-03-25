import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { sidebarConfig, type SidebarGroup, type SidebarItem } from './sidebarConfig';

function normalizePath(p: string) {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

function isRouteMatch(currentPath: string, item: SidebarItem): boolean {
  const current = normalizePath(currentPath);
  const matchers = item.matchPaths ?? (item.path ? [item.path] : []);
  for (const m of matchers) {
    if (!m) continue;
    // Support both "startsWith" and param patterns
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
      // Hidden children can still make parent active
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

function GroupLabel({ label, collapsed }: { label?: string; collapsed: boolean }) {
  if (!label || collapsed) return null;
  return (
    <div style={{ padding: '10px 16px 6px', fontSize: 11.5, color: '#9ca3af', fontWeight: 600, letterSpacing: 0.2 }}>
      {label}
    </div>
  );
}

function SidebarLink({
  item,
  depth,
  collapsed,
  active,
  onClick,
}: {
  item: SidebarItem;
  depth: 0 | 1;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  const basePaddingLeft = depth === 0 ? 14 : 34;
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingLeft: collapsed ? 12 : basePaddingLeft,
    paddingRight: 12,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 8,
    fontSize: 13.8,
    fontWeight: active ? 600 : 400,
    lineHeight: 1,
    textDecoration: 'none',
    marginBottom: 6,
    boxSizing: 'border-box',
    transition: 'background-color 0.1s',
    cursor: 'pointer',
    userSelect: 'none',
    ...(active
      ? { backgroundColor: '#35C0A3', color: '#ffffff' }
      : hovered
        ? { backgroundColor: '#f5f5f5', color: '#616161' }
        : { backgroundColor: 'transparent', color: '#616161' }),
  };

  const content = (
    <>
      {Icon && (
        <Icon
          size={16}
          strokeWidth={active ? 2.2 : 1.8}
          style={{ flexShrink: 0 }}
        />
      )}
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
    </>
  );

  if (!item.path) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ ...style, border: 'none', background: style.backgroundColor as string, textAlign: 'left' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={!!item.exact}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
    >
      {content}
    </NavLink>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();

  const topLevelIds = useMemo(() => getTopLevelIds(sidebarConfig), []);
  const activeTrail = useMemo(() => findActiveTrail(sidebarConfig, pathname), [pathname]);
  const activeTop = activeTrail.find((id) => topLevelIds.has(id)) ?? null;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar:collapsed') === '1'; } catch { return false; }
  });

  // Expanded state only applies to top-level items with children.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar:expanded');
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    // Auto-expand active parent when navigating
    if (activeTop) {
      setExpanded((prev) => (prev[activeTop] ? prev : { ...prev, [activeTop]: true }));
    }
  }, [activeTop]);

  useEffect(() => {
    try { localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0'); } catch { /* noop */ }
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem('sidebar:expanded', JSON.stringify(expanded)); } catch { /* noop */ }
  }, [expanded]);

  const groups = useMemo(() => {
    // Remove hidden items from rendering, but keep them in matching logic.
    return sidebarConfig.map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.isHidden),
    }));
  }, []);

  return (
    <aside
      style={{
        width: collapsed ? 64 : '14vw',
        minWidth: collapsed ? 64 : '160px',
        maxWidth: collapsed ? 64 : 220,
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
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: collapsed ? '0 8px' : '0 10px 0 14px',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {groups.map((group) => (
          <div key={group.id} style={{ paddingBottom: 6 }}>
            <GroupLabel label={group.label} collapsed={collapsed} />
            {group.items.map((item) => {
              const active = isRouteMatch(pathname, item) || (item.children ? flatten(item.children).some((c) => isRouteMatch(pathname, c)) : false);
              const hasChildren = !!item.children?.some((c) => !c.isHidden);
              const isExpanded = !!expanded[item.id];

              if (!hasChildren) {
                return (
                  <SidebarLink
                    key={item.id}
                    item={item}
                    depth={0}
                    collapsed={collapsed}
                    active={active}
                  />
                );
              }

              return (
                <div key={item.id} style={{ marginBottom: 6 }}>
                  <div style={{ position: 'relative' }}>
                    <SidebarLink
                      item={item}
                      depth={0}
                      collapsed={collapsed}
                      active={active && !item.exact} // child will be highlighted; parent stays subtle via chevron state
                      onClick={() => {
                        // If collapsed: first click expands + opens group, second click navigates (via NavLink)
                        setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                        if (collapsed) setCollapsed(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                        if (collapsed) setCollapsed(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: collapsed ? 6 : 10,
                        top: 6,
                        width: collapsed ? 24 : 28,
                        height: collapsed ? 24 : 28,
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        color: active ? '#ffffff' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                      aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
                    >
                      {isExpanded ? <ChevronDown size={collapsed ? 14 : 16} /> : <ChevronRight size={collapsed ? 14 : 16} />}
                    </button>
                  </div>

                  {/* Children (1 level deep) */}
                  {!collapsed && isExpanded && (
                    <div style={{ marginTop: 2 }}>
                      {item.children
                        ?.filter((c) => !c.isHidden)
                        .map((child) => {
                          const childActive = isRouteMatch(pathname, child) || (child.children ? flatten(child.children).some((c) => isRouteMatch(pathname, c)) : false);
                          return (
                            <SidebarLink
                              key={child.id}
                              item={child}
                              depth={1}
                              collapsed={false}
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
  );
}
