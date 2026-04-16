import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function StoreList() {
	const [stores, setStores] = useState([]);

	useEffect(() => {
		api.get("/stores").then((res) => setStores(res.data));
	}, []);

	const deleteStore = async (id) => {
		if (window.confirm("Delete this store?")) {
			await api.delete(`/stores/${id}`);
			setStores(stores.filter((s) => s._id !== id));
		}
	};

	return (
		<div style={{ padding: '20px' }}>
			<h2>Stores</h2>
			<Link to="/stores/add"><button>Add Store</button></Link>
			<table>
				<thead>
					<tr><th>Name</th><th>City</th><th>Phone</th><th>Actions</th></tr>
				</thead>
				<tbody>
					{stores.map((s) => (
						<tr key={s._id}>
							<td>{s.name}</td>
							<td>{s.city}</td>
							<td>{s.phone}</td>
							<td>
								<Link to={`/stores/add?id=${s._id}`}><button>Edit</button></Link>
								<button onClick={() => deleteStore(s._id)} style={{ marginLeft: 8 }}>Delete</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
