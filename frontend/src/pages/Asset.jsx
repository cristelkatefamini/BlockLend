import { useState, useEffect } from 'react';
import { assetAPI, borrowAPI } from '../utils/api';
import '../styles/pages/Asset.css';

export default function Asset() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowDays, setBorrowDays] = useState(7);
  const [borrowReason, setBorrowReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setError('');
    } catch (err) {
      setError('Failed to load assets');
      console.error(err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSubmitting(true);
    try {
      await borrowAPI.createBorrowRequest({
        asset_id: selectedAsset._id,
        duration_days: borrowDays,
        reason: borrowReason,
      });
      alert('Borrow request submitted successfully!');
      setShowBorrowModal(false);
      setSelectedAsset(null);
      setBorrowReason('');
      setBorrowDays(7);
      await fetchAssets();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.message || 'Failed to submit borrow request');
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
    <div className="asset-container">
      <div className="container">
        <div className="page-header">
          <h1>Available Assets</h1>
          <p>Browse and request to borrow available assets</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="assets-grid">
          {assets.length > 0 ? (
            assets.map(asset => (
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
                  <p className="asset-location">Location: {asset.location || 'N/A'}</p>
                  
                  <div className="asset-status">
                    <span className={`badge badge-${asset.in_stock ? 'success' : 'warning'}`}>
                      {asset.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowBorrowModal(true);
                    }}
                    disabled={!asset.in_stock || asset.quantity === 0}
                  >
                    Request to Borrow
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No assets available at the moment</p>
            </div>
          )}
        </div>

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
                <p><strong>Location:</strong> {selectedAsset.location || 'N/A'}</p>

                <form onSubmit={handleBorrowSubmit}>
                  <div className="form-group">
                    <label htmlFor="borrowDays">Duration (days)</label>
                    <input
                      id="borrowDays"
                      type="number"
                      min="1"
                      max="30"
                      value={borrowDays}
                      onChange={(e) => setBorrowDays(parseInt(e.target.value) || 1)}
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
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowBorrowModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
