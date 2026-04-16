import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, ShoppingBag, FileText, Store, Shield } from "lucide-react";
import "./SideBar.css";

export default function SideBar() {
  const location = useLocation();

  const links = [
    { name: "Users", path: "/users", icon: <Users /> },
    { name: "Customers", path: "/customers", icon: <Home /> },
    { name: "Items", path: "/items", icon: <ShoppingBag /> },
    { name: "Receipts", path: "/receipts", icon: <FileText /> },
    { name: "Stores", path: "/stores", icon: <Store /> },
    { name: "Admins", path: "/admins", icon: <Shield /> },
  ];

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 80 }}
      className="sidebar"
    >
      <h2 className="sidebar-title">Dashboard</h2>
      <nav className="sidebar-links">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${location.pathname === link.path ? "active" : ""}`}
          >
            {link.icon}
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>
    </motion.aside>
  );
}
