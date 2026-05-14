import { useState, useEffect } from 'react';
import { getUsers, updateUserRole, toggleUser, getUserById } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LEVEL_COLORS = {
    junior: '#6b7280', mid: '#3b82f6', senior: '#8b5cf6', lead: '#f59e0b', expert: '#10b981'
};

const Admin = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

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
            // refresh selected user if open
            if (selectedUser?._id === userId) {
                const res = await getUserById(userId);
                setSelectedUser(res.data);
            }
        } catch { alert('Failed to toggle user status'); }
    };

    const handleViewProfile = async (userId) => {
        setProfileLoading(true);
        try {
            const res = await getUserById(userId);
            setSelectedUser(res.data);
        } catch { alert('Failed to load user profile'); }
        finally { setProfileLoading(false); }
    };

    if (user?.role !== 'admin') {
        return <div className="empty-state"><h3>Access Denied</h3><p>Admin privileges required</p></div>;
    }

    if (loading) return <div className="loader"><div className="spinner"></div></div>;

    const avatarUrl = (u) => u?.avatar
        ? (u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000${u.avatar}`)
        : null;

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
                            <th>Level</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id} style={{ cursor: 'pointer' }}>
                                <td onClick={() => handleViewProfile(u._id)}>
                                    <div className="flex items-center gap-2">
                                        {avatarUrl(u)
                                            ? <img src={avatarUrl(u)} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
                                            : <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{u.name?.charAt(0)?.toUpperCase()}</div>
                                        }
                                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{u.name}</span>
                                    </div>
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <select
                                        className="form-select"
                                        value={u.role}
                                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                        style={{ maxWidth: 140, padding: '4px 8px', fontSize: 12 }}
                                        disabled={u._id === user.id || u._id === user._id}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="officer">Officer</option>
                                        <option value="analyst">Analyst</option>
                                        <option value="supervisor">Supervisor</option>
                                    </select>
                                </td>
                                <td>{u.department || '—'}</td>
                                <td>
                                    {u.level && (
                                        <span style={{ background: LEVEL_COLORS[u.level], color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, textTransform: 'capitalize' }}>
                                            {u.level}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className={`badge badge-${u.isActive ? 'green' : 'red'}`}>
                                        {u.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td onClick={e => e.stopPropagation()}>
                                    {u._id !== user.id && u._id !== user._id && (
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

            {/* User Profile Modal */}
            {(selectedUser || profileLoading) && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="modal" style={{ maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        {profileLoading ? (
                            <div className="loader"><div className="spinner"></div></div>
                        ) : (
                            <>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                    {avatarUrl(selectedUser)
                                        ? <img src={avatarUrl(selectedUser)} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                                        : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' }}>
                                            {selectedUser?.name?.charAt(0)?.toUpperCase()}
                                          </div>
                                    }
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 20 }}>{selectedUser?.name}</div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{selectedUser?.role}</span>
                                            {selectedUser?.level && (
                                                <span style={{ background: LEVEL_COLORS[selectedUser.level], color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, textTransform: 'capitalize' }}>
                                                    {selectedUser.level}
                                                </span>
                                            )}
                                            <span className={`badge badge-${selectedUser?.isActive ? 'green' : 'red'}`}>
                                                {selectedUser?.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedUser?.email}</div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>DEPARTMENT</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedUser?.department || '—'}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>JOINED</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(selectedUser?.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                {/* Bio */}
                                {selectedUser?.bio && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>BIO</div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedUser.bio}</p>
                                    </div>
                                )}

                                {/* Work History */}
                                {selectedUser?.workHistory?.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>WORK HISTORY</div>
                                        {selectedUser.workHistory.map((w, i) => (
                                            <div key={i} style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 8 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{w.title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {w.organization}
                                                    {w.from && ` • ${w.from} → ${w.current ? 'Present' : (w.to || '—')}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                    {selectedUser?._id !== user._id && selectedUser?._id !== user.id && (
                                        <button
                                            className={`btn btn-sm ${selectedUser?.isActive ? 'btn-danger' : 'btn-success'}`}
                                            onClick={() => handleToggle(selectedUser._id)}
                                        >
                                            {selectedUser?.isActive ? 'Deactivate User' : 'Activate User'}
                                        </button>
                                    )}
                                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(null)}>Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
