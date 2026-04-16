import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";
import "./StoreForm.scss";

export default function StoreForm() {
  // URL parameter handling for edit mode
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();

  // Main store form data state
  // This holds the core store information that will be sent during create/update
  const [form, setForm] = useState({
    name: "",     // Required
    wilaya: "",   // Required
    city: "",     // Required
    registre: "", // Optional
    ownerId: "",  // Required
    address: "",  // Optional
    email: "",    // Optional, validated if provided
    phone: "",    // Optional, validated if provided
  });
  
  // Form validation and submission state
  const [errors, setErrors] = useState({});         // Holds validation errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Users and workers management state
  const [users, setUsers] = useState([]);           // All users in the system
  const [assignedUsers, setAssignedUsers] = useState([]); // Current store workers
  const [search, setSearch] = useState("");         // Owner search input
  const [filteredUsers, setFilteredUsers] = useState([]); // Filtered users for owner selection

  // Related store data (only used in edit mode)
  const [items, setItems] = useState([]);           // Store's inventory
  const [receipts, setReceipts] = useState([]);     // Store's transaction history

  // Data fetching for edit mode
  useEffect(() => {
    if (id) {
      // 1. Fetch main store data
      api.get(`/stores/${id}`)
        .then((res) => {
          const store = res.data;
          // Update form with store details
          setForm(store);
          // Extract and normalize worker IDs from the store data
          const workerUsers = extractWorkerIds(Array.isArray(store.workers) ? store.workers : []);
          setAssignedUsers(workerUsers);

          // If the store has a populated owner field, use it directly
          if (store.ownerId && typeof store.ownerId === 'object') {
            setSearch(`${store.ownerId.name} ${store.ownerId.lastname}`);
          }
          // Otherwise we'll rely on the useEffect that watches for users to load
          
          console.log("Store data loaded:", store);
        })
        .catch(error => {
          console.error("Error fetching store:", error);
          setErrors({ submit: "Failed to load store data" });
        });

      // 2. Fetch store's inventory
      api.get(`/items?storeId=${id}`)
        .then((res) => setItems(res.data))
        .catch(error => console.error("Error fetching items:", error));

      // 3. Fetch store's transaction history
      api.get(`/receipts?storeId=${id}`)
        .then((res) => setReceipts(res.data))
        .catch(error => console.error("Error fetching receipts:", error));
    }
  }, [id]);

  // Fetch available users for store owner selection and worker assignment
  useEffect(() => {
    api.get("/users")
      .then((res) => setUsers(res.data))
      .catch(error => console.error("Error fetching users:", error));
  }, []);

  // Filter users based on search input for owner selection
  // This effect updates the dropdown list for owner selection
  useEffect(() => {
    setFilteredUsers(
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.lastname?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, users]);

  // Set owner search field whenever form or users list changes
  useEffect(() => {
    if (form.ownerId && users.length > 0) {
      // Handle both populated and unpopulated owner fields
      if (typeof form.ownerId === 'object') {
        // If ownerId is already populated with user object
        setSearch(`${form.ownerId.name} ${form.ownerId.lastname}`);
      } else {
        // If we only have the owner's ID
        const owner = users.find(u => u._id === form.ownerId);
        if (owner) {
          setSearch(`${owner.name} ${owner.lastname}`);
        } else {
          console.warn("Owner not found in users list. Owner ID:", form.ownerId);
          setErrors(prev => ({
            ...prev,
            ownerId: "Store owner not found in users list"
          }));
        }
      }
    }
  }, [form.ownerId, users]);

  // Handle form field changes
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Form validation
  // Returns true if form is valid, false otherwise
  // This is called before submitting the form
  const validateForm = () => {
    const newErrors = {};
    // Required fields validation
    if (!form.name) newErrors.name = "Store name is required";
    if (!form.wilaya) newErrors.wilaya = "Wilaya is required";
    if (!form.city) newErrors.city = "City is required";
    if (!form.ownerId) newErrors.ownerId = "Store owner is required";
    
    // Optional fields format validation
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      newErrors.phone = "Phone should be 10 digits";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission for creating/updating store
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First validate the form
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Prepare the data for submission
      // Workers are managed separately through dedicated endpoints,
      // so we exclude them from the main store update
      const { workers, ...formData } = form;
      
      let response;
      if (id) {
        // Update existing store
        response = await api.put(`/stores/${id}`, formData);
        console.log("Store updated:", response.data);
      } else {
        // Create new store
        response = await api.post("/stores", formData);
        console.log("Store created:", response.data);
      }
      
      // Redirect to stores list after successful save
      navigate("/stores");
    } catch (error) {
      console.error("Error saving store:", error);
      // Set appropriate error message based on the error type
      setErrors({
        submit: error.response?.data?.error || 
               error.message === "Network Error" ? "Network error - please check your connection" :
               "Failed to save store"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle owner selection from the dropdown
  const selectOwner = (user) => {
    // Update form with selected owner's ID
    setForm({ ...form, ownerId: user._id });
    // Update search input with owner's full name
    setSearch(`${user.name} ${user.lastname}`);
  };

  // Utility function to normalize worker array
  // Converts different worker data formats to a consistent array of user IDs
  const extractWorkerIds = (workers = []) =>
    workers.map(w => (typeof w.userId === 'object' ? w.userId._id : String(w.userId)));

  // Handle worker assignment/unassignment
  const toggleUserAssignment = async (userId) => {
    try {
      const currentlyAssigned = assignedUsers.includes(userId);

      // 1. Optimistic UI update - Update UI immediately before server response
      const nextAssigned = currentlyAssigned
        ? assignedUsers.filter(id => id !== userId)
        : [...assignedUsers, userId];
      setAssignedUsers(nextAssigned);

      // 2. Server update
      let res;
      if (currentlyAssigned) {
        // Remove worker from store
        res = await api.delete(`/stores/${id}/workers/${userId}`);
      } else {
        // Add worker to store
        res = await api.post(`/stores/${id}/workers`, {
          userId,
          position: 'worker',
        });
      }

      // 3. Sync UI with server response
      const updatedStore = res.data;
      const serverWorkerIds = extractWorkerIds(
        Array.isArray(updatedStore.workers) ? updatedStore.workers : []
      );
      setAssignedUsers(serverWorkerIds);
      console.log('Workers synced with server:', serverWorkerIds);
      
    } catch (err) {
      console.error('Error toggling worker:', err);
      
      // 4. Error handling - Revert UI to server state
      try {
        // Reload current worker list from server
        const r = await api.get(`/stores/${id}`);
        const serverWorkerIds = extractWorkerIds(
          Array.isArray(r.data.workers) ? r.data.workers : []
        );
        setAssignedUsers(serverWorkerIds);
      } catch (e) {
        console.error('Failed to reload workers after error:', e);
      }

      // Display error message
      setErrors(prev => ({
        ...prev,
        submit: err.response?.data?.error || 'Failed to update store workers'
      }));
    }
  };




  return (
    <div className="store-form-container">
      {/* Card for store info */}
      <div className="store-form-card">
        <h2>{id ? "Edit Store" : "Add Store"}</h2>
        <form className="store-form-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Store Name *</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={errors.name ? "error" : ""}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="wilaya">Wilaya *</label>
            <input
              id="wilaya"
              name="wilaya"
              value={form.wilaya}
              onChange={handleChange}
              className={errors.wilaya ? "error" : ""}
            />
            {errors.wilaya && <span className="error-message">{errors.wilaya}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="city">City *</label>
            <input
              id="city"
              name="city"
              value={form.city}
              onChange={handleChange}
              className={errors.city ? "error" : ""}
            />
            {errors.city && <span className="error-message">{errors.city}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="registre">Registration Number</label>
            <input
              id="registre"
              name="registre"
              value={form.registre}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="address">Store Address</label>
            <input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              className={errors.phone ? "error" : ""}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          {/* Owner select */}
          <div className="form-group owner-select">
            <label htmlFor="ownerId">Store Owner *</label>
            <input
              id="ownerId"
              name="ownerId"
              placeholder="Search and select owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className={errors.ownerId ? "error" : ""}
            />
            {errors.ownerId && <span className="error-message">{errors.ownerId}</span>}
            {search && filteredUsers.length > 0 && (
              <div className="dropdown">
                {filteredUsers.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => selectOwner(u)}
                    className="dropdown-item"
                  >
                    {u.name} {u.lastname}
                  </div>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="submit-error">
              {errors.submit}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? "Saving..." : (id ? "Update Store" : "Add Store")}
          </button>
        </form>
      </div>

      {/* USERS SECTION */}
      {id && (
        <>
          <div className="store-form-card users-section">
            <h3>👥 Assign Users to Store</h3>
            <div className="users-list">
              {users.map((u) => {
                const isAssigned = assignedUsers.includes(u._id);
                return (
                  <div key={u._id} className="user-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleUserAssignment(u._id)}
                      />
                      {u.name} {u.lastname}
                    </label>
                    {isAssigned && (
                      <button
                        className="remove-button"
                        onClick={() => toggleUserAssignment(u._id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ITEMS SECTION */}
          <div className="store-form-card items-section">
            <h3>📦 Items in this Store</h3>
            {items.length > 0 ? (
              items.map((it) => (
                <div key={it._id} className="item">
                  <strong>{it.name}</strong> — ref: {it.reference} — price: {it.price} DA
                </div>
              ))
            ) : (
              <p className="no-items">No items assigned to this store.</p>
            )}
          </div>

          {/* RECEIPTS SECTION */}
          <div className="store-form-card receipts-section">
            <h3>🧾 Receipts</h3>
            {receipts.length > 0 ? (
              receipts.map((r) => (
                <div key={r._id} className="receipt">
                  Receipt #{r._id.slice(-5)} — total: {r.pricePayed || 0} DA — date:{" "}
                  {new Date(r.dateOfAdding).toLocaleDateString()}
                </div>
              ))
            ) : (
              <p className="no-receipts">No receipts for this store yet.</p>
            )}
          </div>
        </>
      )}

    </div>
  );
}
