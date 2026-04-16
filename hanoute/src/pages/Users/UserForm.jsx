import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";

export default function UserForm() {
	const [searchParams] = useSearchParams();
	const id = searchParams.get("id");
	const navigate = useNavigate();

	const [form, setForm] = useState({ name: '', lastname: '', email: '', password: '', dateofbirth: '' });
	const [imageFile, setImageFile] = useState(null);
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (id) {
			api.get(`/users/${id}`)
				.then((res) => setForm(res.data))
				.catch(error => {
					console.error("Error loading user:", error);
					setErrors({ submit: "Failed to load user data" });
				});
		}
	}, [id]);

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

	const validateForm = () => {
		const newErrors = {};
		if (!form.name) newErrors.name = "First name is required";
		if (!form.lastname) newErrors.lastname = "Last name is required";
		if (!form.email) newErrors.email = "Email is required";
		else if (!/\S+@\S+\.\S+/.test(form.email)) {
			newErrors.email = "Invalid email format";
		}
		if (!id && !form.password) newErrors.password = "Password is required for new users";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) return;

		setIsSubmitting(true);
		try {
			// Create a clean form object without empty values
			const cleanForm = {};
			Object.entries(form).forEach(([key, value]) => {
				if (value !== undefined && value !== '') {
					cleanForm[key] = value;
				}
			});

			let response;
			if (imageFile) {
				// If we have a file, use FormData
				const formData = new FormData();
				// Add all form fields to FormData
				Object.entries(cleanForm).forEach(([key, value]) => {
					formData.append(key, value);
				});
				formData.append('image', imageFile);

				// Set the proper headers for multipart/form-data
				const config = {
					headers: {
						'Content-Type': 'multipart/form-data'
					}
				};

				if (id) {
					response = await api.put(`/users/${id}`, formData, config);
				} else {
					response = await api.post('/users', formData, config);
				}
			} else {
				// If no file, send JSON
				if (id) {
					response = await api.put(`/users/${id}`, cleanForm);
				} else {
					response = await api.post('/users', cleanForm);
				}
			}

			console.log("User saved successfully:", response.data);
			navigate('/users');
		} catch (err) {
			console.error("Save failed:", err);
			setErrors({
				submit: err.response?.data?.error || 
						err.response?.data?.message || 
						"Failed to save user - " + (err.message || "Please check all required fields")
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
			<h2 style={{ marginBottom: '20px' }}>{id ? 'Edit User' : 'Add User'}</h2>
			<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
				<div style={{ position: 'relative' }}>
					<input
						name="name"
						placeholder="First name *"
						value={form.name || ''}
						onChange={handleChange}
						style={{
							width: '100%',
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${errors.name ? '#dc3545' : '#ccc'}`
						}}
					/>
					{errors.name && <span style={{ color: '#dc3545', fontSize: '0.8em', position: 'absolute', bottom: '-20px' }}>{errors.name}</span>}
				</div>

				<div style={{ position: 'relative' }}>
					<input
						name="lastname"
						placeholder="Last name *"
						value={form.lastname || ''}
						onChange={handleChange}
						style={{
							width: '100%',
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${errors.lastname ? '#dc3545' : '#ccc'}`
						}}
					/>
					{errors.lastname && <span style={{ color: '#dc3545', fontSize: '0.8em', position: 'absolute', bottom: '-20px' }}>{errors.lastname}</span>}
				</div>

				<div style={{ position: 'relative' }}>
					<input
						name="email"
						placeholder="Email *"
						type="email"
						value={form.email || ''}
						onChange={handleChange}
						style={{
							width: '100%',
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${errors.email ? '#dc3545' : '#ccc'}`
						}}
					/>
					{errors.email && <span style={{ color: '#dc3545', fontSize: '0.8em', position: 'absolute', bottom: '-20px' }}>{errors.email}</span>}
				</div>

				<div style={{ position: 'relative' }}>
					<input
						name="password"
						placeholder={id ? "Password (leave empty to keep current)" : "Password *"}
						type="password"
						value={form.password || ''}
						onChange={handleChange}
						style={{
							width: '100%',
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${errors.password ? '#dc3545' : '#ccc'}`
						}}
					/>
					{errors.password && <span style={{ color: '#dc3545', fontSize: '0.8em', position: 'absolute', bottom: '-20px' }}>{errors.password}</span>}
				</div>

				<div style={{ position: 'relative' }}>
					<input
						name="dateofbirth"
						placeholder="Date of birth"
						type="date"
						value={form.dateofbirth || ''}
						onChange={handleChange}
						style={{
							width: '100%',
							padding: '8px',
							borderRadius: '4px',
							border: '1px solid #ccc'
						}}
					/>
				</div>

				<div style={{ marginTop: '10px' }}>
					<label style={{ display: 'block', marginBottom: '5px' }}>Profile Image</label>
					<input
						type="file"
						onChange={(e) => setImageFile(e.target.files[0])}
						accept="image/*"
						style={{ width: '100%' }}
					/>
				</div>

				{errors.submit && (
					<div style={{
						color: '#dc3545',
						background: '#fde8e8',
						padding: '10px',
						borderRadius: '4px',
						marginTop: '10px',
						textAlign: 'center'
					}}>
						{errors.submit}
					</div>
				)}

				<button
					type="submit"
					disabled={isSubmitting}
					style={{
						background: isSubmitting ? '#ccc' : '#007bff',
						color: 'white',
						border: 'none',
						padding: '10px',
						borderRadius: '4px',
						cursor: isSubmitting ? 'not-allowed' : 'pointer',
						marginTop: '20px'
					}}
				>
					{isSubmitting ? 'Saving...' : (id ? 'Update User' : 'Add User')}
				</button>
			</form>
		</div>
	);
}

