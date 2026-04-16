import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function AdminList() {
	const [admins, setAdmins] = useState([]);

	useEffect(() => {
		api.get("/admins").then((res) => setAdmins(res.data));
	}, []);

	const deleteAdmin = async (id) => {
		if (window.confirm("Delete this admin?")) {
			await api.delete(`/admins/${id}`);
			setAdmins(admins.filter((a) => a._id !== id));
		}
	};

	return (
		<div style={{ padding: "20px" }}>
			<h2>Admins</h2>
			<Link to="/admins/add"><button>Add Admin</button></Link>
			<table>
				<thead>
					<tr><th>Username</th><th>Actions</th></tr>
				</thead>
				<tbody>
					{admins.map((a) => (
						<tr key={a._id}>
							<td>{a.username}</td>
							<td>
								<Link to={`/admins/add?id=${a._id}`}><button>Edit</button></Link>
								<button onClick={() => deleteAdmin(a._id)} style={{ marginLeft: 8 }}>Delete</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
