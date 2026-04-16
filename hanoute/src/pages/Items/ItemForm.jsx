
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";
import "./ItemForm.scss";

export default function ItemForm() {
	const [searchParams] = useSearchParams();
	const id = searchParams.get("id");
	const navigate = useNavigate();


	const [form, setForm] = useState({ name: '', reference: '', price: '', unitsPerBox: '', promo: '', storeId: '' });
	const [imageFile, setImageFile] = useState(null);
	const [stores, setStores] = useState([]);


	useEffect(() => {
		// Fetch all stores for the select dropdown
		api.get('/stores').then(res => setStores(res.data));
		if (id) {
			api.get(`/items/${id}`).then((res) => setForm(res.data));
		}
	}, [id]);


	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });


	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			if (!form.storeId) {
				alert('Store is required');
				return;
			}
			if (imageFile) {
				const fd = new FormData();
				Object.entries(form).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v); });
				fd.append('image', imageFile);
				if (id) await api.put(`/items/${id}`, fd);
				else await api.post('/items', fd);
			} else {
				if (id) await api.put(`/items/${id}`, form);
				else await api.post('/items', form);
			}
			navigate('/items');
		} catch (err) {
			console.error(err);
			alert('Save failed');
		}
	};


	return (
		<div className="item-form-container">
			<h2>{id ? 'Edit Item' : 'Add Item'}</h2>
			<form className="item-form-form" onSubmit={handleSubmit}>
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
					<input id="name" name="name" value={form.name || ''} onChange={handleChange} required />
				</div>
				<div className="form-group">
					<label htmlFor="reference">Reference *</label>
					<input id="reference" name="reference" value={form.reference || ''} onChange={handleChange} required />
				</div>
				<div className="form-group">
					<label htmlFor="price">Price *</label>
					<input id="price" name="price" type="number" value={form.price || ''} onChange={handleChange} required />
				</div>
				<div className="form-group">
					<label htmlFor="unitsPerBox">Units per box</label>
					<input id="unitsPerBox" name="unitsPerBox" type="number" value={form.unitsPerBox || ''} onChange={handleChange} />
				</div>
				<div className="form-group">
					<label htmlFor="promo">Promo</label>
					<input id="promo" name="promo" value={form.promo || ''} onChange={handleChange} />
				</div>
				<div className="form-group">
					<label htmlFor="image">Image</label>
					<input id="image" type="file" onChange={(e) => setImageFile(e.target.files[0])} />
				</div>
				<button type="submit">{id ? 'Update' : 'Add'}</button>
			</form>
		</div>
	);
}
