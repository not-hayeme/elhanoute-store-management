import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  const deleteCustomer = async (id) => {
    if (window.confirm("Delete this customer?")) {
      await api.delete(`/customers/${id}`);
      setCustomers(customers.filter((c) => c._id !== id));
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Customers</h2>
      <Link to="/customers/add"><button>Add Customer</button></Link>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>{c.city}</td>
              <td>
                <Link to={`/customers/add?id=${c._id}`}><button>Edit</button></Link>
                <button onClick={() => deleteCustomer(c._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
