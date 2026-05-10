import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { BiLoaderAlt, BiErrorCircle } from 'react-icons/bi';
import { FcGoogle } from 'react-icons/fc';
import { useGoogleLogin } from '@react-oauth/google';

const API = 'https://mtmovies-production.up.railway.app/api';

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
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'signup'
              ? 'Join MT Movies — watch English movies in Amharic'
              : 'Welcome back! Sign in to keep watching'}
          </p>

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
                <a href="#" className={styles.forgot}>Forgot Password?</a>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className={styles.divider}><span>or</span></div>

          {/* Google */}
          <button type="button" className={styles.googleBtn} onClick={() => googleLogin()}>
            <FcGoogle size={20} />
            Continue with Google
          </button>

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
