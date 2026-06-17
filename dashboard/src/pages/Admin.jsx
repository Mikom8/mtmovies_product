import { useState, useEffect } from 'react';
import styles from './Admin.module.css';
import { API_BASE_URL } from '../config';

export default function Admin() {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [activeTab]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending' ? '/admin/payments/pending' : '/admin/payments/all';
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await res.json();
      
      if (data.success) {
        if (activeTab === 'pending') {
          setPendingPayments(data.data);
        } else {
          setAllPayments(data.data);
        }
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId) => {
    if (!confirm('Approve this payment?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/payments/${transactionId}/approve`, {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Payment approved!');
        loadPayments();
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleReject = async (transactionId) => {
    if (!confirm('Reject this payment?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/payments/${transactionId}/reject`, {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('❌ Payment rejected');
        loadPayments();
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const payments = activeTab === 'pending' ? pendingPayments : allPayments;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Payment Admin</h1>
        <div className={styles.tabs}>
          <button 
            className={activeTab === 'pending' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({pendingPayments.length})
          </button>
          <button 
            className={activeTab === 'all' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('all')}
          >
            All Payments
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : payments.length === 0 ? (
        <div className={styles.empty}>
          {activeTab === 'pending' ? 'No pending payments' : 'No payments yet'}
        </div>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment._id}>
                  <td>{new Date(payment.processedAt).toLocaleString()}</td>
                  <td className={styles.txId}>{payment.transactionId}</td>
                  <td>{payment.userId?.email || 'N/A'}</td>
                  <td>{payment.planRequested}</td>
                  <td>ETB {payment.expectedAmount}</td>
                  <td>
                    <span className={`${styles.status} ${styles[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    {payment.status === 'pending' && (
                      <div className={styles.actions}>
                        <button 
                          className={styles.approve}
                          onClick={() => handleApprove(payment.transactionId)}
                        >
                          ✓ Approve
                        </button>
                        <button 
                          className={styles.reject}
                          onClick={() => handleReject(payment.transactionId)}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
