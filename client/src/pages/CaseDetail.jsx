import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCase, updateCase, getEvidenceByCase, uploadEvidence, generateReport } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiPlus, HiDownload, HiArrowLeft, HiOutlineShieldCheck } from 'react-icons/hi';

const CaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [caseData, setCaseData] = useState(null);
    const [evidences, setEvidences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        file: null, category: 'other', description: '', acquisitionTool: 'Other'
    });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [generatingReport, setGeneratingReport] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [caseRes, evRes] = await Promise.all([
                getCase(id),
                getEvidenceByCase(id)
            ]);
            setCaseData(caseRes.data);
            setEvidences(evRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadForm.file) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('evidenceFile', uploadForm.file);
            formData.append('category', uploadForm.category);
            formData.append('description', uploadForm.description);
            formData.append('acquisitionTool', uploadForm.acquisitionTool);
            await uploadEvidence(id, formData, (percent) => setUploadProgress(percent));
            setShowUpload(false);
            setUploadForm({ file: null, category: 'other', description: '', acquisitionTool: 'Other' });
            setUploadProgress(0);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleStatusChange = async (status) => {
        try {
            const res = await updateCase(id, { status });
            setCaseData(res.data);
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleReport = async () => {
        setGeneratingReport(true);
        try {
            const res = await generateReport(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `forensic_report_${caseData.caseId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Report generation failed');
        } finally {
            setGeneratingReport(false);
        }
    };

    if (loading) return <div className="loader"><div className="spinner"></div></div>;
    if (!caseData) return <div className="empty-state"><h3>Case not found</h3></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button className="btn-icon" onClick={() => navigate('/cases')}><HiArrowLeft /></button>
                    <div>
                        <h1 className="page-title">{caseData.title}</h1>
                        <p className="page-subtitle">{caseData.caseId}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                        <HiPlus /> Upload Evidence
                    </button>
                    <button className="btn btn-secondary" onClick={handleReport} disabled={generatingReport}>
                        <HiDownload /> {generatingReport ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            <div className="detail-grid">
                <div>
                    <div className="card mb-4">
                        <h3 className="card-title mb-3">Case Information</h3>
                        <div className="detail-info">
                            <div className="detail-info-item">
                                <div className="detail-info-label">Status</div>
                                <div className="detail-info-value">
                                    <span className={`badge badge-${caseData.status === 'open' ? 'green' : caseData.status === 'in-progress' ? 'yellow' : 'red'}`}>
                                        {caseData.status}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Priority</div>
                                <div className="detail-info-value">
                                    <span className={`badge badge-${caseData.priority === 'critical' ? 'red' : caseData.priority === 'high' ? 'yellow' : 'blue'}`}>
                                        {caseData.priority}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Created By</div>
                                <div className="detail-info-value">{caseData.createdBy?.name}</div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Created</div>
                                <div className="detail-info-value">{new Date(caseData.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {caseData.description}
                        </p>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Evidence ({evidences.length})</h3>
                        </div>
                        {evidences.length === 0 ? (
                            <div className="empty-state">
                                <HiOutlineShieldCheck size={40} />
                                <h3>No evidence uploaded</h3>
                                <p>Upload forensic evidence files to this case</p>
                            </div>
                        ) : (
                            <div className="evidence-grid">
                                {evidences.map(ev => (
                                    <div key={ev._id} className="evidence-card" onClick={() => navigate(`/evidence/${ev._id}`)}>
                                        <div className="evidence-card-name">{ev.originalName}</div>
                                        <div className="evidence-card-meta">
                                            <span className={`hash-badge ${ev.integrityStatus}`}>
                                                {ev.integrityStatus === 'verified' ? '✓' : ev.integrityStatus === 'compromised' ? '✗' : '?'} {ev.integrityStatus}
                                            </span>
                                            <span className="badge badge-blue">{ev.category}</span>
                                            <span>{(ev.fileSize / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="card mb-4">
                        <h3 className="card-title mb-3">Quick Actions</h3>
                        <div className="flex flex-col gap-2">
                            {caseData.status !== 'in-progress' && (
                                <button className="btn btn-warning btn-block btn-sm" onClick={() => handleStatusChange('in-progress')}>
                                    Mark In Progress
                                </button>
                            )}
                            {caseData.status !== 'closed' && (
                                <button className="btn btn-danger btn-block btn-sm" onClick={() => handleStatusChange('closed')}>
                                    Close Case
                                </button>
                            )}
                            {caseData.status === 'closed' && (
                                <button className="btn btn-success btn-block btn-sm" onClick={() => handleStatusChange('open')}>
                                    Reopen Case
                                </button>
                            )}
                        </div>
                    </div>

                    {caseData.assignedInvestigators?.length > 0 && (
                        <div className="card">
                            <h3 className="card-title mb-3">Assigned Team</h3>
                            {caseData.assignedInvestigators.map(inv => (
                                <div key={inv._id} className="flex items-center gap-2 mb-2">
                                    <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                                        {inv.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>{inv.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{inv.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showUpload && (
                <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Upload Evidence</h2>
                        <form onSubmit={handleUpload}>
                            <div className="form-group">
                                <label className="form-label">Evidence File</label>
                                <input type="file" className="form-input" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
                                    <option value="disk-image">Disk Image</option>
                                    <option value="log-file">Log File</option>
                                    <option value="document">Document</option>
                                    <option value="memory-dump">Memory Dump</option>
                                    <option value="network-capture">Network Capture</option>
                                    <option value="mobile-data">Mobile Data</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Acquisition Tool</label>
                                <select className="form-select" value={uploadForm.acquisitionTool} onChange={(e) => setUploadForm({ ...uploadForm, acquisitionTool: e.target.value })}>
                                    <option value="FTK Imager">FTK Imager</option>
                                    <option value="Autopsy">Autopsy</option>
                                    <option value="EnCase">EnCase</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" placeholder="Describe the evidence..."
                                    value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading}>
                                    {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Evidence'}
                                </button>
                            </div>
                            {uploading && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        <span>Uploading large file — please wait...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div style={{ background: 'var(--border-color)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                        <div style={{ width: `${uploadProgress}%`, background: 'var(--primary)', height: '100%', borderRadius: 4, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseDetail;
