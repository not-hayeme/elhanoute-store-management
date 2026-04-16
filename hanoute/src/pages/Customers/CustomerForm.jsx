
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";
import "./CustomerForm.scss";

export default function CustomerForm() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", city: "", wilaya: "", storeId: ""
  });
  const [stores, setStores] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch all stores for the select dropdown
    api.get('/stores')
      .then(res => setStores(res.data))
      .catch(error => {
        console.error("Error fetching stores:", error);
        setErrors(prev => ({ ...prev, stores: "Failed to load stores" }));
      });

    // Fetch customer data if editing
    if (id) {
      api.get(`/customers/${id}`)
        .then((res) => setForm(res.data))
        .catch(error => {
          console.error("Error fetching customer:", error);
          setErrors(prev => ({ ...prev, fetch: "Failed to load customer data" }));
        });
    }
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.storeId) newErrors.storeId = "Store selection is required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare the data - remove any empty strings
      const submitData = Object.fromEntries(
        Object.entries(form).filter(([_, value]) => value !== "")
      );

      console.log("Submitting customer data:", submitData);

      if (id) {
        await api.put(`/customers/${id}`, submitData);
      } else {
        await api.post("/customers", submitData);
      }
      navigate("/customers");
    } catch (error) {
      console.error("Error saving customer:", error);
      const errorMessage = error.response?.data?.error || "Failed to save customer";
      setErrors(prev => ({
        ...prev,
        submit: errorMessage
      }));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="customer-form-container">
      <h2>{id ? "Edit Customer" : "Add Customer"}</h2>
      <form className="customer-form-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="storeId">Store *</label>
          <select
            id="storeId"
            name="storeId"
            value={form.storeId || ''}
            onChange={handleChange}
            required
          >
            <option value="">Select store</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" value={form.email} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <input id="address" name="address" value={form.address} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input id="city" name="city" value={form.city} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="wilaya">Wilaya</label>
          <input id="wilaya" name="wilaya" value={form.wilaya} onChange={handleChange} />
        </div>
        {errors.submit && (
          <div className="error-message" style={{ marginTop: '10px', color: '#dc3545', textAlign: 'center' }}>
            {errors.submit}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : (id ? 'Update' : 'Add')}
        </button>
      </form>
    </div>
  );
}
