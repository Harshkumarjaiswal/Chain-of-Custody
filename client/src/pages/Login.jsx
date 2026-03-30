import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi, verifyOtp } from '../services/api';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">DE</div>
                    <h1>{step === 1 ? 'Welcome Back' : 'Verify Identity'}</h1>
                    <p>{step === 1 ? 'Sign in to Evidence Management System' : 'Enter the OTP sent to your email'}</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {step === 1 ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Enter your email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">6-digit OTP</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter OTP code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                minLength={6}
                            />
                        </div>
                    )}
                    
                    <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                        {loading ? 'Processing...' : (step === 1 ? 'Sign In' : 'Verify & Login')}
                    </button>
                    
                    {step === 2 && (
                        <button type="button" className="btn btn-block" style={{marginTop: '10px'}} onClick={() => { setStep(1); setOtp(''); }}>
                            Back to Login
                        </button>
                    )}
                </form>

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
