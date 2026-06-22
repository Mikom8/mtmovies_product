import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import styles from './Admin.module.css';

// ─── Shared field definitions ─────────────────────────────────
const MOVIE_FIELDS = [
  { name: 'title',            label: 'Title *',          placeholder: 'Movie title',   required: true },
  { name: 'year',             label: 'Year',             placeholder: '2024' },
  { name: 'quality',          label: 'Quality',          placeholder: 'HD / FHD / 4K' },
  { name: 'rating',           label: 'Rating',           placeholder: '8.5' },
  { name: 'poster',           label: 'Poster URL',       placeholder: 'https://...', full: true },
  { name: 'backdrop',         label: 'Backdrop URL',     placeholder: 'https://...', full: true },
  { name: 'genres',           label: 'Genres (comma)',   placeholder: 'Action, Drama', full: true },
  { name: 'telegram_chatId',  label: 'Telegram Chat ID',    placeholder: '-100xxxxxxxxxx' },
  { name: 'telegram_messageId', label: 'Telegram Message ID', placeholder: '12345' },
];

const SERIES_FIELDS = [
  { name: 'title',            label: 'Title *',          placeholder: 'Series title',  required: true },
  { name: 'year',             label: 'Year',             placeholder: '2024' },
  { name: 'quality',          label: 'Quality',          placeholder: 'HD / FHD / 4K' },
  { name: 'rating',           label: 'Rating',           placeholder: '8.5' },
  { name: 'poster',           label: 'Poster URL',       placeholder: 'https://...', full: true },
  { name: 'backdrop',         label: 'Backdrop URL',     placeholder: 'https://...', full: true },
  { name: 'genres',           label: 'Genres (comma)',   placeholder: 'Action, Drama', full: true },
  { name: 'telegram_chatId',  label: 'Telegram Chat ID',    placeholder: '-100xxxxxxxxxx' },
  { name: 'telegram_messageId', label: 'Telegram Message ID', placeholder: '12345' },
];

const BLANK_FORM = {
  title: '', year: '', quality: '', rating: '',
  poster: '', backdrop: '', genres: '',
  telegram_chatId: '', telegram_messageId: '',
  isFree: false, isFeatured: false, isNew: false,
};

