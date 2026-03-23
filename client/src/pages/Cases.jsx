import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCases, createCase, getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiPlus, HiSearch, HiOutlineFolder } from 'react-icons/hi';

const Cases = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({
        title: '', description: '', priority: 'medium', assignedInvestigators: []
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCases();
        if (['admin', 'supervisor'].includes(user?.role)) {
            getUsers().then(res => setUsers(res.data)).catch(() => { });
        }
    }, []);

    const fetchCases = async () => {
        try {
            const res = await getCases({ status: statusFilter || undefined });
            setCases(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCases(); }, [statusFilter]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await createCase(form);
            setShowModal(false);
            setForm({ title: '', description: '', priority: 'medium', assignedInvestigators: [] });
            fetchCases();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create case');
        }
    };

    const filtered = cases.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.caseId.toLowerCase().includes(search.toLowerCase())
    );

    const canCreate = ['admin', 'officer', 'supervisor'].includes(user?.role);

    if (loading) return <div className="loader"><div className="spinner"></div></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Cases</h1>
                    <p className="page-subtitle">{cases.length} investigation cases</p>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <HiPlus /> New Case
                    </button>
                )}
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative' }}>
                    <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="form-input"
                        placeholder="Search cases..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 36 }}
                    />
                </div>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <HiOutlineFolder size={48} />
                    <h3>No cases found</h3>
                    <p>Create a new case to get started</p>
                </div>
            ) : (
                <div className="case-grid">
                    {filtered.map(c => (
                        <div key={c._id} className="case-card" onClick={() => navigate(`/cases/${c._id}`)}>
                            <div className="case-card-id">{c.caseId}</div>
                            <div className="case-card-title">{c.title}</div>
                            <div className="case-card-desc">{c.description}</div>
                            <div className="case-card-footer">
                                <span className={`badge badge-${c.priority === 'critical' ? 'red' : c.priority === 'high' ? 'yellow' : c.priority === 'medium' ? 'blue' : 'green'
                                    }`}>
                                    {c.priority}
                                </span>
                                <span className={`badge badge-${c.status === 'open' ? 'green' : c.status === 'in-progress' ? 'yellow' : 'red'}`}>
                                    {c.status}
                                </span>
                            </div>
                            <div className="case-card-date" style={{ marginTop: 8 }}>
                                Created {new Date(c.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Create New Case</h2>
                        {error && <div className="alert alert-error">{error}</div>}
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Case Title</label>
                                <input className="form-input" placeholder="Enter case title" value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" placeholder="Describe the investigation..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select className="form-select" value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            {users.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Assign Investigators</label>
                                    <select
                                        className="form-select"
                                        multiple
                                        size={3}
                                        value={form.assignedInvestigators}
                                        onChange={(e) => setForm({
                                            ...form,
                                            assignedInvestigators: Array.from(e.target.selectedOptions, o => o.value)
                                        })}
                                        style={{ height: 'auto' }}
                                    >
                                        {users.filter(u => u._id !== user.id).map(u => (
                                            <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Case</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cases;
