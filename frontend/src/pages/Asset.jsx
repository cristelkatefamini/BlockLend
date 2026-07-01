import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assetAPI, borrowAPI } from '../utils/api';
import '../styles/pages/Asset.css';

/* ── Simple inline notification modal ────────────────────────── */
function NotifyModal({ type, title, message, onClose }) {
  if (!message) return null;
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notify-modal" onClick={e => e.stopPropagation()}>
        <div className={`notify-modal-icon notify-modal-icon--${type}`}>
          {icons[type] || '!'}
        </div>
        {title && <h3 className="notify-modal-title">{title}</h3>}
        <p className="notify-modal-message">{message}</p>
        <button className="btn btn-primary notify-modal-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

export default function Asset() {
  const { isAdmin } = useAuth();  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowDays, setBorrowDays] = useState('7');
  const [borrowQuantityInput, setBorrowQuantityInput] = useState('1');
  const [borrowReason, setBorrowReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('all');

  // Notification modal state
  const [notify, setNotify] = useState(null); // { type, title, message }

  const showNotify = (type, title, message) => setNotify({ type, title, message });
  const closeNotify = () => setNotify(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAssets();
      const assetsData = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      const availableAssets = assetsData.filter(asset => asset.in_stock && asset.quantity > 0);
      setAssets(availableAssets);
      setFilteredAssets(availableAssets);
      setError('');
    } catch (err) {
      setError('Failed to load assets');
      console.error(err);
      setAssets([]);
      setFilteredAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const nextAssets = assets.filter((asset) => {
      const matchesSearch = !term ||
        asset.name?.toLowerCase().includes(term) ||
        asset.description?.toLowerCase().includes(term) ||
        asset.asset_type?.toLowerCase().includes(term);
      const matchesType = selectedAssetType === 'all' || asset.asset_type === selectedAssetType;
      return matchesSearch && matchesType;
    });
    setFilteredAssets(nextAssets);
  }, [searchTerm, selectedAssetType, assets]);

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    const formData = new FormData(e.target);
    const borrowQty = parseInt(formData.get('quantity') || borrowQuantityInput, 10);
    const durationDays = parseInt(formData.get('duration_days') || borrowDays, 10);

    if (Number.isNaN(borrowQty) || borrowQty < 1) {
      showNotify('warning', 'Invalid Quantity', 'Please enter a valid quantity (at least 1).');
      return;
    }
    if (borrowQty > selectedAsset.quantity) {
      showNotify('warning', 'Quantity Exceeds Stock', `Only ${selectedAsset.quantity} item(s) are available.`);
      return;
    }
    if (Number.isNaN(durationDays) || durationDays < 1) {
      showNotify('warning', 'Invalid Duration', 'Please enter a valid duration (at least 1 day).');
      return;
    }

    setSubmitting(true);
    try {
      await borrowAPI.createBorrowRequest({
        asset_id: selectedAsset._id,
        duration_days: durationDays,
        quantity: borrowQty,
        reason: borrowReason,
      });
      setShowBorrowModal(false);
      setSelectedAsset(null);
      setBorrowReason('');
      setBorrowDays('7');
      setBorrowQuantityInput('1');
      await fetchAssets();
      showNotify('success', 'Request Submitted', 'Your borrow request has been submitted successfully! An admin will review it shortly.');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to submit borrow request.';
      showNotify('error', 'Request Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="asset-container page-container">
      <div className="container">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="filter-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <label>Asset Type:</label>
            <select
              value={selectedAssetType}
              onChange={(e) => setSelectedAssetType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {[...new Set(assets.map(asset => asset.asset_type).filter(Boolean))].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="assets-grid">
          {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
              <div key={asset._id} className="asset-card">
                <div className="asset-image">
                  {asset.image_url ? (
                    <img src={asset.image_url} alt={asset.name} />
                  ) : (
                    <div className="placeholder">📦</div>
                  )}
                </div>
                <div className="asset-content">
                  <h3>{asset.name}</h3>
                  <p className="asset-type">Type: {asset.asset_type}</p>
                  {asset.description && <p className="asset-description">Description: {asset.description}</p>}
                  <p className="asset-quantity">Quantity Available: {asset.quantity}</p>

                  <div className="asset-status">
                    <span className={`badge badge-${asset.in_stock ? 'success' : 'warning'}`}>
                      {asset.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                  </div>

                  {!isAdmin && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setBorrowQuantityInput('1');
                        setBorrowDays('7');
                        setShowBorrowModal(true);
                      }}
                      disabled={!asset.in_stock || asset.quantity === 0}
                    >
                      Request to Borrow
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No assets match your search or filter.</p>
            </div>
          )}
        </div>

        {/* Borrow request modal */}
        {showBorrowModal && selectedAsset && (
          <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Borrow Request</h2>
                <button className="close-btn" onClick={() => setShowBorrowModal(false)}>✕</button>
              </div>

              <div className="modal-body">
                <p><strong>Asset:</strong> {selectedAsset.name}</p>
                <p><strong>Type:</strong> {selectedAsset.asset_type}</p>
                {selectedAsset.description && <p><strong>Description:</strong> {selectedAsset.description}</p>}
                <p><strong>Available Quantity:</strong> {selectedAsset.quantity}</p>

                <form onSubmit={handleBorrowSubmit}>
                  <div className="form-group">
                    <label htmlFor="borrowQuantity">Quantity</label>
                    <input
                      id="borrowQuantity"
                      name="quantity"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={borrowQuantityInput}
                      onChange={(e) => setBorrowQuantityInput(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => {
                        let val = parseInt(borrowQuantityInput, 10);
                        if (Number.isNaN(val) || val < 1) val = 1;
                        if (val > selectedAsset.quantity) val = selectedAsset.quantity;
                        setBorrowQuantityInput(String(val));
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="borrowDays">Duration (days)</label>
                    <input
                      id="borrowDays"
                      name="duration_days"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={borrowDays}
                      onChange={(e) => setBorrowDays(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => {
                        let val = parseInt(borrowDays, 10);
                        if (Number.isNaN(val) || val < 1) val = 1;
                        if (val > 30) val = 30;
                        setBorrowDays(String(val));
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="borrowReason">Reason for Borrowing</label>
                    <textarea
                      id="borrowReason"
                      value={borrowReason}
                      onChange={(e) => setBorrowReason(e.target.value)}
                      placeholder="Explain why you need this asset..."
                      required
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowBorrowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Notification modal — replaces browser alert() */}
        {notify && (
          <NotifyModal
            type={notify.type}
            title={notify.title}
            message={notify.message}
            onClose={closeNotify}
          />
        )}
      </div>
    </div>
  );
}
