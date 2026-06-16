import { LogOut } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function Layout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <main className="page-shell">
      <header className="topbar app-topbar">
        <Link to="/" className="brand-link">
          <p className="eyebrow">AI MARKETPLACE</p>
          <h1>CapCycle</h1>
        </Link>
        <nav className="main-nav" aria-label="主要ナビゲーション">
          <NavLink to="/">探す</NavLink>
          {token && (
            <>
              <NavLink to="/sell">出品</NavLink>
              <NavLink to="/transactions">取引</NavLink>
              <NavLink to="/me">マイ</NavLink>
            </>
          )}
        </nav>
        <div className="session">
          {user ? (
            <>
              <span>{user.displayName} / ★{user.rating.toFixed(1)}</span>
              <button className="icon-action" onClick={handleLogout} aria-label="ログアウト">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link to="/login">ログイン</Link>
          )}
        </div>
      </header>
      <Outlet />
    </main>
  );
}
