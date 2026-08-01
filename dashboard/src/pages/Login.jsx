import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { BiLoaderAlt, BiErrorCircle } from 'react-icons/bi';
import { FcGoogle } from 'react-icons/fc';
import { useGoogleLogin } from '@react-oauth/google';

import { API_BASE_URL } from '../config';

const API = API_BASE_URL;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState(null); // null | 'signin' | 'signup'
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [strength, setStrength] = useState({ width: '0%', color: '', label: '' });
  const [error, setError] = useState('');
  const emailTimer = useRef(null);

  // Recovery Flow State
  const [forgotStep, setForgotStep] = useState(null); // null | 'email' | 'verify' | 'reset'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        login(data.user, data.token);
        if (data.isNewUser) {
          navigate('/choose-plan');
        } else {
          navigate('/browse');
        }
      } catch (err) {
        setError('Google login failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google login failed.')
  });

  // Check if email exists in DB
  const checkEmail = async (val) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setMode(null); return; }
    setChecking(true);
    try {
      const res = await fetch(`${API}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: val }),
      });
      const data = await res.json();
      setMode(data.exists ? 'signin' : 'signup');
    } catch { setMode('signup'); }
    finally { setChecking(false); }
  };

  useEffect(() => {
    if (email) {
      checkEmail(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setMode(null);
    clearTimeout(emailTimer.current);
    emailTimer.current = setTimeout(() => checkEmail(val), 600);
  };

  const handleEmailBlur = () => {
    clearTimeout(emailTimer.current);
    checkEmail(email);
  };

  const calcStrength = (val) => {
    let s = 0;
    if (val.length >= 6) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#ff4444', '#ffaa00', '#4fc3f7', '#00cc66'];
    const widths = ['0%', '25%', '50%', '75%', '100%'];
    setStrength({ width: widths[s], color: colors[s], label: s > 0 ? labels[s] : '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);

    try {
      const endpoint = mode === 'signin' ? 'login' : 'register';
      const body = mode === 'signup'
        ? { name: email.split('@')[0], email, password }
        : { email, password };

      const res = await fetch(`${API}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }

      login(data.user, data.token);

      if (mode === 'signup') {
        navigate('/choose-plan');
      } else {
        navigate('/browse');
      }
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send recovery code.'); return; }
      setSuccessMsg('Recovery code sent to your email!');
      setForgotStep('verify');
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!resetCode) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid or expired code.'); return; }
      setForgotStep('reset');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!newPassword || !confirmPassword) { setError('Please fill in both password fields.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password.'); return; }
      setSuccessMsg('Password updated successfully! You can now log in.');
      setForgotStep(null);
      setMode('signin');
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = loading
    ? (mode === 'signup' ? 'Creating Account…' : 'Signing In…')
    : (mode === 'signup' ? 'Sign Up' : 'Sign In');

  return (
    <div className={styles.page}>
      {/* Animated orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.wrapper}>
        {/* Brand */}
        <Link to="/" className={styles.brand}>
          <img src="https://res.cloudinary.com/dyop5rdpn/image/upload/v1699352390/MT%20Movies/mt_movies_transparent_dark_x5j2m8.png" alt="MT Movies" />
          <span><strong>MT</strong>Movies</span>
        </Link>

        {/* Card */}
        <div className={styles.card}>
          <h1 className={styles.title}>
            {forgotStep ? 'Reset Password' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </h1>
          <p className={styles.subtitle}>
            {forgotStep ? '' : (mode === 'signup'
              ? 'Join MT Movies — watch English movies in Amharic'
              : 'Welcome back! Sign in to keep watching')}
          </p>

          {successMsg && !forgotStep && (
            <p style={{ color: '#00cc66', fontSize: '14px', textAlign: 'center', marginBottom: '15px', padding: '10px', borderRadius: '6px', background: 'rgba(0, 204, 102, 0.1)' }}>
              {successMsg}
            </p>
          )}

          {!forgotStep && (
            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}><FiMail /></span>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    required
                    autoComplete="email"
                    className={styles.input}
                  />
                  {checking && <span className={styles.checking}><BiLoaderAlt /></span>}
                </div>
              </div>

              {/* Password */}
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}><FiLock /></span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (mode === 'signup') calcStrength(e.target.value); }}
                    required
                    maxLength={20}
                    autoComplete="new-password"
                    className={styles.input}
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p => !p)}>
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {/* Strength bar — only for signup */}
                {mode === 'signup' && password && (
                  <div className={styles.strengthWrap}>
                    <div className={styles.strengthBar}>
                      <div className={styles.strengthFill} style={{ width: strength.width, background: strength.color }} />
                    </div>
                    {strength.label && (
                      <span className={styles.strengthLabel} style={{ color: strength.color }}>{strength.label}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && <p className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BiErrorCircle size={16} /> {error}</p>}

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {btnLabel}
                {!loading && <span style={{ display: 'flex', alignItems: 'center' }}><FiArrowRight /></span>}
              </button>

              {/* Forgot password */}
              {mode === 'signin' && (
                <div className={styles.forgotWrap}>
                  <button type="button" onClick={() => { setForgotStep('email'); setError(''); setSuccessMsg(''); }} className={styles.forgot} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>
          )}

          {forgotStep === 'email' && (
            <form onSubmit={handleRequestCode} noValidate>
              <p className={styles.subtitle} style={{ marginBottom: '20px', color: '#aaa', fontSize: '14px' }}>
                Enter your email address and we'll send you a 6-digit recovery code.
              </p>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}><FiMail /></span>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>
              </div>
              {error && <p className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BiErrorCircle size={16} /> {error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Recovery Code'}
                {!loading && <span style={{ display: 'flex', alignItems: 'center' }}><FiArrowRight /></span>}
              </button>
              <div className={styles.forgotWrap} style={{ marginTop: '15px', justifyContent: 'center' }}>
                <button type="button" onClick={() => { setForgotStep(null); setError(''); }} className={styles.forgot} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {forgotStep === 'verify' && (
            <form onSubmit={handleVerifyCode} noValidate>
              <p className={styles.subtitle} style={{ marginBottom: '20px', color: '#aaa', fontSize: '14px' }}>
                Please enter the 6-digit verification code sent to <strong style={{ color: '#E50914' }}>{email}</strong>.
              </p>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}><FiLock /></span>
                  <input
                    type="text"
                    placeholder="6-Digit Code"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                    className={styles.input}
                  />
                </div>
              </div>
              {error && <p className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BiErrorCircle size={16} /> {error}</p>}
              {successMsg && <p style={{ color: '#00cc66', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>{successMsg}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
                {!loading && <span style={{ display: 'flex', alignItems: 'center' }}><FiArrowRight /></span>}
              </button>
              <div className={styles.forgotWrap} style={{ marginTop: '15px', justifyContent: 'center' }}>
                <button type="button" onClick={() => { setForgotStep('email'); setError(''); setSuccessMsg(''); }} className={styles.forgot} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Change Email
                </button>
              </div>
            </form>
          )}

          {forgotStep === 'reset' && (
            <form onSubmit={handleResetPassword} noValidate>
              <p className={styles.subtitle} style={{ marginBottom: '20px', color: '#aaa', fontSize: '14px' }}>
                Enter your new password below.
              </p>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}><FiLock /></span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); calcStrength(e.target.value); }}
                    required
                    className={styles.input}
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p => !p)}>
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {newPassword && (
                  <div className={styles.strengthWrap}>
                    <div className={styles.strengthBar}>
                      <div className={styles.strengthFill} style={{ width: strength.width, background: strength.color }} />
                    </div>
                    {strength.label && (
                      <span className={styles.strengthLabel} style={{ color: strength.color }}>{strength.label}</span>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}><FiLock /></span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>
              </div>
              {error && <p className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BiErrorCircle size={16} /> {error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Updating Password...' : 'Reset Password'}
                {!loading && <span style={{ display: 'flex', alignItems: 'center' }}><FiArrowRight /></span>}
              </button>
            </form>
          )}

          {/* Divider */}
          {!forgotStep && (
            <>
              <div className={styles.divider}><span>or</span></div>

              {/* Google */}
              <button type="button" className={styles.googleBtn} onClick={() => googleLogin()}>
                <FcGoogle size={20} />
                Continue with Google
              </button>
            </>
          )}

          <p className={styles.terms}>
            By continuing, you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>

        <footer className={styles.footer}>
          MTMovies © 2024 — English Movies & Series in Amharic
        </footer>
      </div>
    </div>
  );
}
