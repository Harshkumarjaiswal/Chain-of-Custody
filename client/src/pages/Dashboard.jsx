import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCases, getAllEvidence, getTasks, getAllCustodyLogs } from '../services/api';
import {
    HiOutlineFolder, HiOutlineShieldCheck, HiOutlineClipboardList,
    HiOutlineDocumentReport
} from 'react-icons/hi';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ cases: 0, evidence: 0, tasks: 0 });
    const [recentCases, setRecentCases] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [casesRes, evidenceRes, tasksRes, logsRes] = await Promise.all([
                    getCases(),
                    getAllEvidence(),
                    getTasks(),
                    getAllCustodyLogs(10)
                ]);
                setStats({
                    cases: casesRes.data.length,
                    evidence: evidenceRes.data.length,
                    tasks: tasksRes.data.length
                });
                setRecentCases(casesRes.data.slice(0, 5));
                setRecentLogs(logsRes.data.slice(0, 8));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loader"><div className="spinner"></div></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name}</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card cyan" onClick={() => navigate('/cases')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon cyan"><HiOutlineFolder /></div>
                    <div className="stat-value">{stats.cases}</div>
                    <div className="stat-label">Total Cases</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green"><HiOutlineShieldCheck /></div>
                    <div className="stat-value">{stats.evidence}</div>
                    <div className="stat-label">Evidence Items</div>
                </div>
                <div className="stat-card purple" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon purple"><HiOutlineClipboardList /></div>
                    <div className="stat-value">{stats.tasks}</div>
                    <div className="stat-label">Active Tasks</div>
                </div>
                <div className="stat-card yellow">
                    <div className="stat-icon yellow"><HiOutlineDocumentReport /></div>
                    <div className="stat-value">{recentLogs.length}</div>
                    <div className="stat-label">Recent Activities</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Cases</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/cases')}>View All</button>
                    </div>
                    {recentCases.length === 0 ? (
                        <div className="empty-state"><p>No cases yet</p></div>
                    ) : (
                        recentCases.map(c => (
                            <div
                                key={c._id}
                                className="flex items-center justify-between"
                                style={{
                                    padding: '10px 0',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => navigate(`/cases/${c._id}`)}
                            >
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)' }}>
                                        {c.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.caseId}</div>
                                </div>
                                <span className={`badge badge-${c.status === 'open' ? 'green' : c.status === 'in-progress' ? 'yellow' : 'red'}`}>
                                    {c.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Activity</h3>
                    </div>
                    {recentLogs.length === 0 ? (
                        <div className="empty-state"><p>No activity yet</p></div>
                    ) : (
                        <div className="timeline">
                            {recentLogs.map(log => (
                                <div key={log._id} className="timeline-item">
                                    <div className="timeline-time">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                    <div className="timeline-content">
                                        <span className="timeline-user">{log.performedBy?.name}</span>{' '}
                                        {log.action} {log.details && `— ${log.details}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
