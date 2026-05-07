import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import AudienceToggle from "./AudienceToggle";

const navItems = [
  { to: "/programs", label: "Programs" },
  { to: "/jobs", label: "Jobs" },
  { to: "/events", label: "Events" },
  { to: "/resume", label: "Resume" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `font-display text-sm font-bold uppercase tracking-wider px-3 py-2 brutal-press inline-block ${
      isActive ? "bg-[#FFD100] brutal-border brutal-shadow-sm" : "hover:bg-[#F4F4F4]"
    }`;

  return (
    <header
      data-testid="main-nav"
      className="sticky top-0 z-50 bg-white border-b-2 border-black"
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link
          to="/"
          data-testid="brand-link"
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-[#FFD100] brutal-border brutal-shadow-sm flex items-center justify-center">
            <span className="font-display font-black text-lg leading-none">H</span>
          </div>
          <span className="font-display font-black text-lg sm:text-xl tracking-tighter">
            HALIFAX<span className="text-[#0055A4]">YOUTH</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} data-testid={`nav-${item.label.toLowerCase()}`}>
              {item.label}
            </NavLink>
          ))}
          <div className="ml-3 pl-3 border-l-2 border-black/15">
            <AudienceToggle />
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user && user !== false ? (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                data-testid="dashboard-btn"
                className="bg-white brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-sm uppercase flex items-center gap-2"
              >
                <User size={16} strokeWidth={3} />
                {user.name?.split(" ")[0] || "Me"}
              </button>
              {user.role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  data-testid="admin-btn"
                  className="bg-[#FF3B30] text-white brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-sm uppercase"
                >
                  Admin
                </button>
              )}
              <button
                onClick={async () => { await logout(); navigate("/"); }}
                data-testid="logout-btn"
                className="bg-black text-white brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-sm uppercase flex items-center gap-1"
              >
                <LogOut size={14} strokeWidth={3} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                data-testid="login-btn"
                className="bg-white brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold text-sm uppercase"
              >
                Log in
              </button>
              <button
                onClick={() => navigate("/register")}
                data-testid="signup-btn"
                className="bg-[#FFD100] brutal-border brutal-shadow brutal-press px-4 py-2 font-display font-bold text-sm uppercase"
              >
                Sign up
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden bg-white brutal-border brutal-shadow-sm p-2"
          data-testid="mobile-menu-toggle"
          aria-label="menu"
        >
          {open ? <X size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={3} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t-2 border-black bg-white" data-testid="mobile-menu">
          <div className="px-4 py-4 flex flex-col gap-2">
            <div className="pb-2"><AudienceToggle /></div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={linkClass}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </NavLink>
            ))}
            {user && user !== false ? (
              <>
                <NavLink to="/dashboard" onClick={() => setOpen(false)} className={linkClass}>Dashboard</NavLink>
                {user.role === "admin" && <NavLink to="/admin" onClick={() => setOpen(false)} className={linkClass}>Admin</NavLink>}
                <button
                  onClick={async () => { setOpen(false); await logout(); navigate("/"); }}
                  className="bg-black text-white brutal-border brutal-shadow-sm px-4 py-2 font-display font-bold text-sm uppercase text-left"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setOpen(false); navigate("/login"); }} className="flex-1 bg-white brutal-border brutal-shadow-sm px-4 py-2 font-display font-bold text-sm uppercase">Log in</button>
                <button onClick={() => { setOpen(false); navigate("/register"); }} className="flex-1 bg-[#FFD100] brutal-border brutal-shadow px-4 py-2 font-display font-bold text-sm uppercase">Sign up</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
