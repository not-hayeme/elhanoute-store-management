import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fileUrl } from "../../api";

export default function ItemList() {
	const [items, setItems] = useState([]);

	useEffect(() => {
		api.get("/items").then((res) => setItems(res.data));
	}, []);

	const deleteItem = async (id) => {
		if (window.confirm("Delete this item?")) {
			await api.delete(`/items/${id}`);
			setItems(items.filter((i) => i._id !== id));
		}
	};

	return (
		<div style={{ padding: "20px" }}>
			<h2>Items</h2>
			<Link to="/items/add"><button>Add Item</button></Link>
			<table>
				<thead>
					<tr><th>Name</th><th>Reference</th><th>Price</th><th>Image</th><th>Actions</th></tr>
				</thead>
				<tbody>
					{items.map((it) => (
						<tr key={it._id}>
							<td>{it.name}</td>
							<td>{it.reference}</td>
							<td>{it.price}</td>
							<td>{it.image ? <img src={fileUrl(it.image)} alt={it.name} width={80} /> : null}</td>
							<td>
								<Link to={`/items/add?id=${it._id}`}><button>Edit</button></Link>
								<button onClick={() => deleteItem(it._id)} style={{ marginLeft: 8 }}>Delete</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

