import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import styles from './Admin.module.css';

// ─── Edit Modal ───────────────────────────────────────────────
function EditModal({ item, type, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: item.title || '',
    poster: item.poster || '',
    backdrop: item.backdrop || '',
    year: item.year || '',
    quality: item.quality || '',
    rating: item.rating || '',
    genres: (item.genres || []).join(', '),
    isFree: item.isFree ?? false,
    isFeatured: item.isFeatured ?? false,
    isNew: item.isNew ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm(f => ({ ...f, [name]: inputType === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const endpoint = type === 'movie' ? '/movies' : '/series';
      const payload = {
        ...form,
        genres: form.genres.split(',').map(g => g.trim()).filter(Boolean),
      };
      const res = await fetch(`${API_BASE_URL}${endpoint}/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Edit {type === 'movie' ? 'Movie' : 'Series'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Poster Preview */}
          <div className={styles.posterPreview}>
            {form.poster ? (
              <img src={form.poster} alt="poster preview" onError={e => e.target.style.display = 'none'} />
            ) : (
              <div className={styles.posterPlaceholder}>No Poster</div>
            )}
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Title</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Title" />
            </div>
            <div className={styles.formGroup}>
              <label>Year</label>
              <input name="year" value={form.year} onChange={handleChange} placeholder="2024" />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Poster URL</label>
              <input name="poster" value={form.poster} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Backdrop URL</label>
              <input name="backdrop" value={form.backdrop} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className={styles.formGroup}>
              <label>Quality</label>
              <input name="quality" value={form.quality} onChange={handleChange} placeholder="HD / FHD" />
            </div>
            <div className={styles.formGroup}>
              <label>Rating</label>
              <input name="rating" value={form.rating} onChange={handleChange} placeholder="8.5" />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Genres (comma separated)</label>
              <input name="genres" value={form.genres} onChange={handleChange} placeholder="Action, Drama" />
            </div>
            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="isFree" checked={form.isFree} onChange={handleChange} />
                Free to Watch
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
                Featured (Hero)
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="isNew" checked={form.isNew} onChange={handleChange} />
                New Release
              </label>
            </div>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────
export default function Admin() {
  // Tab: 'payments' | 'movies' | 'series'
  const [activeTab, setActiveTab] = useState('movies');

  // Payments state
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [paymentSubTab, setPaymentSubTab] = useState('pending');

  // Content state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Load content (movies or series) ──
  useEffect(() => {
    if (activeTab === 'payments') { loadPayments(); return; }
    loadContent();
  }, [activeTab]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'movies' ? '/movies?limit=500' : '/series?limit=500';
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await res.json();
      setItems(activeTab === 'movies' ? (data.movies || []) : (data.series || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Load payments ──
  const loadPayments = async () => {
    setLoading(true);
    try {
      const endpoint = paymentSubTab === 'pending' ? '/admin/payments/pending' : '/admin/payments/all';
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await res.json();
      if (data.success) {
        if (paymentSubTab === 'pending') setPendingPayments(data.data);
        else setAllPayments(data.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'payments') loadPayments();
  }, [paymentSubTab]);

  const handleApprove = async (transactionId) => {
    if (!confirm('Approve this payment?')) return;
    const res = await fetch(`${API_BASE_URL}/admin/payments/${transactionId}/approve`, { method: 'POST' });
    const data = await res.json();
    if (data.success) { showToast('✅ Payment approved!'); loadPayments(); }
    else showToast('❌ ' + data.message);
  };

  const handleReject = async (transactionId) => {
    if (!confirm('Reject this payment?')) return;
    const res = await fetch(`${API_BASE_URL}/admin/payments/${transactionId}/reject`, { method: 'POST' });
    const data = await res.json();
    if (data.success) { showToast('Payment rejected'); loadPayments(); }
    else showToast('❌ ' + data.message);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const endpoint = activeTab === 'movies' ? '/movies' : '/series';
    const res = await fetch(`${API_BASE_URL}${endpoint}/${item._id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { showToast('🗑️ Deleted successfully'); loadContent(); }
    else showToast('❌ ' + data.error);
  };

  // ── Filter items ──
  const filteredItems = items.filter(item => {
    const matchSearch = !search || item.title?.toLowerCase().includes(search.toLowerCase());
    const matchGenre = !genreFilter || item.genres?.includes(genreFilter);
    return matchSearch && matchGenre;
  });

  const allGenres = [...new Set(items.flatMap(i => i.genres || []))].sort();
  const payments = paymentSubTab === 'pending' ? pendingPayments : allPayments;

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Edit Modal */}
      {editItem && (
        <EditModal
          item={editItem}
          type={activeTab === 'movies' ? 'movie' : 'series'}
          onClose={() => setEditItem(null)}
          onSaved={() => { loadContent(); showToast('✅ Changes saved!'); }}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>🎬 MTMovies Admin</div>
        </div>
        <div className={styles.tabs}>
          {['movies', 'series', 'payments'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'movies' ? '🎥 Movies' : tab === 'series' ? '📺 Series' : '💳 Payments'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Tabs ── */}
      {(activeTab === 'movies' || activeTab === 'series') && (
        <div className={styles.contentSection}>
          {/* Filters */}
          <div className={styles.filterBar}>
            <input
              className={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className={styles.genreSelect} value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
              <option value="">All Genres</option>
              {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <span className={styles.countBadge}>{filteredItems.length} {activeTab}</span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className={styles.loadingGrid}>
              {[...Array(12)].map((_, i) => <div key={i} className={styles.skeletonCard} />)}
            </div>
          ) : (
            <div className={styles.contentGrid}>
              {filteredItems.map(item => (
                <div key={item._id} className={styles.contentCard}>
                  <div className={styles.cardPoster}>
                    {item.poster
                      ? <img src={item.poster} alt={item.title} loading="lazy" />
                      : <div className={styles.noPoster}>No Poster</div>
                    }
                    <div className={styles.cardBadges}>
                      {item.isFree && <span className={styles.badgeFree}>FREE</span>}
                      {item.isFeatured && <span className={styles.badgeFeatured}>⭐</span>}
                      {item.isNew && <span className={styles.badgeNew}>NEW</span>}
                    </div>
                  </div>
                  <div className={styles.cardInfo}>
                    <p className={styles.cardTitle} title={item.title}>{item.title}</p>
                    <p className={styles.cardMeta}>{item.year} • {item.quality || 'HD'} • ⭐ {item.rating || '—'}</p>
                    <p className={styles.cardGenres}>{(item.genres || []).slice(0, 3).join(', ')}</p>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.editBtn} onClick={() => setEditItem(item)}>✏️ Edit</button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(item)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payments Tab ── */}
      {activeTab === 'payments' && (
        <div className={styles.contentSection}>
          <div className={styles.filterBar}>
            <button className={paymentSubTab === 'pending' ? styles.activeTab : styles.tab} onClick={() => setPaymentSubTab('pending')}>
              Pending ({pendingPayments.length})
            </button>
            <button className={paymentSubTab === 'all' ? styles.activeTab : styles.tab} onClick={() => setPaymentSubTab('all')}>
              All Payments
            </button>
          </div>
          {loading ? <div className={styles.loading}>Loading...</div> : payments.length === 0 ? (
            <div className={styles.empty}>{paymentSubTab === 'pending' ? 'No pending payments' : 'No payments yet'}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th><th>Transaction ID</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p._id}>
                      <td>{new Date(p.processedAt).toLocaleString()}</td>
                      <td className={styles.txId}>{p.transactionId}</td>
                      <td>{p.userId?.email || 'N/A'}</td>
                      <td>{p.planRequested}</td>
                      <td>ETB {p.expectedAmount}</td>
                      <td><span className={`${styles.status} ${styles[p.status]}`}>{p.status}</span></td>
                      <td>
                        {p.status === 'pending' && (
                          <div className={styles.actions}>
                            <button className={styles.approve} onClick={() => handleApprove(p.transactionId)}>✓ Approve</button>
                            <button className={styles.reject} onClick={() => handleReject(p.transactionId)}>✕ Reject</button>
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
      )}
    </div>
  );
}
