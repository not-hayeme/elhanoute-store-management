import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserCircle } from "lucide-react";
import "./TopBar.css";

export default function TopBar() {
  const [showMenu, setShowMenu] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // ✅ Redirect if not logged in
    if (!token || !user) {
      window.location.href = "/login";
      return;
    }

    // ✅ Show username
    setUsername(user.name || user.username || "Admin");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 80 }}
      className="topbar"
    >
      <h1 className="topbar-title">Management Panel</h1>
      <div className="topbar-icons">
        <Bell className="icon" />
        <div className="user-menu-container">
          <UserCircle
            className="icon"
            onClick={() => setShowMenu((prev) => !prev)}
          />
          <AnimatePresence>
            {showMenu && (
              <motion.div
                className="user-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="username">{username}</p>
                <button className="logout-btn" onClick={handleLogout}>
                  Disconnect
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
