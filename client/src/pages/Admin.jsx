import { useState, useEffect } from 'react';
import { getUsers, updateUserRole, toggleUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUserGroup } from 'react-icons/hi';

const Admin = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await getUsers();
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, role) => {
        try {
            await updateUserRole(userId, role);
            fetchUsers();
        } catch { alert('Failed to update role'); }
    };

    const handleToggle = async (userId) => {
        try {
            await toggleUser(userId);
            fetchUsers();
        } catch { alert('Failed to toggle user status'); }
    };

    if (user?.role !== 'admin') {
        return <div className="empty-state"><h3>Access Denied</h3><p>Admin privileges required</p></div>;
    }

    if (loading) return <div className="loader"><div className="spinner"></div></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">{users.length} registered users</p>
                </div>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                                            {u.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                                    </div>
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <select
                                        className="form-select"
                                        value={u.role}
                                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                        style={{ maxWidth: 150, padding: '4px 8px', fontSize: 12 }}
                                        disabled={u._id === user.id}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="officer">Officer</option>
                                        <option value="analyst">Analyst</option>
                                        <option value="supervisor">Supervisor</option>
                                    </select>
                                </td>
                                <td>{u.department || '—'}</td>
                                <td>
                                    <span className={`badge badge-${u.isActive ? 'green' : 'red'}`}>
                                        {u.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>
                                    {u._id !== user.id && (
                                        <button
                                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                                            onClick={() => handleToggle(u._id)}
                                        >
                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Admin;
