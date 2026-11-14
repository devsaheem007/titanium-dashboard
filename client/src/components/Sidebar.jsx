import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Bell,
  FileText,
  Settings,
  UserCircle,
  ShieldCheck,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/format";
import { useToast } from "../context/ToastContext";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  {
    to: "/users",
    label: "Users Management",
    icon: Users,
    permission: "users:read",
  },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageSquare,
    badge: "messages",
  },
  { to: "/notifications", label: "Notifications", icon: Bell },
  {
    to: "/reports",
    label: "Reports",
    icon: FileText,
    permission: "reports:read",
  },
];
const ACCOUNT = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/security", label: "Security", icon: ShieldCheck },
];

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
  unreadMessages,
}) {
  const { can, logout, settings } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.success("You have been signed out");
    navigate("/login");
  };

  // On mobile the sidebar is a full-width drawer, so it is never rendered in "collapsed" mode there.
  const compact = collapsed;
  const link = (item) => {
    const badge = item.badge === "messages" ? unreadMessages : 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onCloseMobile}
        title={compact ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            compact && "lg:justify-center lg:px-0",
            isActive
              ? "bg-raised text-ink shadow-soft"
              : "text-mute hover:bg-raised/60 hover:text-ink",
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-silver" />
            )}
            <item.icon size={18} className="shrink-0" />
            <span className={cn("flex-1 truncate", compact && "lg:hidden")}>
              {item.label}
            </span>
            {badge > 0 && (
              <span
                className={cn(
                  "rounded-full bg-silver px-1.5 text-[10px] font-bold text-on-silver",
                  compact && "lg:absolute lg:right-2 lg:top-1.5",
                )}
              >
                {badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-panel/95 backdrop-blur-xl transition-all duration-200 lg:static lg:z-10 lg:translate-x-0",
          compact ? "lg:w-[76px]" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "flex h-16 items-center justify-between px-4",
            compact && "lg:justify-center lg:px-0",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/favicon.png"
              alt="Saheem Panel"
              className="h-10 w-10 shrink-0 rounded-full object-contain"
            />
            {(!compact || mobileOpen) && (
              <span className="truncate text-base font-bold tracking-tight text-ink">
                {settings.appName}
              </span>
            )}
          </div>
          <button
            className="icon-btn lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.filter((i) => !i.permission || can(i.permission)).map(link)}
          <div className="my-3 border-t" />
          {ACCOUNT.map(link)}
        </nav>

        <div className="space-y-1 border-t p-3">
          <button
            onClick={handleLogout}
            title={compact ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-mute transition hover:bg-bad/10 hover:text-bad",
              compact && "lg:justify-center lg:px-0",
            )}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={cn(compact && "lg:hidden")}>Logout</span>
          </button>
          <button
            onClick={onToggle}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-mute transition hover:bg-raised/60 hover:text-ink lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} className="mx-auto" />
            ) : (
              <PanelLeftClose size={18} />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
