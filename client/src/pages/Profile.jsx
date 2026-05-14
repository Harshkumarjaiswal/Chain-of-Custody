import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword, getTasks, getAllEvidence, uploadAvatar } from '../services/api';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineBriefcase, HiOutlineDocumentText, HiPlus, HiTrash, HiOutlineCamera } from 'react-icons/hi';

const TABS = ['Profile', 'Password', 'Work History', 'Files'];

// Calculate total experience years from work history
const calcTotalYears = (history) => {
    return history.reduce((total, w) => {
        if (!w.from) return total;
        const start = new Date(w.from + '-01');
        const end = w.current ? new Date() : (w.to ? new Date(w.to + '-01') : new Date());
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        return total + Math.max(0, years);
    }, 0);
};

// Map total years to level
const detectLevel = (years) => {
    if (years < 2) return 'junior';
    if (years < 4) return 'mid';
    if (years < 7) return 'senior';
    if (years < 10) return 'lead';
    return 'expert';
};

const LEVEL_COLORS = {
    junior: '#6b7280', mid: '#3b82f6', senior: '#8b5cf6', lead: '#f59e0b', expert: '#10b981'
};

const Profile = () => {
    const { user, loginUser } = useAuth();
    const [tab, setTab] = useState('Profile');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [profile, setProfile] = useState({
        name: user?.name || '',
        department: user?.department || '',
        bio: user?.bio || '',
        level: user?.level || 'junior'
    });

    const [avatarPreview, setAvatarPreview] = useState(
        user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`) : ''
    );
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [workHistory, setWorkHistory] = useState(user?.workHistory || []);
    const [detectedLevel, setDetectedLevel] = useState(user?.level || 'junior');
    const [totalYears, setTotalYears] = useState(0);
    const [tasks, setTasks] = useState([]);
    const [evidence, setEvidence] = useState([]);

    // Auto-detect level whenever work history changes
    useEffect(() => {
        const years = calcTotalYears(workHistory);
        const level = detectLevel(years);
        setTotalYears(years);
        setDetectedLevel(level);
        setProfile(prev => ({ ...prev, level }));
    }, [workHistory]);

    useEffect(() => {
        if (tab === 'Files') fetchFiles();
    }, [tab]);

    const fetchFiles = async () => {
        try {
            const [tRes, eRes] = await Promise.all([getTasks(), getAllEvidence()]);
            setTasks(tRes.data.filter(t => t.assignedTo?._id === user?._id || t.assignedTo === user?._id));
            setEvidence(eRes.data.filter(e => e.uploadedBy?._id === user?._id || e.uploadedBy === user?._id));
        } catch (err) { console.error(err); }
    };

    const showMsg = (msg, isError = false) => {
        isError ? setError(msg) : setSuccess(msg);
        setTimeout(() => { setSuccess(''); setError(''); }, 3000);
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const res = await uploadAvatar(formData);
            const avatarUrl = res.data.avatar.startsWith('http') ? res.data.avatar : `http://localhost:5000${res.data.avatar}`;
            setAvatarPreview(avatarUrl);
            loginUser(localStorage.getItem('token'), { ...user, avatar: res.data.avatar });
            showMsg('Profile picture updated');
        } catch (err) {
            showMsg(err.response?.data?.message || 'Image upload failed', true);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateProfile({ ...profile, workHistory });
            loginUser(localStorage.getItem('token'), res.data.user);
            showMsg('Profile updated successfully');
        } catch (err) {
            showMsg(err.response?.data?.message || 'Update failed', true);
        } finally { setLoading(false); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword)
            return showMsg('New passwords do not match', true);
        if (passwords.newPassword.length < 6)
            return showMsg('Password must be at least 6 characters', true);
        setLoading(true);
        try {
            await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showMsg('Password changed successfully');
        } catch (err) {
            showMsg(err.response?.data?.message || 'Password change failed', true);
        } finally { setLoading(false); }
    };

    const addWorkEntry = () => setWorkHistory([...workHistory, { title: '', organization: '', from: '', to: '', current: false }]);
    const removeWorkEntry = (i) => setWorkHistory(workHistory.filter((_, idx) => idx !== i));
    const updateWorkEntry = (i, field, value) => {
        const updated = [...workHistory];
        updated[i][field] = value;
        setWorkHistory(updated);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">{user?.email} &mdash; <span style={{ textTransform: 'capitalize' }}>{user?.role}</span></p>
                </div>
            </div>

            {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                        fontWeight: tab === t ? 700 : 400,
                        color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                        borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                        fontSize: 14
                    }}>{t}</button>
                ))}
            </div>

            {/* Profile Tab */}
            {tab === 'Profile' && (
                <div className="card" style={{ maxWidth: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('avatarInput').click()}>
                            {avatarPreview
                                ? <img src={avatarPreview} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                                : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' }}>
                                    {user?.name?.charAt(0)?.toUpperCase()}
                                  </div>
                            }
                            <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', borderRadius: '50%', padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.2)', display: 'flex' }}>
                                <HiOutlineCamera size={14} color="var(--primary)" />
                            </div>
                            <input id="avatarInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <span style={{ textTransform: 'capitalize', fontSize: 13, color: 'var(--text-secondary)' }}>{user?.role}</span>
                                <span style={{ background: LEVEL_COLORS[detectedLevel], color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, textTransform: 'capitalize' }}>
                                    {detectedLevel}
                                </span>
                                {totalYears > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalYears.toFixed(1)} yrs exp</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Click photo to change</div>
                        </div>
                    </div>
                    <form onSubmit={handleProfileSave}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <input className="form-input" placeholder="e.g. Cyber Crime Division" value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                Experience Level
                                <span style={{ background: LEVEL_COLORS[detectedLevel], color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                                    Auto-detected
                                </span>
                            </label>
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 14, textTransform: 'capitalize', color: LEVEL_COLORS[detectedLevel], fontWeight: 600 }}>
                                {detectedLevel} {totalYears > 0 ? `(${totalYears.toFixed(1)} years total experience)` : '— add work history to auto-detect'}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bio</label>
                            <textarea className="form-textarea" rows={4} placeholder="Write a short bio about yourself..." value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>
            )}

            {/* Password Tab */}
            {tab === 'Password' && (
                <div className="card" style={{ maxWidth: 480 }}>
                    <h3 className="card-title" style={{ marginBottom: 20 }}>Change Password</h3>
                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input type="password" className="form-input" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input type="password" className="form-input" placeholder="Min 6 characters" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input type="password" className="form-input" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            )}

            {/* Work History Tab */}
            {tab === 'Work History' && (
                <div className="card" style={{ maxWidth: 680 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h3 className="card-title">Work History</h3>
                        <button className="btn btn-primary btn-sm" onClick={addWorkEntry}><HiPlus /> Add Entry</button>
                    </div>

                    {/* Auto-detected level banner */}
                    {workHistory.length > 0 && (
                        <div style={{ background: LEVEL_COLORS[detectedLevel] + '18', border: `1px solid ${LEVEL_COLORS[detectedLevel]}40`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                Total experience: <strong>{totalYears.toFixed(1)} years</strong>
                            </span>
                            <span style={{ marginLeft: 'auto', background: LEVEL_COLORS[detectedLevel], color: '#fff', fontSize: 12, padding: '2px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'capitalize' }}>
                                {detectedLevel} level
                            </span>
                        </div>
                    )}

                    {workHistory.length === 0 && (
                        <div className="empty-state"><p>Add work history to auto-detect your experience level.</p></div>
                    )}
                    {workHistory.map((w, i) => (
                        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, marginBottom: 12, position: 'relative' }}>
                            <button onClick={() => removeWorkEntry(i)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><HiTrash /></button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Job Title</label>
                                    <input className="form-input" placeholder="e.g. Forensic Analyst" value={w.title} onChange={e => updateWorkEntry(i, 'title', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Organization</label>
                                    <input className="form-input" placeholder="e.g. Cyber Crime Unit" value={w.organization} onChange={e => updateWorkEntry(i, 'organization', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">From</label>
                                    <input type="month" className="form-input" value={w.from} onChange={e => updateWorkEntry(i, 'from', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To</label>
                                    <input type="month" className="form-input" value={w.to} disabled={w.current} onChange={e => updateWorkEntry(i, 'to', e.target.value)} />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={w.current} onChange={e => updateWorkEntry(i, 'current', e.target.checked)} />
                                Currently working here
                            </label>
                        </div>
                    ))}
                    {workHistory.length > 0 && (
                        <button className="btn btn-primary" onClick={handleProfileSave} disabled={loading} style={{ marginTop: 8 }}>
                            {loading ? 'Saving...' : 'Save Work History'}
                        </button>
                    )}
                </div>
            )}

            {/* Files Tab */}
            {tab === 'Files' && (
                <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <h3 className="card-title" style={{ marginBottom: 16 }}>Assigned Tasks ({tasks.length})</h3>
                        {tasks.length === 0
                            ? <div className="empty-state"><p>No tasks assigned to you.</p></div>
                            : tasks.map(t => (
                                <div key={t._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Priority: <span style={{ textTransform: 'capitalize' }}>{t.priority}</span> &bull; Status: <span style={{ textTransform: 'capitalize' }}>{t.status}</span>
                                        {t.dueDate && ` • Due: ${new Date(t.dueDate).toLocaleDateString()}`}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 16 }}>Evidence Files Uploaded ({evidence.length})</h3>
                        {evidence.length === 0
                            ? <div className="empty-state"><p>No evidence files uploaded by you.</p></div>
                            : evidence.map(e => (
                                <div key={e._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.originalName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Category: {e.category} &bull; Size: {(e.fileSize / 1024).toFixed(1)} KB &bull; Integrity: {e.integrityStatus}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
