import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function UserList() {
	const [users, setUsers] = useState([]);

	useEffect(() => {
		api.get("/users").then((res) => setUsers(res.data));
	}, []);

	const deleteUser = async (id) => {
		if (window.confirm("Delete this user?")) {
			await api.delete(`/users/${id}`);
			setUsers(users.filter((u) => u._id !== id));
		}
	};

	return (
		<div style={{ padding: '20px' }}>
			<h2>Users</h2>
			<Link to="/users/add"><button>Add User</button></Link>
			<table>
				<thead>
					<tr><th>Name</th><th>Email</th><th>Actions</th></tr>
				</thead>
				<tbody>
					{users.map((u) => (
						<tr key={u._id}>
							<td>{u.name} {u.lastname}</td>
							<td>{u.email}</td>
							<td>
								<Link to={`/users/add?id=${u._id}`}><button>Edit</button></Link>
								<button onClick={() => deleteUser(u._id)} style={{ marginLeft: 8 }}>Delete</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
