import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function ReceiptList() {
	const [receipts, setReceipts] = useState([]);

	useEffect(() => {
		api.get("/receipts").then((res) => setReceipts(res.data));
	}, []);

	const deleteReceipt = async (id) => {
		if (window.confirm("Delete this receipt?")) {
			await api.delete(`/receipts/${id}`);
			setReceipts(receipts.filter((r) => r._id !== id));
		}
	};

	return (
		<div style={{ padding: '20px' }}>
			<h2>Receipts</h2>
			<Link to="/receipts/add"><button>Add Receipt</button></Link>
			<table>
				<thead>
					<tr><th>Customer</th><th>Items</th><th>Price Paid</th><th>Actions</th></tr>
				</thead>
				<tbody>
					{receipts.map((r) => (
						<tr key={r._id}>
							<td>{r.customerId ? (r.customerId.name || r.customerId) : ''}</td>
							<td>{Array.isArray(r.items) ? r.items.map(it => `${it.quantity}x`).join(', ') : ''}</td>
							<td>{r.pricePayed}</td>
							<td>
								<Link to={`/receipts/add?id=${r._id}`}><button>Edit</button></Link>
								<button onClick={() => deleteReceipt(r._id)} style={{ marginLeft: 8 }}>Delete</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
