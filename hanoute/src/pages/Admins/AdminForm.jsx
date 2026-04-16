import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";

export default function AdminForm() {
	const [searchParams] = useSearchParams();
	const id = searchParams.get("id");
	const navigate = useNavigate();
	const [form, setForm] = useState({ username: '', password: '' });

	useEffect(() => {
		if (id) api.get(`/admins/${id}`).then((res) => setForm(res.data));
	}, [id]);

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (id) await api.put(`/admins/${id}`, form);
		else await api.post('/admins', form);
		navigate('/admins');
	};

		return (
			<div style={{ padding: '20px' }}>
				<h2>{id ? 'Edit Admin' : 'Add Admin'}</h2>
				<form onSubmit={handleSubmit}>
					<input name="username" placeholder="Username" value={form.username} onChange={handleChange} />
					<input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} />
					<button type="submit">{id ? 'Update' : 'Add'}</button>
				</form>
			</div>
			);
		}


