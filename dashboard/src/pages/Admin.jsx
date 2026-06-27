import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import styles from './Admin.module.css';

// ─── Shared field definitions ─────────────────────────────────
const MOVIE_FIELDS = [
  { name: 'title', label: 'Title *', placeholder: 'Movie title', required: true },
  { name: 'year', label: 'Year', placeholder: '2024' },
  { name: 'duration', label: 'Duration', placeholder: '2h 15m' },
  { name: 'quality', label: 'Quality', placeholder: 'HD / FHD / 4K' },
  { name: 'rating', label: 'Rating', placeholder: '8.5' },
  { name: 'poster', label: 'Poster URL', placeholder: 'https://...', full: true },
  { name: 'backdrop', label: 'Backdrop URL', placeholder: 'https://...', full: true },
  { name: 'mylist', label: 'My List Image URL (optional)', placeholder: 'https://...', full: true },
  { name: 'featurePhone', label: 'Feature Phone Image URL (optional)', placeholder: 'https://...', full: true },
  { name: 'genres', label: 'Genres (comma)', placeholder: 'Action, Drama', full: true },
  { name: 'description', label: 'Description', placeholder: 'Brief plot overview…', full: true, textarea: true },
  { name: 'telegram_chatId', label: 'Telegram Chat ID', placeholder: '-100xxxxxxxxxx' },
  { name: 'telegram_messageId', label: 'Telegram Message ID', placeholder: '12345' },
];

const SERIES_FIELDS = [
  { name: 'title', label: 'Title *', placeholder: 'Series title', required: true },
  { name: 'year', label: 'Year', placeholder: '2024' },
  { name: 'duration', label: 'Avg Episode Duration', placeholder: '45m' },
  { name: 'quality', label: 'Quality', placeholder: 'HD / FHD / 4K' },
  { name: 'rating', label: 'Rating', placeholder: '8.5' },
  { name: 'poster', label: 'Poster URL', placeholder: 'https://...', full: true },
  { name: 'backdrop', label: 'Backdrop URL', placeholder: 'https://...', full: true },
  { name: 'mylist', label: 'My List Image URL (optional)', placeholder: 'https://...', full: true },
  { name: 'featurePhone', label: 'Feature Phone Image URL (optional)', placeholder: 'https://...', full: true },
  { name: 'genres', label: 'Genres (comma)', placeholder: 'Action, Drama', full: true },
  { name: 'description', label: 'Description', placeholder: 'Brief plot overview…', full: true, textarea: true },
  { name: 'telegram_chatId', label: 'Telegram Chat ID', placeholder: '-100xxxxxxxxxx' },
  { name: 'telegram_messageId', label: 'Telegram Message ID', placeholder: '12345' },
];

const BLANK_FORM = {
  title: '', year: '', duration: '', quality: '', rating: '',
  poster: '', backdrop: '', mylist: '', featurePhone: '', genres: '', description: '',
  telegram_chatId: '', telegram_messageId: '',
  isFree: false, isFeatured: false, isNew: false, hasAmharicDub: true,
};

