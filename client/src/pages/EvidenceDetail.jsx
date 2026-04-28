import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvidenceDetail, verifyEvidence, getCustodyLog, getFindings, addFinding, summarizeFindings, downloadEvidence } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiArrowLeft, HiOutlineShieldCheck, HiOutlineLightningBolt, HiPlus, HiOutlineDownload } from 'react-icons/hi';

const EvidenceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [evidence, setEvidence] = useState(null);
    const [custodyLogs, setCustodyLogs] = useState([]);
    const [findings, setFindings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    const [summarizing, setSummarizing] = useState(false);
    const [showAllLogs, setShowAllLogs] = useState(false);
    const [newFinding, setNewFinding] = useState({ content: '', type: 'observation' });
    const [showFindingForm, setShowFindingForm] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [evRes, logsRes, findingsRes] = await Promise.all([
                getEvidenceDetail(id),
                getCustodyLog(id),
                getFindings(id)
            ]);
            setEvidence(evRes.data);
            setCustodyLogs(logsRes.data);
            setFindings(findingsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        setVerifyResult(null);
        try {
            const res = await verifyEvidence(id);
            setVerifyResult(res.data);
            fetchData();
        } catch (err) {
            alert('Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleAddFinding = async (e) => {
        e.preventDefault();
        try {
            await addFinding(id, newFinding);
            setNewFinding({ content: '', type: 'observation' });
            setShowFindingForm(false);
            const res = await getFindings(id);
            setFindings(res.data);
        } catch (err) {
            alert('Failed to add finding');
        }
    };

    const handleSummarize = async () => {
        setSummarizing(true);
        try {
            const res = await summarizeFindings(id);
            setEvidence(prev => ({ ...prev, aiSummary: res.data.summary }));
        } catch (err) {
            alert(err.response?.data?.message || 'Summarization failed');
        } finally {
            setSummarizing(false);
        }
    };

    const handleDownload = async () => {
        try {
            const res = await downloadEvidence(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', evidence.originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // Parse error from blob response
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    alert('Download failed: ' + json.message);
                } catch {
                    alert('Download failed: ' + text);
                }
            } else {
                alert('Download failed: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    if (loading) return <div className="loader"><div className="spinner"></div></div>;
    if (!evidence) return <div className="empty-state"><h3>Evidence not found</h3></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button className="btn-icon" onClick={() => navigate(-1)}><HiArrowLeft /></button>
                    <div>
                        <h1 className="page-title">{evidence.originalName}</h1>
                        <p className="page-subtitle">
                            Case: {evidence.caseId?.title || evidence.caseId?.caseId}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={handleDownload}>
                        <HiOutlineDownload /> Download Evidence
                    </button>
                    <button className="btn btn-secondary" onClick={handleVerify} disabled={verifying}>
                        <HiOutlineShieldCheck /> {verifying ? 'Verifying...' : 'Verify Integrity'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSummarize} disabled={summarizing}>
                        <HiOutlineLightningBolt /> {summarizing ? 'Summarizing...' : (evidence.aiSummary ? 'Regenerate Summary' : 'AI Summarize')}
                    </button>
                </div>
            </div>

            <div className="detail-grid">
                <div>
                    {/* Evidence Info */}
                    <div className="card mb-4">
                        <h3 className="card-title mb-3">Evidence Details</h3>
                        <div className="detail-info">
                            <div className="detail-info-item">
                                <div className="detail-info-label">Category</div>
                                <div className="detail-info-value">
                                    <span className="badge badge-blue">{evidence.category}</span>
                                </div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Integrity</div>
                                <div className="detail-info-value">
                                    <span className={`hash-badge ${evidence.integrityStatus}`}>
                                        {evidence.integrityStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">File Size</div>
                                <div className="detail-info-value">{(evidence.fileSize / 1024).toFixed(2)} KB</div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Acquisition Tool</div>
                                <div className="detail-info-value">{evidence.acquisitionTool}</div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Uploaded By</div>
                                <div className="detail-info-value">{evidence.uploadedBy?.name}</div>
                            </div>
                            <div className="detail-info-item">
                                <div className="detail-info-label">Upload Date</div>
                                <div className="detail-info-value">{new Date(evidence.createdAt).toLocaleString()}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <div className="detail-info-label">SHA-256 Hash</div>
                            <div className="hash-display">{evidence.hashValue}</div>
                        </div>

                        {evidence.description && (
                            <div style={{ marginTop: 12 }}>
                                <div className="detail-info-label">Description</div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{evidence.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Verification Result */}
                    {verifyResult && (
                        <div className={`alert ${verifyResult.isValid ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
                            <HiOutlineShieldCheck />
                            {verifyResult.isValid
                                ? 'Evidence integrity verified — hash matches original'
                                : 'WARNING: Evidence integrity compromised — hash mismatch detected!'}
                        </div>
                    )}

                    {/* AI Summary */}
                    {evidence.aiSummary && (
                        <div className="ai-summary mb-4">
                            <h4><HiOutlineLightningBolt /> AI-Generated Summary</h4>
                            <div className="ai-summary-content">{evidence.aiSummary}</div>
                        </div>
                    )}

                    {/* Findings / Discussion */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Investigation Findings ({findings.length})</h3>
                            <button className="btn btn-sm btn-primary" onClick={() => setShowFindingForm(!showFindingForm)}>
                                <HiPlus /> Add Finding
                            </button>
                        </div>

                        {showFindingForm && (
                            <form onSubmit={handleAddFinding} style={{ marginBottom: 16, padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div className="form-group">
                                    <label className="form-label">Finding Type</label>
                                    <select className="form-select" value={newFinding.type} onChange={(e) => setNewFinding({ ...newFinding, type: e.target.value })}>
                                        <option value="observation">Observation</option>
                                        <option value="analysis">Analysis</option>
                                        <option value="conclusion">Conclusion</option>
                                        <option value="note">Note</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Content</label>
                                    <textarea className="form-textarea" placeholder="Enter your findings..."
                                        value={newFinding.content} onChange={(e) => setNewFinding({ ...newFinding, content: e.target.value })} required />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="btn btn-primary btn-sm">Submit</button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFindingForm(false)}>Cancel</button>
                                </div>
                            </form>
                        )}

                        {findings.length === 0 ? (
                            <div className="empty-state">
                                <p>No findings yet. Add your investigation notes.</p>
                            </div>
                        ) : (
                            findings.map(f => (
                                <div key={f._id} className="finding-item">
                                    <div className="finding-header">
                                        <div className="finding-author">
                                            <div className="finding-avatar">{f.addedBy?.name?.charAt(0)?.toUpperCase()}</div>
                                            <div>
                                                <div className="finding-name">{f.addedBy?.name}</div>
                                                <div className="finding-time">{f.addedBy?.role} • {new Date(f.createdAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <span className={`badge badge-${f.type === 'conclusion' ? 'green' : f.type === 'analysis' ? 'purple' : f.type === 'observation' ? 'cyan' : 'yellow'}`}>
                                            {f.type}
                                        </span>
                                    </div>
                                    <div className="finding-content">{f.content}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Custody Timeline */}
                <div>
                    <div className="card">
                        <h3 className="card-title mb-3">Chain of Custody</h3>
                        {custodyLogs.length === 0 ? (
                            <div className="empty-state"><p>No custody logs</p></div>
                        ) : (
                            <>
                                <div className="timeline">
                                    {(showAllLogs ? custodyLogs : custodyLogs.slice(0, 3)).map(log => (
                                        <div key={log._id} className="timeline-item">
                                            <div className="timeline-time">{new Date(log.createdAt).toLocaleString()}</div>
                                            <div className="timeline-content">
                                                <span className="timeline-user">{log.performedBy?.name}</span>
                                                <br />
                                                <span className="badge badge-cyan" style={{ marginTop: 4, display: 'inline-block' }}>{log.action}</span>
                                                {log.details && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{log.details}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {custodyLogs.length > 3 && (
                                    <button
                                        onClick={() => setShowAllLogs(prev => !prev)}
                                        style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
                                    >
                                        {showAllLogs ? 'Show Less ▲' : `Show More (${custodyLogs.length - 3} more) ▼`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvidenceDetail;
