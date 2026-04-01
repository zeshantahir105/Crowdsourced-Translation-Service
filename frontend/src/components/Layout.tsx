import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import {
  BookOpen,
  Code2,
  Crown,
  FileText,
  Home,
  Languages,
  LayoutDashboard,
  ListTodo,
  LogIn,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "";

function useSocket() {
  useEffect(() => {
    if (!socketUrl) return;
    const s: Socket = io(socketUrl, {
      transports: ["websocket"],
    });
    s.on("translation:update", () => {
      window.dispatchEvent(new CustomEvent("lh:translation"));
    });
    return () => {
      s.disconnect();
    };
  }, []);
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
    isActive
      ? "bg-white text-lh-blue shadow-md ring-1 ring-lh-cyan/25"
      : "text-lh-muted hover:bg-white hover:text-lh-navy hover:shadow-sm",
  ].join(" ");

export function Layout() {
  const { user, reputation, logout, loading, isPremium } = useAuth();
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useSocket();

  /** Pinned to bottom of sidebar / drawer. `showLabels` false = icon-only (collapsed desktop). */
  function renderAuthFooter(showLabels: boolean, onDismiss?: () => void) {
    return (
      <div className="border-t border-lh-border bg-lh-sidebar/95 p-2 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm md:bg-lh-sidebar/95">
        {!loading && user ? (
          <div className="space-y-2">
            {showLabels && (
              <div className="rounded-lg bg-white/90 px-3 py-2 text-xs shadow-sm ring-1 ring-lh-border/60">
                <div className="font-semibold text-lh-ink">{user.name}</div>
                <div className="text-lh-muted">
                  {user.role.toLowerCase()}
                  {isPremium && (
                    <span className="ms-1 rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">Premium</span>
                  )}
                </div>
                {reputation && <div className="mt-1 text-lh-blue">{reputation.points} reputation</div>}
                <NavLink
                  to="/account"
                  onClick={onDismiss}
                  className="mt-2 block text-center text-[11px] font-semibold text-lh-blue hover:underline"
                >
                  Account settings
                </NavLink>
              </div>
            )}
            <button
              type="button"
              title={!showLabels ? "Log out" : undefined}
              aria-label="Log out"
              onClick={() => {
                logout();
                nav("/login");
                onDismiss?.();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-lh-muted transition hover:bg-white hover:text-lh-ink"
            >
              <LogOut className="size-5 shrink-0" />
              {showLabels && <span>Log out</span>}
            </button>
          </div>
        ) : !loading ? (
          <NavLink
            to="/login"
            title={!showLabels ? "Log in" : undefined}
            aria-label="Log in"
            onClick={onDismiss}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-lh-blue transition hover:bg-white"
          >
            <LogIn className="size-5 shrink-0" />
            {showLabels && <span>Log in</span>}
          </NavLink>
        ) : (
          <div className="h-10 animate-pulse rounded-lg bg-lh-border/40" aria-hidden />
        )}
      </div>
    );
  }

  return (
    <div data-app-shell className="flex h-dvh max-h-dvh w-full min-h-0 overflow-hidden">
      {/* Desktop sidebar — same viewport height as main; nav scrolls; auth pinned to bottom */}
      <aside
        className={[
          "hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-lh-border bg-lh-sidebar md:flex",
          sidebarOpen ? "w-56" : "w-[4.25rem]",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-lh-border bg-white/70 px-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-2 text-lh-muted transition hover:bg-lh-cyan-soft hover:text-lh-blue"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
          </button>
          {sidebarOpen && (
            <div className="ms-1.5 flex min-w-0 items-center gap-2">
              <img
                src="/images/marketing/translate-cube.svg"
                alt=""
                className="size-9 shrink-0 rounded-lg bg-gradient-to-br from-cyan-50 to-sky-100 p-1.5 ring-1 ring-lh-cyan/20"
                width={36}
                height={36}
              />
              <div className="min-w-0">
                <div className="truncate bg-gradient-to-r from-lh-navy to-lh-blue bg-clip-text text-sm font-extrabold text-transparent">
                  LingoHub
                </div>
                <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-lh-muted">
                  AI + Community
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 [scrollbar-gutter:stable]">
          <div className="flex flex-col gap-1">
          <NavLink to="/" className={navCls} end>
            <Home className="size-5 shrink-0" />
            {sidebarOpen && <span>Home</span>}
          </NavLink>
          <NavLink to="/translator" className={navCls} end>
            <Languages className="size-5 shrink-0" />
            {sidebarOpen && <span>Translator</span>}
          </NavLink>
          <NavLink to="/documents" className={navCls}>
            <FileText className="size-5 shrink-0" />
            {sidebarOpen && <span>Translate files</span>}
          </NavLink>
          <NavLink to="/pricing" className={navCls}>
            <Crown className="size-5 shrink-0" />
            {sidebarOpen && <span>Plans</span>}
          </NavLink>
          <NavLink to="/dashboard" className={navCls}>
            <LayoutDashboard className="size-5 shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </NavLink>
          <NavLink to="/tasks" className={navCls}>
            <ListTodo className="size-5 shrink-0" />
            {sidebarOpen && <span>Tasks</span>}
          </NavLink>
          <NavLink to="/glossary" className={navCls}>
            <BookOpen className="size-5 shrink-0" />
            {sidebarOpen && <span>Glossary</span>}
          </NavLink>
          <NavLink to="/developer" className={navCls}>
            <Code2 className="size-5 shrink-0" />
            {sidebarOpen && <span>API console</span>}
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" className={navCls}>
              <Shield className="size-5 shrink-0" />
              {sidebarOpen && <span>Admin</span>}
            </NavLink>
          )}
          </div>
        </nav>

        <div className="shrink-0">{renderAuthFooter(sidebarOpen)}</div>
      </aside>

      {/* Main column: viewport height; only this area scrolls (below mobile header) */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-lh-border bg-white/95 px-4 backdrop-blur-md md:hidden">
          <span className="bg-gradient-to-r from-lh-navy to-lh-blue bg-clip-text font-extrabold text-transparent">
            LingoHub
          </span>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-lh-surface"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-6" />
          </button>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)}>
            <div
              className="absolute start-0 top-0 flex h-dvh max-h-dvh w-[min(100%,300px)] flex-col overflow-hidden bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-lh-border p-3">
                <span className="font-bold text-lh-blue">Menu</span>
                <button type="button" className="rounded-lg p-2 hover:bg-lh-surface" onClick={() => setMobileOpen(false)}>
                  <X className="size-5" />
                </button>
              </div>
              <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 [scrollbar-gutter:stable]">
                <div className="flex flex-col gap-1">
                  <NavLink to="/" className={navCls} onClick={() => setMobileOpen(false)}>
                    <Home className="size-5 shrink-0" /> Home
                  </NavLink>
                  <NavLink to="/translator" className={navCls} onClick={() => setMobileOpen(false)}>
                    <Languages className="size-5 shrink-0" /> Translator
                  </NavLink>
                  <NavLink to="/documents" className={navCls} onClick={() => setMobileOpen(false)}>
                    <FileText className="size-5 shrink-0" /> Files
                  </NavLink>
                  <NavLink to="/pricing" className={navCls} onClick={() => setMobileOpen(false)}>
                    <Crown className="size-5 shrink-0" /> Plans
                  </NavLink>
                  <NavLink to="/dashboard" className={navCls} onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="size-5 shrink-0" /> Dashboard
                  </NavLink>
                  <NavLink to="/tasks" className={navCls} onClick={() => setMobileOpen(false)}>
                    <ListTodo className="size-5 shrink-0" /> Tasks
                  </NavLink>
                  <NavLink to="/glossary" className={navCls} onClick={() => setMobileOpen(false)}>
                    <BookOpen className="size-5 shrink-0" /> Glossary
                  </NavLink>
                  <NavLink to="/developer" className={navCls} onClick={() => setMobileOpen(false)}>
                    <Code2 className="size-5 shrink-0" /> API console
                  </NavLink>
                  {user?.role === "ADMIN" && (
                    <NavLink to="/admin" className={navCls} onClick={() => setMobileOpen(false)}>
                      <Shield className="size-5 shrink-0" /> Admin
                    </NavLink>
                  )}
                </div>
              </nav>
              <div className="shrink-0 bg-white">{renderAuthFooter(true, () => setMobileOpen(false))}</div>
            </div>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function HomeLink() {
  return (
    <NavLink
      to="/"
      className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-lh-muted hover:text-lh-blue"
      aria-label="Home"
    >
      <Home className="size-4" />
    </NavLink>
  );
}
