import { Form, NavLink, useNavigate } from "@remix-run/react";
import { Gamepad2, Home, LogIn, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navigation({ user }) {
  const [routingId, setRoutingId] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    setRoutingId(JSON.parse(window.localStorage.getItem("pgnInfo") || "{}")?.routing_id);

    return () => {
      true
    }
  }, [])


  async function handleLogout(): Promise<void> {
    try {
      const localAuth = await localStorage.getItem("auth");
      if (localAuth) {
        localStorage.removeItem("auth");
      }
      navigate("/logout?query=navbar");
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <NavLink
            to="/"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight 
                       hover:text-amber-400 transition-colors"
          >
            <span className="text-2xl">♔</span>
            <span className="hidden sm:inline">Chess</span>
          </NavLink>

          {/* Main Navigation */}
          <ul className="flex items-center gap-2 sm:gap-3">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                   text-sm font-medium transition-all duration-200
                   ${isActive 
                     ? "bg-slate-700 text-white shadow-inner" 
                     : "text-slate-200 hover:text-white hover:bg-slate-700/50"
                   }`
                }
              >
                <Home size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline">Home</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to={routingId ? `/game/${routingId}` : "/play/online"}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                   text-sm font-medium transition-all duration-200 relative overflow-hidden
                   ${routingId 
                     ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shimmer" 
                     : isActive 
                       ? "bg-slate-700 text-white shadow-inner" 
                       : "text-slate-200 hover:text-white hover:bg-slate-700/50"
                   }`
                }
              >
                {routingId && (
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
                <Gamepad2 size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline">
                  {routingId ? "Continue" : "Play"}
                </span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/myhome"
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                   text-sm font-medium transition-all duration-200
                   ${isActive 
                     ? "bg-slate-700 text-white shadow-inner" 
                     : "text-slate-200 hover:text-white hover:bg-slate-700/50"
                   }`
                }
              >
                <User size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline">MyHome</span>
              </NavLink>
            </li>
          </ul>

          {/* Auth Button */}
          <div>
            {user?.id ? (
              <button
                onClick={() => handleLogout()}
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                         text-sm font-medium text-slate-200 hover:text-white 
                         hover:bg-slate-700/50 border border-transparent 
                         hover:border-slate-600 transition-all duration-200"
                name="intent"
                value="logout"
              >
                <LogOut size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <Form id="loginForm" action="/login">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                           text-sm font-medium bg-amber-500 text-slate-900 
                           hover:bg-amber-400 shadow-sm hover:shadow-md
                           transition-all duration-200"
                >
                  <LogIn size={16} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Login</span>
                </button>
              </Form>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
