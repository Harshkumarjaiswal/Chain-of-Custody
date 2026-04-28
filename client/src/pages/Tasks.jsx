import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks, createTask, respondToTask, updateTaskStatus, getUsers, getCases, getEvidenceByCase } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiPlus, HiCheck, HiX, HiOutlineEye, HiOutlineDownload, HiOutlineDocumentText } from 'react-icons/hi';

const Tasks = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [users, setUsers] = useState([]);
    const [cases, setCases] = useState([]);
    const [evidences, setEvidences] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [form, setForm] = useState({
        caseId: '', evidenceId: '', title: '', description: '', assignedTo: '', priority: 'medium', dueDate: ''
    });
    const [rejectModal, setRejectModal] = useState({ show: false, taskId: null, reason: '' });

    useEffect(() => {
        fetchTasks();
        if (['admin', 'supervisor'].includes(user?.role)) {
            getUsers().then(r => setUsers(r.data)).catch(() => {});
            getCases().then(r => setCases(r.data)).catch(() => {});
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
            if (selectedTask?._id === taskId) {
                const res = await getTasks();
                setSelectedTask(res.data.find(t => t._id === taskId));
            }
        } catch { alert('Failed to accept task'); }
    };

    const handleReject = async () => {
        try {
            await respondToTask(rejectModal.taskId, { action: 'reject', rejectionReason: rejectModal.reason });
            setRejectModal({ show: false, taskId: null, reason: '' });
            setSelectedTask(null);
            fetchTasks();
        } catch { alert('Failed to reject task'); }
    };

    const handleComplete = async (taskId) => {
        try {
            await updateTaskStatus(taskId, 'completed');
            fetchTasks();
            setSelectedTask(null);
        } catch { alert('Failed to mark complete'); }
    };

    const canAssign = ['admin', 'supervisor'].includes(user?.role);
    const isAssignedToMe = (t) => t.assignedTo?._id === user?._id;

    if (loading) return <div className="loader"><div className="spinner"></div></div>;

    const statusColor = (s) => {
        const map = { pending: 'yellow', accepted: 'blue', rejected: 'red', 'in-progress': 'purple', completed: 'green' };
        return map[s] || 'cyan';
    };

    const priorityColor = (p) => {
        const map = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
        return map[p] || '#6b7280';
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
                    <div key={t._id} className="task-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedTask(t)}>
                        <div className="task-card-header">
                            <div className="task-card-title">{t.title}</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ background: priorityColor(t.priority), color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase' }}>{t.priority}</span>
                                <span className={`badge badge-${statusColor(t.status)}`}>{t.status}</span>
                            </div>
                        </div>
                        {t.description && <div className="task-card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{t.description}</div>}
                        <div className="task-card-footer">
                            <div className="task-card-meta">
                                <span>📁 {t.caseId?.title || t.caseId?.caseId || '—'}</span>
                                <span>📎 {t.evidenceId?.originalName || '—'}</span>
                                <span>👤 {t.assignedTo?.name}</span>
                                {t.dueDate && <span>📅 {new Date(t.dueDate).toLocaleDateString()}</span>}
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Click to open →</span>
                        </div>
                        {t.status === 'rejected' && t.rejectionReason && (
                            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--accent-red-dim)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-red)' }}>
                                Rejection Reason: {t.rejectionReason}
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
                    <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h2 className="modal-title" style={{ marginBottom: 4 }}>{selectedTask.title}</h2>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ background: priorityColor(selectedTask.priority), color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase' }}>{selectedTask.priority}</span>
                                    <span className={`badge badge-${statusColor(selectedTask.status)}`}>{selectedTask.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                        </div>

                        {selectedTask.description && (
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>{selectedTask.description}</p>
                        )}

                        {/* Task Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ASSIGNED TO</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedTask.assignedTo?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{selectedTask.assignedTo?.role}</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ASSIGNED BY</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedTask.assignedBy?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{selectedTask.assignedBy?.role}</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CASE</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedTask.caseId?.title || '—'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedTask.caseId?.caseId}</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>DUE DATE</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No deadline'}</div>
                            </div>
                        </div>

                        {/* Evidence Attachment */}
                        {selectedTask.evidenceId && (
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>ATTACHED EVIDENCE</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <HiOutlineDocumentText size={24} color="var(--primary)" />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedTask.evidenceId?.originalName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{selectedTask.evidenceId?.category}</div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            setSelectedTask(null);
                                            navigate(`/evidence/${selectedTask.evidenceId._id}`);
                                        }}
                                    >
                                        <HiOutlineEye /> Open & Analyse
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {selectedTask.status === 'pending' && isAssignedToMe(selectedTask) && (
                                <>
                                    <button className="btn btn-success" onClick={() => handleAccept(selectedTask._id)}>
                                        <HiCheck /> Accept Task
                                    </button>
                                    <button className="btn btn-danger" onClick={() => {
                                        setSelectedTask(null);
                                        setRejectModal({ show: true, taskId: selectedTask._id, reason: '' });
                                    }}>
                                        <HiX /> Reject Task
                                    </button>
                                </>
                            )}
                            {selectedTask.status === 'accepted' && isAssignedToMe(selectedTask) && (
                                <>
                                    {selectedTask.evidenceId && (
                                        <button className="btn btn-primary" onClick={() => {
                                            setSelectedTask(null);
                                            navigate(`/evidence/${selectedTask.evidenceId._id}`);
                                        }}>
                                            <HiOutlineEye /> Open Evidence
                                        </button>
                                    )}
                                    <button className="btn btn-success" onClick={() => handleComplete(selectedTask._id)}>
                                        <HiCheck /> Mark Complete
                                    </button>
                                </>
                            )}
                            {selectedTask.status === 'rejected' && selectedTask.rejectionReason && (
                                <div style={{ padding: '8px 12px', background: 'var(--accent-red-dim)', borderRadius: 6, fontSize: 13, color: 'var(--accent-red)', width: '100%' }}>
                                    Rejection Reason: {selectedTask.rejectionReason}
                                </div>
                            )}
                            {selectedTask.status === 'completed' && (
                                <div style={{ padding: '8px 12px', background: '#d1fae5', borderRadius: 6, fontSize: 13, color: '#065f46', width: '100%' }}>
                                    ✓ Task completed on {selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleString() : '—'}
                                </div>
                            )}
                            <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setSelectedTask(null)}>Close</button>
                        </div>
                    </div>
                </div>
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
                                    <option value="">Select user</option>
                                    {users.filter(u => ['analyst', 'officer'].includes(u.role)).map(u => (
                                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                    ))}
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
                                value={rejectModal.reason} onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })} />
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
