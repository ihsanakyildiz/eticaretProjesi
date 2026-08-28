"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  adminNavFlatLinks,
  adminNavSections,
  type AdminNavItem,
} from "@/config/admin-nav";
import { useSidebar } from "./sidebar-context";

/** Daha spesifik bir nav link eşleşiyorsa kısa prefix (ör. /admin/works) aktif sayılmaz. */
function isNavHrefActive(pathname: string, href: string, allHrefs: string[] = adminNavFlatLinks) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  const matches = pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;

  const hasMoreSpecificMatch = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );

  return !hasMoreSpecificMatch;
}

function useFlyoutPosition(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  const [coords, setCoords] = useState({ top: 0, left: 80 });

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const left = Math.round(rect.right + 10);
      let top = Math.round(rect.top);
      const maxTop = window.innerHeight - 16;
      const estimatedHeight = 240;
      if (top + estimatedHeight > maxTop) {
        top = Math.max(16, maxTop - estimatedHeight);
      }
      setCoords({ top, left });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  return coords;
}

function SidebarFlyout({
  open,
  anchorRef,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  const coords = useFlyoutPosition(open, anchorRef);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto fixed z-[80] min-w-[200px] rounded-lg border border-white/10 bg-[#364574] py-1.5 text-white shadow-2xl"
      style={{ top: coords.top, left: coords.left }}
    >
      {children}
    </div>,
    document.body,
  );
}

function CollapsedIconItem({
  label,
  active,
  badge,
  icon: Icon,
  href,
  subItems,
}: {
  label: string;
  active: boolean;
  badge?: string;
  icon: AdminNavItem["icon"];
  href?: string;
  subItems?: AdminNavItem[];
}) {
  const { close } = useSidebar();
  const anchorRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const hasChildren = Boolean(subItems?.length);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const iconButtonClass = `relative flex h-10 w-10 items-center justify-center rounded-md transition ${
    active
      ? "bg-[#0ab39c] text-white shadow-sm"
      : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;

  const flyout = (
    <SidebarFlyout
      open={open}
      anchorRef={anchorRef}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold tracking-wide text-white/85">
        {label}
      </p>
      {hasChildren ? (
        <div className="space-y-0.5 p-1.5">
          {subItems!.map((child) => {
            if (!child.href) return null;
            return (
              <Link
                key={child.label}
                href={child.href}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  close();
                }}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <child.icon className="h-4 w-4 shrink-0 opacity-90" />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </SidebarFlyout>
  );

  const wrapperProps = {
    onMouseEnter: openMenu,
    onMouseLeave: scheduleClose,
    onFocus: openMenu,
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        scheduleClose();
      }
    },
  };

  if (hasChildren) {
    return (
      <div className="flex justify-center" {...wrapperProps}>
        <button
          ref={(node) => {
            anchorRef.current = node;
          }}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={menuId}
          className={iconButtonClass}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
        </button>
        <div id={menuId}>{flyout}</div>
      </div>
    );
  }

  if (!href) return null;

  return (
    <div className="flex justify-center" {...wrapperProps}>
      <Link
        ref={(node) => {
          anchorRef.current = node;
        }}
        href={href}
        onClick={close}
        aria-label={label}
        className={iconButtonClass}
      >
        <Icon className="h-[17px] w-[17px] shrink-0" />
        {badge ? (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
        ) : null}
      </Link>
      {flyout}
    </div>
  );
}

function NavLink({
  item,
  depth = 0,
  collapsed,
}: {
  item: AdminNavItem;
  depth?: number;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { close } = useSidebar();
  const hasChildren = !!item.children?.length;
  const isChildActive = item.children?.some(
    (child) => child.href && isNavHrefActive(pathname, child.href),
  );
  const isActive =
    (item.href ? isNavHrefActive(pathname, item.href) : false) || Boolean(isChildActive);

  const [expanded, setExpanded] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setExpanded(true);
    }
  }, [isChildActive]);

  if (collapsed && depth === 0) {
    return (
      <CollapsedIconItem
        label={item.label}
        active={isActive}
        badge={item.badge}
        icon={item.icon}
        href={item.href}
        subItems={item.children}
      />
    );
  }

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition ${
            isActive
              ? "bg-white/10 text-white"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
            {item.label}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded ? (
          <div className="mt-1 ml-5 space-y-0.5 border-l border-white/10 pl-3">
            {item.children!.map((child) => (
              <NavLink
                key={child.label}
                item={child}
                depth={depth + 1}
                collapsed={false}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  const linkActive = isNavHrefActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={close}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
        depth > 0 ? "py-2" : "py-2.5"
      } ${
        linkActive
          ? "bg-[#0ab39c] text-white shadow-sm"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <item.icon className="h-[17px] w-[17px] shrink-0 opacity-90" />
      <span>{item.label}</span>
      {item.badge ? (
        <span className="ml-auto rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminSidebar() {
  const { isOpen, close, isCollapsed, isDesktop, allowTransition, toggleCollapsed } =
    useSidebar();
  // Mobilde her zaman tam menü; ikon modu yalnızca masaüstünde
  const iconMode = isDesktop && isCollapsed;
  const widthTransition = allowTransition
    ? "transition-[width,transform] duration-300 ease-out"
    : "transition-none";

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(260px,85vw)] flex-col overflow-hidden bg-[#405189] text-white lg:translate-x-0 ${widthTransition} ${
          iconMode ? "lg:w-[72px]" : "lg:w-[260px]"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        suppressHydrationWarning
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/10 ${
            iconMode ? "justify-center px-2" : "gap-2.5 px-5"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold tracking-tight">
            IA
          </span>
          {!iconMode ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-wide">
                İhsan Akyıldız
              </p>
              <p className="text-[11px] text-white/50">Yönetim Paneli</p>
            </div>
          ) : null}
        </div>

        <nav
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4 ${
            iconMode ? "admin-sidebar-icons px-2" : "admin-scrollbar px-3"
          }`}
        >
          {adminNavSections.map((section) => (
            <div key={section.title} className="mb-5">
              {!iconMode ? (
                <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                  {section.title}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-white/15" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    item={item}
                    collapsed={iconMode}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={`shrink-0 border-t border-white/10 ${
            iconMode ? "px-2 py-3" : "px-5 py-4"
          }`}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden w-full items-center rounded-md py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white lg:flex ${
              iconMode ? "justify-center px-2" : "gap-3 px-3"
            }`}
            aria-label={iconMode ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}
          >
            {iconMode ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Daralt</span>
              </>
            )}
          </button>
          {!iconMode ? (
            <p className="mt-3 text-xs text-white/40">
              © {new Date().getFullYear()} İhsan Akyıldız
            </p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
