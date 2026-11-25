import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { navigation } from "../constants/navigation.js";
import { roleLabel } from "../constants/business.js";
import { notify } from "../utils/notify.js";
import { apiError } from "../utils/errors.js";
import { IconButton } from "../components/common/IconButton.jsx";
export function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const current = navigation.find((item) =>
    item.href === "/" ? location === "/" : location.startsWith(item.href),
  );
  const visible = navigation.filter((item) => item.roles.includes(user.role));
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [mobileOpen]);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setLocation("/connexion");
    } catch (error) {
      notify(apiError(error), "error");
    } finally {
      setLoggingOut(false);
    }
  };
  const links = (group) =>
    visible
      .filter((item) => item.group === group)
      .map((item) => {
        const Icon = item.icon;
        const active = current?.href === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={17} />
            <span>{item.label}</span>
          </Link>
        );
      });
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-page">
        Aller au contenu
      </a>
      <aside
        id="app-navigation"
        className={`sidebar ${mobileOpen ? "is-open" : ""}`}
      >
        <div className="brand">
          <img src="/logo.svg" alt="AssurRec" />
          <IconButton
            label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </IconButton>
        </div>
        <nav aria-label="Navigation principale">
          <p className="nav-caption">Espace de travail</p>
          {links("workspace")}
          {visible.some((item) => item.group === "management") && (
            <>
              <p className="nav-caption nav-caption-spaced">Pilotage</p>
              {links("management")}
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="security-note">
            <ShieldCheck size={16} />
            <span>
              Accès protégé
              <br />
              <small>Session active</small>
            </span>
          </div>
          <button
            type="button"
            className="logout-link"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={16} />
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Fermer la navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="main-content" id="main-page" tabIndex={-1}>
        <header className="topbar">
          <IconButton
            label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="app-navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </IconButton>
          <div className="breadcrumb">
            <span>AssurRec</span>
            <span>/</span>
            <strong>{current?.label || "Détail du dossier"}</strong>
          </div>
          <div className="topbar-user">
            <div className="avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="user-meta">
              <strong>{user.name}</strong>
              <span>{roleLabel[user.role]}</span>
            </div>
          </div>
        </header>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
