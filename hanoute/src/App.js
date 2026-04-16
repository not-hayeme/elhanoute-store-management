import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TopBar from "./components/layout/Topbar/TopBar";
import SideBar from "./components/layout/Sidebar/SideBar";
import { AuthProvider } from "./auth/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import UserList from "./pages/Users/UserList";
import UserForm from "./pages/Users/UserForm";
import CustomerList from "./pages/Customers/CustomerList";
import CustomerForm from "./pages/Customers/CustomerForm";
import ItemList from "./pages/Items/ItemList";
import ItemForm from "./pages/Items/ItemForm";
import ReceiptList from "./pages/Receipts/ReceiptList";
import ReceiptForm from "./pages/Receipts/ReceiptForm";
import StoreList from "./pages/Stores/StoreList";
import StoreForm from "./pages/Stores/StoreForm";
import AdminList from "./pages/Admins/AdminList";
import AdminForm from "./pages/Admins/AdminForm";
import LoginPage from "./pages/Login/LoginPage";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/users" replace />} />

          <Route
            path="*"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <SideBar />
                  <div className="main-section">
                    <TopBar />
                    <div className="content-area">
                      <Routes>
                        <Route path="/users" element={<UserList />} />
                        <Route path="/users/add" element={<UserForm />} />
                        <Route path="/customers" element={<CustomerList />} />
                        <Route path="/customers/add" element={<CustomerForm />} />
                        <Route path="/items" element={<ItemList />} />
                        <Route path="/items/add" element={<ItemForm />} />
                        <Route path="/receipts" element={<ReceiptList />} />
                        <Route path="/receipts/add" element={<ReceiptForm />} />
                        <Route path="/stores" element={<StoreList />} />
                        <Route path="/stores/add" element={<StoreForm />} />
                        <Route path="/admins" element={<AdminList />} />
                        <Route path="/admins/add" element={<AdminForm />} />
                      </Routes>
                    </div>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
