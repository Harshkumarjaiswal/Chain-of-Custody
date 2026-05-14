import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi, verifyOtp, forgotPassword, resetPassword } from '../services/api';

// step 1 = login form, step 2 = login OTP
// step 'forgot' = enter email, step 'reset-otp' = enter OTP + new password

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Forgot password state
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (step === 1) {
                const res = await loginApi(form);
                setUserId(res.data.userId);
                setStep(2);
            } else {
                const res = await verifyOtp({ userId, otp });
                loginUser(res.data.token, res.data.user);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await forgotPassword({ email: forgotEmail });
            setUserId(res.data.userId);
            setStep('reset-otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) return setError('Passwords do not match');
        if (newPassword.length < 6) return setError('Password must be at least 6 characters');
        setLoading(true);
        try {
            await resetPassword({ userId, otp: resetOtp, newPassword });
            setSuccess('Password reset successfully! You can now log in.');
            setStep(1);
            setForgotEmail('');
            setResetOtp('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (step === 'forgot') return 'Forgot Password';
        if (step === 'reset-otp') return 'Reset Password';
        if (step === 2) return 'Verify Identity';
        return 'Welcome Back';
    };

    const getSubtitle = () => {
        if (step === 'forgot') return 'Enter your email to receive a reset OTP';
        if (step === 'reset-otp') return 'Enter the OTP sent to your email and set a new password';
        if (step === 2) return 'Enter the OTP sent to your email';
        return 'Sign in to Evidence Management System';
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">DE</div>
                    <h1>{getTitle()}</h1>
                    <p>{getSubtitle()}</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Login Step 1 */}
                {step === 1 && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input type="email" className="form-input" placeholder="Enter your email"
                                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-input" placeholder="Enter your password"
                                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <div style={{ textAlign: 'right', marginBottom: 16 }}>
                            <button type="button" onClick={() => { setStep('forgot'); setError(''); setSuccess(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                Forgot Password?
                            </button>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? 'Processing...' : 'Sign In'}
                        </button>
                    </form>
                )}

                {/* Login Step 2 - OTP */}
                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">6-digit OTP</label>
                            <input type="text" className="form-input" placeholder="Enter OTP code"
                                value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} minLength={6} autoFocus />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <button type="button" className="btn btn-block" style={{ marginTop: 10 }}
                            onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                            Back to Login
                        </button>
                    </form>
                )}

                {/* Forgot Password - Enter Email */}
                {step === 'forgot' && (
                    <form onSubmit={handleForgotSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input type="email" className="form-input" placeholder="Enter your registered email"
                                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required autoFocus />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                        </button>
                        <button type="button" className="btn btn-block" style={{ marginTop: 10 }}
                            onClick={() => { setStep(1); setError(''); }}>
                            Back to Login
                        </button>
                    </form>
                )}

                {/* Forgot Password - Enter OTP + New Password */}
                {step === 'reset-otp' && (
                    <form onSubmit={handleResetSubmit}>
                        <div className="form-group">
                            <label className="form-label">OTP Code</label>
                            <input type="text" className="form-input" placeholder="Enter 6-digit OTP"
                                value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} required maxLength={6} autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input type="password" className="form-input" placeholder="Min 6 characters"
                                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input type="password" className="form-input" placeholder="Repeat new password"
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                        <button type="button" className="btn btn-block" style={{ marginTop: 10 }}
                            onClick={() => { setStep('forgot'); setError(''); }}>
                            Back
                        </button>
                    </form>
                )}

                {step === 1 && (
                    <div className="auth-link">
                        Don't have an account? <Link to="/register">Create Account</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
