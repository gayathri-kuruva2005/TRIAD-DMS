
import { Bell, LogOut, Menu } from "lucide-react";

function Header({ user, onLogout }) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="header-menu-icon">
          <Menu size={22} />
        </div>

        <div>
          <h2>Document Hub</h2>
          <p>Manage and organize your documents</p>
        </div>
      </div>

      <div className="header-right">
        <div className="header-division">
          {user?.division || "Division"}
        </div>

        <button
          type="button"
          className="notification-button"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>

        <div className="header-profile">
          <div className="user-avatar header-avatar">
            {(user?.username || user?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="header-profile-info">
            <strong>{user?.username || "User"}</strong>
            <span>{user?.role || "User"}</span>
          </div>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

export default Header;
