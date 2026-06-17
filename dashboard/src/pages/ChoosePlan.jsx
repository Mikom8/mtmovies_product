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
    name: 'Popular', price: 250, featured: true, features: [
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

      // Try fetching receipt directly from the user's browser first (faster when user can access Telebirr).
      setError('Fetching receipt from Telebirr...');

      let htmlContent;
      const teleUrl = `https://transactioninfo.ethiotelecom.et/receipt/${encodeURIComponent(receiptNo)}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s client-side timeout

        const directRes = await fetch(teleUrl, {
          method: 'GET',
          mode: 'cors',
          headers: { Accept: 'text/html' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (directRes.ok) {
          const ct = directRes.headers.get('content-type') || '';
          if (ct.includes('text/html')) {
            htmlContent = await directRes.text();
          }
        }
      } catch (clientErr) {
        // Client-side fetch may fail due to CORS or network restrictions; fallback to proxy below
        console.debug('Client-side Telebirr fetch failed, will fallback to server proxy:', clientErr && clientErr.message);
      }

      // If client couldn't fetch the HTML, use backend proxy (handles CORS and geo-restrictions)
      if (!htmlContent) {
        try {
          const receiptRes = await fetch(`${API_BASE_URL}/payments/fetch-receipt/${receiptNo}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          // If backend returns 202, Telebirr is unavailable — show pending verification
          if (receiptRes.status === 202) {
            const pending = await receiptRes.json().catch(() => ({}));
            setError(pending.error || 'Payment is pending manual verification.');
            setLoading(false);
            // Navigate back to browse or keep user on page as desired
            navigate('/browse');
            return;
          }

          if (!receiptRes.ok) {
            const errData = await receiptRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Could not fetch receipt from Telebirr');
          }

          htmlContent = await receiptRes.text();
        } catch (fetchErr) {
          throw new Error(fetchErr.message || 'Unable to fetch receipt. Please check your transaction ID and try again.');
        }
      }

      // Parse the HTML to extract receipt data
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract data from the HTML
      const extractText = (selector) => {
        const elem = doc.querySelector(selector);
        return elem ? elem.textContent.trim() : '';
      };
      
      // Find payer name
      const payerNameText = htmlContent.match(/የከፋይ ስም\/Payer Name[\s\S]*?<td[^>]*>\s*([^<]+)/i);
      const payerName = payerNameText ? payerNameText[1].trim() : 'Unknown';
      
      // Find receiver name
      const receiverNameText = htmlContent.match(/የገንዘብ ተቀባይ ስም\/Credited Party name[\s\S]*?<td[^>]*>\s*([^<]+)/i);
      const receiverName = receiverNameText ? receiverNameText[1].replace(/<\/?label>/gi, '').trim() : '';
      
      // Find receiver phone
      const receiverPhoneText = htmlContent.match(/የገንዘብ ተቀባይ ቴሌብር ቁ\.\/Credited party account no[\s\S]*?<td[^>]*>\s*([\d*]+)/i);
      const receiverPhone = receiverPhoneText ? receiverPhoneText[1].trim() : '';
      
      // Find status
      const statusText = htmlContent.match(/የክፍያው ሁኔታ\/transaction status[\s\S]*?<td[^>]*>\s*([^<]+)/i);
      const status = statusText ? statusText[1].trim() : '';
      
      // Find settled amount
      const settledAmountText = htmlContent.match(/የተከፈለው መጠን\/Settled Amount[\s\S]*?<td[^>]*>\s*(\d+(?:\.\d+)?)\s*Birr/i);
      const settledAmount = settledAmountText ? parseFloat(settledAmountText[1]) : 0;
      
      const receiptData = {
        payerName,
        receiverName,
        receiverPhone,
        status,
        settledAmount,
        amount: settledAmount
      };
      
      console.log('Parsed receipt data:', receiptData);
      
      if (!settledAmount) {
        throw new Error('Could not parse receipt amount. Please try again or contact support.');
      }
      
      setError('Verifying payment...');

      // Send parsed data to server for validation
      const res = await fetch(`${API_BASE_URL}/payments/verify-client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiptNo,
          receiptData,
          expectedAmount: selectedPlan.price,
          planName: selectedPlan.name,
        })
      });

      const data = await res.json();

      // Handle server-side pending verification responses
      if (res.status === 202 || data?.status === 'pending' || /PENDING|TIMEOUT/.test(data?.code)) {
        setError(data.error || 'Your payment is pending manual verification.');
        setLoading(false);
        navigate('/browse');
        return;
      }

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
                    placeholder="e.g. DFG60WWREQ"
                    required
                    className={styles.input}
                  />
                  {error && <div className={styles.errorText}>{error}</div>}
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