// ─── Edit / Add Modal ──────────────────────────────────────────
function ItemModal({ item, type, mode, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const fields = type === 'movie' ? MOVIE_FIELDS : SERIES_FIELDS;

  const [form, setForm] = useState(
    isEdit
      ? {
          title:              item.title || '',
          year:               item.year || '',
          quality:            item.quality || '',
          rating:             item.rating || '',
          poster:             item.poster || '',
          backdrop:           item.backdrop || '',
          genres:             (item.genres || []).join(', '),
          telegram_chatId:    item.telegram?.chatId || '',
          telegram_messageId: item.telegram?.messageId || '',
          isFree:             item.isFree ?? false,
          isFeatured:         item.isFeatured ?? false,
          isNew:              item.isNew ?? false,
        }
      : { ...BLANK_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm(f => ({ ...f, [name]: t === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const endpoint = type === 'movie' ? '/movies' : '/series';
      const payload  = {
        ...form,
        genres: form.genres.split(',').map(g => g.trim()).filter(Boolean),
        telegram: {
          chatId:    form.telegram_chatId    || undefined,
          messageId: form.telegram_messageId || undefined,
        },
      };
      // remove flat keys before sending
      delete payload.telegram_chatId;
      delete payload.telegram_messageId;
      const url    = isEdit ? `${API_BASE_URL}${endpoint}/${item._id}` : `${API_BASE_URL}${endpoint}`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const typeName = type === 'movie' ? 'Movie' : 'Series';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? `Edit ${typeName}` : `Add New ${typeName}`}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Poster Preview */}
          <div className={styles.posterPreview}>
            {form.poster
              ? <img src={form.poster} alt="preview" onError={e => { e.target.style.display='none'; }} />
              : <div className={styles.posterPlaceholder}>Poster Preview</div>}
          </div>

          <div className={styles.formGrid}>
            {fields.map(f => (
              <div key={f.name} className={`${styles.formGroup} ${f.full ? styles.fullWidth : ''}`}>
                <label>{f.label}</label>
                <input
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div className={styles.checkboxRow}>
              {[['isFree','Free to Watch'],['isFeatured','Featured (Hero)'],['isNew','New Release']].map(([n,l]) => (
                <label key={n} className={styles.checkboxLabel}>
                  <input type="checkbox" name={n} checked={form[n]} onChange={handleChange} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? '✓ Save Changes' : '＋ Add ' + typeName}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────
const PAGE_LIMIT = 100;

export default function Admin() {
  const [activeTab, setActiveTab] = useState('movies');

  // Content state
  const [items,       setItems]       = useState([]);
  const [totalItems,  setTotalItems]  = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [allGenres,   setAllGenres]   = useState([]);
  const [modal,       setModal]       = useState(null); // { mode:'edit'|'add', item, type }
  const [toast,       setToast]       = useState('');

  // Payments state
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments,     setAllPayments]     = useState([]);
  const [paymentSubTab,   setPaymentSubTab]   = useState('pending');
  const [payLoading,      setPayLoading]      = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Load content with pagination ──
  const loadContent = async (pg = 1) => {
    setLoading(true);
    try {
      const base    = activeTab === 'movies' ? '/movies' : '/series';
      const params  = new URLSearchParams({ page: pg, limit: PAGE_LIMIT });
      if (search)      params.set('search', search);
      if (genreFilter) params.set('genre',  genreFilter);
      const res  = await fetch(`${API_BASE_URL}${base}?${params}`);
      const data = await res.json();
      const list = activeTab === 'movies' ? (data.movies || []) : (data.series || []);
      setItems(list);
      setTotalItems(data.total || list.length);
      setPage(pg);

      // Collect genres from current page for filter dropdown (load all for filter)
      if (pg === 1 && !search && !genreFilter) {
        const genreRes  = await fetch(`${API_BASE_URL}${base}?limit=500`);
        const genreData = await genreRes.json();
        const allList   = activeTab === 'movies' ? (genreData.movies || []) : (genreData.series || []);
        setAllGenres([...new Set(allList.flatMap(i => i.genres || []))].sort());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'payments') {
      setPage(1); setSearch(''); setGenreFilter('');
      loadContent(1);
    } else {
      loadPayments();
    }
  }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadContent(1);
  };

  const totalPages = Math.ceil(totalItems / PAGE_LIMIT);

  // ── Payments ──
  const loadPayments = async () => {
    setPayLoading(true);
    try {
      const ep  = paymentSubTab === 'pending' ? '/admin/payments/pending' : '/admin/payments/all';
      const res = await fetch(`${API_BASE_URL}${ep}`);
      const d   = await res.json();
      if (d.success) {
        if (paymentSubTab === 'pending') setPendingPayments(d.data);
        else setAllPayments(d.data);
      }
    } catch (err) { console.error(err); }
    finally { setPayLoading(false); }
  };

  useEffect(() => { if (activeTab === 'payments') loadPayments(); }, [paymentSubTab]);

  const handleApprove = async (tid) => {
    if (!confirm('Approve this payment?')) return;
    const res = await fetch(`${API_BASE_URL}/admin/payments/${tid}/approve`, { method: 'POST' });
    const d   = await res.json();
    d.success ? showToast('✅ Approved!') : showToast('❌ ' + d.message);
    loadPayments();
  };

  const handleReject = async (tid) => {
    if (!confirm('Reject this payment?')) return;
    const res = await fetch(`${API_BASE_URL}/admin/payments/${tid}/reject`, { method: 'POST' });
    const d   = await res.json();
    d.success ? showToast('Rejected') : showToast('❌ ' + d.message);
    loadPayments();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const ep  = activeTab === 'movies' ? '/movies' : '/series';
    const res = await fetch(`${API_BASE_URL}${ep}/${item._id}`, { method: 'DELETE' });
    res.ok ? showToast('🗑️ Deleted') : showToast('❌ Delete failed');
    loadContent(page);
  };

  const handleEditClick = async (item) => {
    try {
      const type = activeTab === 'movies' ? 'movie' : 'series';
      const endpoint = activeTab === 'movies' ? '/movies' : '/series';
      const res = await fetch(`${API_BASE_URL}${endpoint}/${item._id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      const detailedItem = type === 'movie' ? data.movie : data.series;
      setModal({ mode: 'edit', item: detailedItem || item, type });
    } catch (err) {
      console.error('Error fetching item details:', err);
      setModal({ mode: 'edit', item, type: activeTab === 'movies' ? 'movie' : 'series' });
    }
  };

  const payments = paymentSubTab === 'pending' ? pendingPayments : allPayments;

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {modal && (
        <ItemModal
          item={modal.item}
          type={modal.type}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSaved={() => { loadContent(modal.mode === 'add' ? 1 : page); showToast(modal.mode === 'add' ? '✅ Added!' : '✅ Saved!'); }}
        />
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.logo}>🎬 MTMovies Admin</div>
        <div className={styles.tabs}>
          {['movies','series','payments'].map(t => (
            <button key={t} className={activeTab === t ? styles.activeTab : styles.tab} onClick={() => setActiveTab(t)}>
              {t === 'movies' ? '🎥 Movies' : t === 'series' ? '📺 Series' : '💳 Payments'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Tabs ── */}
      {(activeTab === 'movies' || activeTab === 'series') && (
        <div className={styles.contentSection}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <form className={styles.filterBar} onSubmit={handleSearch}>
              <input
                className={styles.searchInput}
                placeholder={`Search ${activeTab}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className={styles.genreSelect} value={genreFilter} onChange={e => { setGenreFilter(e.target.value); }}>
                <option value="">All Genres</option>
                {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <button type="submit" className={styles.searchBtn}>Search</button>
              {(search || genreFilter) && (
                <button type="button" className={styles.clearBtn} onClick={() => { setSearch(''); setGenreFilter(''); loadContent(1); }}>
                  Clear
                </button>
              )}
            </form>
            <div className={styles.toolbarRight}>
              <span className={styles.countBadge}>{totalItems} total</span>
              <button
                className={styles.addBtn}
                onClick={() => setModal({ mode: 'add', item: null, type: activeTab === 'movies' ? 'movie' : 'series' })}
              >
                ＋ Add {activeTab === 'movies' ? 'Movie' : 'Series'}
              </button>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className={styles.loadingGrid}>
              {[...Array(12)].map((_, i) => <div key={i} className={styles.skeletonCard} />)}
            </div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>No {activeTab} found.</div>
          ) : (
            <div className={styles.contentGrid}>
              {items.map(item => (
                <div key={item._id} className={styles.contentCard}>
                  <div className={styles.cardPoster}>
                    {item.poster
                      ? <img src={item.poster} alt={item.title} loading="lazy" />
                      : <div className={styles.noPoster}>No Poster</div>}
                    <div className={styles.cardBadges}>
                      {item.isFree     && <span className={styles.badgeFree}>FREE</span>}
                      {item.isFeatured && <span className={styles.badgeFeatured}>⭐</span>}
                      {item.isNew      && <span className={styles.badgeNew}>NEW</span>}
                    </div>
                  </div>
                  <div className={styles.cardInfo}>
                    <p className={styles.cardTitle} title={item.title}>{item.title}</p>
                    <p className={styles.cardMeta}>{item.year} • {item.quality || 'HD'} • ⭐ {item.rating || '—'}</p>
                    <p className={styles.cardGenres}>{(item.genres || []).slice(0,3).join(', ')}</p>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.editBtn}
                      onClick={() => handleEditClick(item)}>
                      ✏️ Edit
                    </button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(item)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => loadContent(page - 1)}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => loadContent(page + 1)}
              >
                Next →
              </button>
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
          {payLoading ? <div className={styles.loading}>Loading…</div> : payments.length === 0 ? (
            <div className={styles.empty}>{paymentSubTab === 'pending' ? 'No pending payments' : 'No payments yet'}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Date</th><th>Transaction ID</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
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
                            <button className={styles.reject}  onClick={() => handleReject(p.transactionId)}>✕ Reject</button>
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
