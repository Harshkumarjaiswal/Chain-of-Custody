import { useState, useEffect } from 'react';
import { getTasks, createTask, respondToTask, updateTaskStatus, getUsers, getCases, getEvidenceByCase } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiPlus, HiCheck, HiX } from 'react-icons/hi';

const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [users, setUsers] = useState([]);
    const [cases, setCases] = useState([]);
    const [evidences, setEvidences] = useState([]);
    const [form, setForm] = useState({
        caseId: '', evidenceId: '', title: '', description: '', assignedTo: '', priority: 'medium', dueDate: ''
    });
    const [rejectModal, setRejectModal] = useState({ show: false, taskId: null, reason: '' });

    useEffect(() => {
        fetchTasks();
        if (['admin', 'supervisor'].includes(user?.role)) {
            getUsers().then(r => setUsers(r.data)).catch(() => { });
            getCases().then(r => setCases(r.data)).catch(() => { });
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [statusFilter]);

    const fetchTasks = async () => {
        try {
            const res = await getTasks({ status: statusFilter || undefined });
            setTasks(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCaseChange = async (caseId) => {
        setForm({ ...form, caseId, evidenceId: '' });
        if (caseId) {
            try {
                const res = await getEvidenceByCase(caseId);
                setEvidences(res.data);
            } catch { setEvidences([]); }
        } else {
            setEvidences([]);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createTask(form);
            setShowModal(false);
            setForm({ caseId: '', evidenceId: '', title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
            fetchTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create task');
        }
    };

    const handleAccept = async (taskId) => {
        try {
            await respondToTask(taskId, { action: 'accept' });
            fetchTasks();
        } catch { alert('Failed to accept task'); }
    };

    const handleReject = async () => {
        try {
            await respondToTask(rejectModal.taskId, { action: 'reject', rejectionReason: rejectModal.reason });
            setRejectModal({ show: false, taskId: null, reason: '' });
            fetchTasks();
        } catch { alert('Failed to reject task'); }
    };

    const handleComplete = async (taskId) => {
        try {
            await updateTaskStatus(taskId, 'completed');
            fetchTasks();
        } catch { alert('Failed'); }
    };

    const canAssign = ['admin', 'supervisor'].includes(user?.role);

    if (loading) return <div className="loader"><div className="spinner"></div></div>;

    const statusColor = (s) => {
        const map = { pending: 'yellow', accepted: 'blue', rejected: 'red', 'in-progress': 'purple', completed: 'green' };
        return map[s] || 'cyan';
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Task Assignments</h1>
                    <p className="page-subtitle">{tasks.length} tasks</p>
                </div>
                {canAssign && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <HiPlus /> Assign Task
                    </button>
                )}
            </div>

            <div className="filter-bar">
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {tasks.length === 0 ? (
                <div className="empty-state">
                    <h3>No tasks found</h3>
                    <p>{canAssign ? 'Create a new task assignment' : 'No tasks assigned to you yet'}</p>
                </div>
            ) : (
                tasks.map(t => (
                    <div key={t._id} className="task-card">
                        <div className="task-card-header">
                            <div className="task-card-title">{t.title}</div>
                            <span className={`badge badge-${statusColor(t.status)}`}>{t.status}</span>
                        </div>
                        {t.description && <div className="task-card-body">{t.description}</div>}
                        <div className="task-card-footer">
                            <div className="task-card-meta">
                                <span>📁 {t.caseId?.title || t.caseId?.caseId}</span>
                                <span>📎 {t.evidenceId?.originalName}</span>
                                <span>👤 {t.assignedTo?.name}</span>
                                {t.dueDate && <span>📅 {new Date(t.dueDate).toLocaleDateString()}</span>}
                            </div>
                            <div className="flex gap-2">
                                {t.status === 'pending' && t.assignedTo?._id === user?.id && (
                                    <>
                                        <button className="btn btn-success btn-sm" onClick={() => handleAccept(t._id)}>
                                            <HiCheck /> Accept
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => setRejectModal({ show: true, taskId: t._id, reason: '' })}>
                                            <HiX /> Reject
                                        </button>
                                    </>
                                )}
                                {t.status === 'accepted' && t.assignedTo?._id === user?.id && (
                                    <button className="btn btn-success btn-sm" onClick={() => handleComplete(t._id)}>
                                        Mark Complete
                                    </button>
                                )}
                            </div>
                        </div>
                        {t.status === 'rejected' && t.rejectionReason && (
                            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--accent-red-dim)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-red)' }}>
                                Rejection Reason: {t.rejectionReason}
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* Create Task Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Assign Analysis Task</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Case</label>
                                <select className="form-select" value={form.caseId} onChange={(e) => handleCaseChange(e.target.value)} required>
                                    <option value="">Select case</option>
                                    {cases.map(c => <option key={c._id} value={c._id}>{c.caseId} - {c.title}</option>)}
                                </select>
                            </div>
                            {evidences.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Evidence</label>
                                    <select className="form-select" value={form.evidenceId} onChange={(e) => setForm({ ...form, evidenceId: e.target.value })} required>
                                        <option value="">Select evidence</option>
                                        {evidences.map(e => <option key={e._id} value={e._id}>{e.originalName}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Task Title</label>
                                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assign To</label>
                                <select className="form-select" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} required>
                                    <option value="">Select analyst</option>
                                    {users.filter(u => u.role === 'analyst').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Due Date (optional)</label>
                                <input type="date" className="form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Assign Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal.show && (
                <div className="modal-overlay" onClick={() => setRejectModal({ show: false, taskId: null, reason: '' })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Reject Task</h2>
                        <div className="form-group">
                            <label className="form-label">Reason for Rejection</label>
                            <textarea className="form-textarea" placeholder="Provide a reason..."
                                value={rejectModal.reason} onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })} required />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setRejectModal({ show: false, taskId: null, reason: '' })}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleReject}>Reject Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
