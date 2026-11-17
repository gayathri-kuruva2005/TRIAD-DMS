import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Files,
  Upload,
  Search,
  Inbox,
  Settings,
  FileText,
  ShieldCheck,
} from "lucide-react";

function Sidebar({ user }) {
  const menuItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Documents",
      path: "/documents",
      icon: Files,
    },
    {
      label: "Upload Document",
      path: "/upload",
      icon: Upload,
    },
    {
      label: "Advanced Search",
      path: "/search",
      icon: Search,
    },
    {
      label: "Access Requests",
      path: "/access-requests",
      icon: Inbox,
    },
    {
      label: "Admin Settings",
      path: "/settings",
      icon: Settings,
      adminOnly: true,
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <FileText size={25} />
        </div>

        <div>
          <h2>TRIAD</h2>
          <span>DOCUMENT MANAGEMENT</span>
        </div>
      </div>

      <div className="sidebar-section-label">
        WORKSPACE
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-security">
          <ShieldCheck size={19} />
          <div>
            <strong>Secure Workspace</strong>
            <span>Division protected</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {(user?.username || user?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="sidebar-user-info">
            <strong>{user?.username || "User"}</strong>
            <span>{user?.division || "Division"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