// ─── Edit / Add Modal ──────────────────────────────────────────
function ItemModal({ item, type, mode, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const fields = type === 'movie' ? MOVIE_FIELDS : SERIES_FIELDS;

  const [form, setForm] = useState(
    isEdit
      ? {
        title: item.title || '',
        year: item.year || '',
        duration: item.duration || '',
        quality: item.quality || '',
        rating: item.rating || '',
        poster: item.poster || '',
        backdrop: item.backdrop || '',
        mylist: item.mylist || '',
        featurePhone: item.featurePhone || '',
        genres: (item.genres || []).join(', '),
        description: item.description || '',
        telegram_chatId: item.telegram?.chatId || '',
        telegram_messageId: item.telegram?.messageId || '',
        isFree: item.isFree ?? false,
        isFeatured: item.isFeatured ?? false,
        isNew: item.isNew ?? false,
        hasAmharicDub: item.hasAmharicDub ?? true,
      }
      : { ...BLANK_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm(f => ({ ...f, [name]: t === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const endpoint = type === 'movie' ? '/movies' : '/series';
      const payload = {
        ...form,
        genres: form.genres.split(',').map(g => g.trim()).filter(Boolean),
        telegram: {
          chatId: form.telegram_chatId || undefined,
          messageId: form.telegram_messageId || undefined,
        },
      };
      // remove flat keys before sending
      delete payload.telegram_chatId;
      delete payload.telegram_messageId;
      const url = isEdit ? `${API_BASE_URL}${endpoint}/${item._id}` : `${API_BASE_URL}${endpoint}`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
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
          {/* Image Previews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>

            {/* Row 1: Poster (portrait) + Feature Phone (portrait) */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: '#888' }}>Poster</div>
                <div className={styles.posterPreview}>
                  {form.poster
                    ? <img src={form.poster} alt="poster" onError={e => { e.target.style.display = 'none'; }} />
                    : <div className={styles.posterPlaceholder}>Poster</div>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: '#888' }}>Feature Phone</div>
                <div className={styles.posterPreview}>
                  {form.featurePhone
                    ? <img src={form.featurePhone} alt="featurePhone" onError={e => { e.target.style.display = 'none'; }} />
                    : <div className={styles.posterPlaceholder}>Feature Phone</div>}
                </div>
              </div>
            </div>

            {/* Row 2: Backdrop (landscape) */}
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Backdrop</div>
              <div className={styles.backdropPreview}>
                {form.backdrop
                  ? <img src={form.backdrop} alt="backdrop" onError={e => { e.target.style.display = 'none'; }} />
                  : <div className={styles.posterPlaceholder}>Backdrop Preview</div>}
              </div>
            </div>

            {/* Row 3: My List (landscape) */}
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>My List</div>
              <div className={styles.backdropPreview}>
                {form.mylist
                  ? <img src={form.mylist} alt="mylist" onError={e => { e.target.style.display = 'none'; }} />
                  : <div className={styles.posterPlaceholder}>My List Preview</div>}
              </div>
            </div>

          </div>

          <div className={styles.formGrid}>
            {fields.map(f => (
              <div key={f.name} className={`${styles.formGroup} ${f.full ? styles.fullWidth : ''}`}>
                <label>{f.label}</label>
                {f.textarea ? (
                  <textarea
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    className={styles.textarea}
                    rows={4}
                  />
                ) : (
                  <input
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
            <div className={styles.checkboxRow}>
              {[['isFree', 'Free to Watch'], ['isFeatured', 'Featured (Hero)'], ['isNew', 'New Release'], ['hasAmharicDub', 'Amharic Dub']].map(([n, l]) => (
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

// ─── Episodes Modal ──────────────────────────────────────────
function EpisodesModal({ series, onClose, onSaved }) {
  const [seasons, setSeasons] = useState(series.seasons || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingEp, setEditingEp] = useState(null); // { seasonIndex, epIndex, data }
  const [bulkAdd, setBulkAdd] = useState(null); // { seasonIndex, startId, endId, baseDuration, telegramChatId }

  const handleSaveAll = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/series/${series._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasons })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save episodes');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSeason = () => {
    const nextNum = seasons.length > 0 ? Math.max(...seasons.map(s => s.seasonNumber)) + 1 : 1;
    setSeasons([...seasons, { seasonNumber: nextNum, episodes: [] }]);
  };

  const deleteSeason = (sIdx) => {
    if (!confirm('Delete entire season?')) return;
    const newSeasons = [...seasons];
    newSeasons.splice(sIdx, 1);
    setSeasons(newSeasons);
  };

  const addEpisode = (seasonIndex) => {
    const season = seasons[seasonIndex];
    const nextNum = season.episodes.length > 0 ? Math.max(...season.episodes.map(e => e.episodeNumber)) + 1 : 1;
    setEditingEp({
      seasonIndex,
      epIndex: -1, // new
      data: { episodeNumber: nextNum, title: `Episode ${nextNum}`, duration: '45m', telegramChatId: '', telegramMessageId: '' }
    });
  };

  const editEpisode = (seasonIndex, epIndex) => {
    setEditingEp({ seasonIndex, epIndex, data: { ...seasons[seasonIndex].episodes[epIndex] } });
  };

  const deleteEpisode = (seasonIndex, epIndex) => {
    if (!confirm('Delete episode?')) return;
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].episodes.splice(epIndex, 1);
    setSeasons(newSeasons);
  };

  const saveEpisodeForm = () => {
    const newSeasons = [...seasons];
    if (editingEp.epIndex === -1) {
      newSeasons[editingEp.seasonIndex].episodes.push(editingEp.data);
    } else {
      newSeasons[editingEp.seasonIndex].episodes[editingEp.epIndex] = editingEp.data;
    }
    setSeasons(newSeasons);
    setEditingEp(null);
  };

  const startBulkAdd = (seasonIndex) => {
    setBulkAdd({ seasonIndex, startId: '', endId: '', baseDuration: '45m', telegramChatId: '' });
  };

  const saveBulkAdd = () => {
    const start = parseInt(bulkAdd.startId);
    const end = parseInt(bulkAdd.endId);
    if (isNaN(start) || isNaN(end) || start > end) {
      alert("Invalid start or end ID");
      return;
    }

    const newSeasons = [...seasons];
    const season = newSeasons[bulkAdd.seasonIndex];
    let nextNum = season.episodes.length > 0 ? Math.max(...season.episodes.map(e => e.episodeNumber)) + 1 : 1;

    for (let msgId = start; msgId <= end; msgId++) {
      season.episodes.push({
        episodeNumber: nextNum,
        title: `Episode ${nextNum}`,
        duration: bulkAdd.baseDuration,
        telegramChatId: bulkAdd.telegramChatId,
        telegramMessageId: String(msgId)
      });
      nextNum++;
    }
    setSeasons(newSeasons);
    setBulkAdd(null);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Manage Episodes: {series.title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {editingEp ? (
            <div className={styles.epForm}>
              <h3>{editingEp.epIndex === -1 ? 'Add Episode' : 'Edit Episode'}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Episode Number</label>
                  <input type="number" value={editingEp.data.episodeNumber} onChange={e => setEditingEp({ ...editingEp, data: { ...editingEp.data, episodeNumber: parseInt(e.target.value) || '' } })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Title</label>
                  <input value={editingEp.data.title} onChange={e => setEditingEp({ ...editingEp, data: { ...editingEp.data, title: e.target.value } })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Duration</label>
                  <input value={editingEp.data.duration} onChange={e => setEditingEp({ ...editingEp, data: { ...editingEp.data, duration: e.target.value } })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Telegram Chat ID</label>
                  <input value={editingEp.data.telegramChatId} onChange={e => setEditingEp({ ...editingEp, data: { ...editingEp.data, telegramChatId: e.target.value } })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Telegram Message ID</label>
                  <input value={editingEp.data.telegramMessageId} onChange={e => setEditingEp({ ...editingEp, data: { ...editingEp.data, telegramMessageId: e.target.value } })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className={styles.cancelBtn} onClick={() => setEditingEp(null)}>Cancel</button>
                <button className={styles.saveBtn} onClick={saveEpisodeForm}>Save Episode</button>
              </div>
            </div>
          ) : bulkAdd ? (
            <div className={styles.epForm}>
              <h3>Bulk Add Episodes (Season {seasons[bulkAdd.seasonIndex].seasonNumber})</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Start Message ID</label>
                  <input type="number" placeholder="e.g. 13051" value={bulkAdd.startId} onChange={e => setBulkAdd({ ...bulkAdd, startId: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>End Message ID</label>
                  <input type="number" placeholder="e.g. 13058" value={bulkAdd.endId} onChange={e => setBulkAdd({ ...bulkAdd, endId: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Duration (All)</label>
                  <input value={bulkAdd.baseDuration} onChange={e => setBulkAdd({ ...bulkAdd, baseDuration: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Telegram Chat ID (All)</label>
                  <input value={bulkAdd.telegramChatId} onChange={e => setBulkAdd({ ...bulkAdd, telegramChatId: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className={styles.cancelBtn} onClick={() => setBulkAdd(null)}>Cancel</button>
                <button className={styles.saveBtn} onClick={saveBulkAdd}>Generate Episodes</button>
              </div>
            </div>
          ) : (
            <div className={styles.seasonsList}>
              {seasons.map((season, sIdx) => (
                <div key={sIdx} className={styles.seasonBlock}>
                  <div className={styles.seasonHeader}>
                    <h3>Season {season.seasonNumber}</h3>
                    <div>
                      <button className={styles.addBtn} onClick={() => addEpisode(sIdx)}>+ Add Episode</button>
                      <button className={styles.addBtn} style={{ marginLeft: '10px', background: 'rgba(160,160,255,0.15)', color: '#a0a0ff', borderColor: 'rgba(160,160,255,0.3)' }} onClick={() => startBulkAdd(sIdx)}>+ Bulk Add</button>
                      <button className={styles.deleteBtn} style={{ marginLeft: '10px' }} onClick={() => deleteSeason(sIdx)}>🗑️</button>
                    </div>
                  </div>
                  <div className={styles.episodesGrid}>
                    {season.episodes.map((ep, eIdx) => (
                      <div key={eIdx} className={styles.epCard}>
                        <div className={styles.epInfo}>
                          <strong>E{ep.episodeNumber}: {ep.title}</strong>
                          <span className={styles.epMeta}>{ep.duration || 'N/A'} | Chat: {ep.telegramChatId || 'N/A'} | Msg: {ep.telegramMessageId || 'N/A'}</span>
                        </div>
                        <div className={styles.epActions}>
                          <button onClick={() => editEpisode(sIdx, eIdx)}>✏️</button>
                          <button onClick={() => deleteEpisode(sIdx, eIdx)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {season.episodes.length === 0 && <p className={styles.empty}>No episodes yet.</p>}
                  </div>
                </div>
              ))}
              <button className={styles.addBtn} style={{ marginTop: '15px', alignSelf: 'flex-start' }} onClick={addSeason}>+ Add Season</button>
            </div>
          )}
        </div>

        {(!editingEp && !bulkAdd) && (
          <div className={styles.modalFooter}>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSaveAll} disabled={saving}>
              {saving ? 'Saving...' : '✓ Save All Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────
const PAGE_LIMIT = 100;

export default function Admin() {
  const [activeTab, setActiveTab] = useState('movies');

  // Content state
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [allGenres, setAllGenres] = useState([]);
  const [modal, setModal] = useState(null); // { mode:'edit'|'add', item, type }
  const [episodesModal, setEpisodesModal] = useState(null); // holds the series item
  const [toast, setToast] = useState('');

  // Payments state
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [paymentSubTab, setPaymentSubTab] = useState('pending');
  const [payLoading, setPayLoading] = useState(false);

  // Notifications state
  const [notifForm, setNotifForm] = useState({ title: '', body: '', imageUrl: '' });
  const [notifSending, setNotifSending] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Load content with pagination ──
  const loadContent = async (pg = 1) => {
    setLoading(true);
    try {
      const base = activeTab === 'movies' ? '/movies' : '/series';
      const params = new URLSearchParams({ page: pg, limit: PAGE_LIMIT });
      if (search) params.set('search', search);
      if (genreFilter) params.set('genre', genreFilter);
      const res = await fetch(`${API_BASE_URL}${base}?${params}`);
      const data = await res.json();
      const list = activeTab === 'movies' ? (data.movies || []) : (data.series || []);
      setItems(list);
      setTotalItems(data.total || list.length);
      setPage(pg);

      // Collect genres from current page for filter dropdown (load all for filter)
      if (pg === 1 && !search && !genreFilter) {
        const genreRes = await fetch(`${API_BASE_URL}${base}?limit=500`);
        const genreData = await genreRes.json();
        const allList = activeTab === 'movies' ? (genreData.movies || []) : (genreData.series || []);
        setAllGenres([...new Set(allList.flatMap(i => i.genres || []))].sort());
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.body) {
      showToast('⚠️ Title and Message are required.');
      return;
    }
    setNotifSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send notifications');
      showToast(`✅ ${data.message}`);
      setNotifForm({ title: '', body: '', imageUrl: '' });
    } catch (err) {
      console.error(err);
      showToast(`❌ ${err.message}`);
    } finally {
      setNotifSending(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'movies' || activeTab === 'series') {
      setPage(1); setSearch(''); setGenreFilter('');
      loadContent(1);
    } else if (activeTab === 'payments') {
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
      const ep = paymentSubTab === 'pending' ? '/admin/payments/pending' : '/admin/payments/all';
      const res = await fetch(`${API_BASE_URL}${ep}`);
      const d = await res.json();
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
    const d = await res.json();
    d.success ? showToast('✅ Approved!') : showToast('❌ ' + d.message);
    loadPayments();
  };

  const handleReject = async (tid) => {
    if (!confirm('Reject this payment?')) return;
    const res = await fetch(`${API_BASE_URL}/admin/payments/${tid}/reject`, { method: 'POST' });
    const d = await res.json();
    d.success ? showToast('Rejected') : showToast('❌ ' + d.message);
    loadPayments();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const ep = activeTab === 'movies' ? '/movies' : '/series';
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

  const handleEpisodesClick = async (item) => {
    try {
      const res = await fetch(`${API_BASE_URL}/series/${item._id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setEpisodesModal(data.series);
    } catch (err) {
      console.error('Error fetching series details:', err);
      setEpisodesModal(item);
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

      {episodesModal && (
        <EpisodesModal
          series={episodesModal}
          onClose={() => setEpisodesModal(null)}
          onSaved={() => { loadContent(page); showToast('✅ Episodes Saved!'); }}
        />
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.logo}>🎬 MTMovies Admin</div>
        <div className={styles.tabs}>
          {['movies', 'series', 'payments', 'notifications'].map(t => (
            <button key={t} className={activeTab === t ? styles.activeTab : styles.tab} onClick={() => setActiveTab(t)}>
              {t === 'movies' ? '🎥 Movies' : t === 'series' ? '📺 Series' : t === 'payments' ? '💳 Payments' : '🔔 Notifications'}
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
                    <button className={styles.editBtn}
                      onClick={() => handleEditClick(item)}>
                      ✏️ Edit
                    </button>
                    {activeTab === 'series' && (
                      <button className={styles.editBtn} style={{ background: '#2b2b40', color: '#a0a0ff', borderColor: '#404070' }}
                        onClick={() => handleEpisodesClick(item)}>
                        📺 Episodes
                      </button>
                    )}
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

      {/* ── Notifications Tab ── */}
      {activeTab === 'notifications' && (
        <div className={styles.contentSection}>
          <div className={styles.notificationsContainer}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>Broadcast Push Notification</h2>
            <form onSubmit={handleSendNotification} className={styles.notifForm}>
              <div className={styles.formGroup}>
                <label>Title *</label>
                <input
                  value={notifForm.title}
                  onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                  placeholder="e.g. New Movie Release!"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Message Body *</label>
                <textarea
                  value={notifForm.body}
                  onChange={e => setNotifForm({ ...notifForm, body: e.target.value })}
                  placeholder="Check out the latest action blockbuster..."
                  rows={4}
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Image URL (Optional)</label>
                <input
                  value={notifForm.imageUrl}
                  onChange={e => setNotifForm({ ...notifForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {notifForm.imageUrl && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={notifForm.imageUrl}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #404070' }}
                    onError={e => e.target.style.display = 'none'}
                  />
                </div>
              )}

              <button
                type="submit"
                className={styles.saveBtn}
                style={{ marginTop: '20px', padding: '15px', fontSize: '16px' }}
                disabled={notifSending}
              >
                {notifSending ? 'Broadcasting...' : '🚀 Send to All Users'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
