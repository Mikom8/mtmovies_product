import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import styles from './ChoosePlan.module.css';
import { BiCheck, BiX } from 'react-icons/bi';
import { FaStar } from 'react-icons/fa';
import { API_BASE_URL } from '../config';

// Payment details as requested by user (configurable)
const PAYMENT_INFO = {
  method: 'Telebirr',
  number: '0919516418',
  name: 'BIKILA MELESE'
};

const PLANS = [
  {
    name: 'Basic', price: 150, features: [
      { text: 'HD quality (720p)', ok: true },
      { text: '1 screen at a time', ok: true },
      { text: 'Amharic subtitles', ok: true },
      { text: 'Amharic dub', ok: true },
      { text: 'Download offline', ok: false },
    ]
  },
  {
    name: 'Popular', price: 2, featured: true, features: [
      { text: 'Full HD (1080p)', ok: true },
      { text: '2 screens at once', ok: true },
      { text: 'Amharic subtitles', ok: true },
      { text: 'Amharic dub', ok: true },
      { text: 'Download offline', ok: true },
    ]
  },
  {
    name: 'Family', price: 350, features: [
      { text: '4K Ultra HD', ok: true },
      { text: '5 screens at once', ok: true },
      { text: 'Amharic subtitles', ok: true },
      { text: 'Amharic dub', ok: true },
      { text: 'Download offline', ok: true },
    ]
  },
];

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [step, setStep] = useState(1); // 1: Choose Plan, 2: Payment Instructions, 3: Verify Transaction
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep(2);
  };

  const handleIPaid = () => {
    setStep(3);
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!transactionId.trim()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('mt_token');
      const receiptNo = transactionId.trim().toUpperCase();

      // Step 1: Fetch the receipt HTML from the browser (Ethiopian IP — can reach Telebirr)
      let receiptHtml = null;
      try {
        const telebirrRes = await fetch(
          `https://transactioninfo.ethiotelecom.et/receipt/${receiptNo}`,
          { method: 'GET' }
        );
        if (telebirrRes.ok) {
          receiptHtml = await telebirrRes.text();
        }
      } catch (fetchErr) {
        console.warn('[ChoosePlan] Could not pre-fetch receipt:', fetchErr.message);
        // Continue — backend will handle gracefully
      }

      // Step 2: Send receipt ID + HTML to backend for secure validation
      const res = await fetch(`${API_BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiptNo,
          expectedAmount: selectedPlan.price,
          planName: selectedPlan.name,
          receiptHtml,   // Browser-fetched HTML bypasses Railway geo-block
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Update user plan in context
      if (updateUser && data.user) {
        updateUser(data.user);
      }
      
      navigate('/browse');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={handleLogout} hideLinks />

      <div className={styles.content}>
        {step === 1 && (
          <div className={styles.stepContainer}>
            <div className={styles.header}>
              <span className={styles.tag}>Step 1 of 2</span>
              <h1 className={styles.title}>Choose Your Plan</h1>
              <p className={styles.subtitle}>No commitments, cancel anytime.</p>
            </div>

            <div className={styles.plansGrid}>
              {PLANS.map(plan => (
                <div key={plan.name} className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`}>
                  {plan.featured && <span className={styles.planBestTag}><FaStar style={{marginRight: '4px', transform: 'translateY(-1px)'}} /> Best Value</span>}
                  <div className={styles.planName}>{plan.name}</div>
                  <div className={styles.planPrice}>
                    <span className={styles.planCurrency}>ETB</span>
                    <span className={styles.planAmount}>{plan.price}</span>
                    <span className={styles.planPeriod}>/mo</span>
                  </div>
                  <ul className={styles.planFeatures}>
                    {plan.features.map((f, i) => (
                      <li key={i} className={`${styles.planFeatureItem} ${!f.ok ? styles.planFeatureMuted : ''}`}>
                        <span>{f.ok ? <BiCheck /> : <BiX />}</span>
                        {f.text}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`${styles.planBtn} ${plan.featured ? styles.planBtnFeatured : ''}`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.featured ? 'Subscribe Now' : 'Get Started'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContainer}>
            <div className={styles.header}>
              <span className={styles.tag}>Step 2 of 2</span>
              <h1 className={styles.title}>Complete Payment</h1>
              <p className={styles.subtitle}>You selected the <strong>{selectedPlan?.name}</strong> Plan (ETB {selectedPlan?.price}/mo)</p>
            </div>

            <div className={styles.paymentCard}>
              <h2 className={styles.paymentLogoText}>telebirr</h2>
              
              <div className={styles.instructionList}>
                <div className={styles.instructionStep}>
                  <div className={styles.stepNum}>1</div>
                  <p>Open your Telebirr app or dial *127#</p>
                </div>
                <div className={styles.instructionStep}>
                  <div className={styles.stepNum}>2</div>
                  <p>Send exactly <strong>ETB {selectedPlan?.price}</strong> to:</p>
                </div>
              </div>

              <div className={styles.accountBox}>
                <div className={styles.accountNumber}>{PAYMENT_INFO.number}</div>
                <div className={styles.accountName}>{PAYMENT_INFO.name}</div>
              </div>

              <button className={styles.paidBtn} onClick={handleIPaid}>
                I Paid
              </button>
              <button className={styles.backLink} onClick={() => setStep(1)}>
                Change Plan
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepContainer}>
            <div className={styles.header}>
              <h1 className={styles.title}>Verify Payment</h1>
              <p className={styles.subtitle}>Please enter the transaction ID from your Telebirr receipt.</p>
            </div>

            <div className={styles.paymentCard}>
              <form onSubmit={handleSubmitTransaction}>
                <div className={styles.inputGroup}>
                  <label htmlFor="txId">Transaction ID</label>
                  <input
                    type="text"
                    id="txId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 7A1B2C3D4E"
                    required
                    className={styles.input}
                  />
                  {error && <div style={{ color: '#ff4444', marginTop: '10px', fontSize: '0.9rem', textAlign: 'left' }}>{error}</div>}
                </div>
                
                <button type="submit" className={styles.paidBtn} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Transaction'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
