import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { exportAssetsPDF } from '../../utils/pdfReport';
import '../../styles/pages/Admin.css';

export default function AdminAssetsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    asset_type: 'Office Supplies',
    description: '',
    quantity: 1,
    location: '',
    serial_number: '',
    image: null,
    imagePreview: null
  });
  const [editingAssetId, setEditingAssetId] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }
    
    // Fetch assets from API
    fetchAssets();
  }, [user, navigate]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/assets', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.statusText}`);
      }

      const data = await response.json();
      setAssets(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets. Please try again.');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Office Supplies', 'Lab Equipments'];

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssetType = selectedAssetType === 'all' || asset.asset_type === selectedAssetType;
    
    return matchesSearch && matchesAssetType;
  });

  const handleAddAsset = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (editingAssetId) {
        // For updates: always send the current values so the backend can update reliably.
        const normalizedName = newAsset.name?.trim() || '';
        const normalizedAssetType = newAsset.asset_type?.trim() || '';
        const normalizedDescription = newAsset.description?.trim() || '';
        const normalizedLocation = newAsset.location?.trim() || '';
        const normalizedSerialNumber = newAsset.serial_number?.trim() || '';
        const normalizedQuantity = Number.isFinite(newAsset.quantity) ? newAsset.quantity : 0;

        if (normalizedName) formData.append('name', normalizedName);
        if (normalizedAssetType) formData.append('asset_type', normalizedAssetType);
        formData.append('description', normalizedDescription);
        formData.append('quantity', String(normalizedQuantity));
        formData.append('location', normalizedLocation);
        formData.append('serial_number', normalizedSerialNumber);
        if (newAsset.image) formData.append('image', newAsset.image);
      } else {
        // For creation: all fields are required
        formData.append('name', newAsset.name);
        formData.append('asset_type', newAsset.asset_type);
        formData.append('description', newAsset.description);
        formData.append('quantity', newAsset.quantity);
        formData.append('location', newAsset.location);
        formData.append('serial_number', newAsset.serial_number || '');
        if (newAsset.image) {
          formData.append('image', newAsset.image);
        }
      }

      const url = editingAssetId 
        ? `http://localhost:8000/api/assets/${editingAssetId}`
        : 'http://localhost:8000/api/assets';
      const method = editingAssetId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = `Failed to ${editingAssetId ? 'update' : 'create'} asset`;
        try {
          const errorData = await response.json();
          errorMessage = errorData?.detail || errorData?.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (${response.status})`);
      }

      const data = await response.json();
      
      if (editingAssetId) {
        setAssets(prevAssets =>
          prevAssets.map(a => a._id === editingAssetId ? data.data : a)
        );
        setEditingAssetId(null);
      } else {
        setAssets(prevAssets => [...prevAssets, data.data]);
      }

      setNewAsset({
        name: '',
        asset_type: 'Office Supplies',
        description: '',
        quantity: 1,
        location: '',
        serial_number: '',
        image: null,
        imagePreview: null
      });
      setShowForm(false);
      alert(`Asset ${editingAssetId ? 'updated' : 'created'} successfully!`);
    } catch (err) {
      console.error('Error saving asset:', err);
      alert(`Failed to ${editingAssetId ? 'update' : 'create'} asset. Please try again.`);
    }
  };

  const handleToggleAvailability = async (assetId) => {
    try {
      const asset = assets.find(a => a._id === assetId);
      if (!asset) return;

      const token = localStorage.getItem('token');
      const formData = new FormData();
      const newQuantity = asset.quantity > 0 ? 0 : 1;
      formData.append('quantity', String(newQuantity));

      const response = await fetch(`http://localhost:8000/api/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update asset';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.detail || errorData?.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (${response.status})`);
      }

      const data = await response.json();
      setAssets(prevAssets =>
        prevAssets.map(a => a._id === assetId ? data.data : a)
      );
    } catch (err) {
      console.error('Error updating asset:', err);
      alert('Failed to update asset. Please try again.');
    }
  };

  const handleUpdateQuantity = async (assetId, newQuantity) => {
    try {
      if (newQuantity < 0) return; // Prevent negative quantity

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('quantity', String(newQuantity));

      const response = await fetch(`http://localhost:8000/api/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update asset';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.detail || errorData?.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (${response.status})`);
      }

      const data = await response.json();
      setAssets(prevAssets =>
        prevAssets.map(a => a._id === assetId ? data.data : a)
      );
    } catch (err) {
      console.error('Error updating asset quantity:', err);
      alert('Failed to update asset. Please try again.');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete asset';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.detail || errorData?.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (${response.status})`);
      }

      setAssets(prevAssets => prevAssets.filter(asset => asset._id !== assetId));
      alert('Asset deleted successfully!');
    } catch (err) {
      console.error('Error deleting asset:', err);
      alert('Failed to delete asset. Please try again.');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAsset({
          ...newAsset,
          image: file,
          imagePreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditAsset = (asset) => {
    setNewAsset({
      name: asset.name,
      asset_type: asset.asset_type,
      description: asset.description,
      quantity: asset.quantity,
      location: asset.location,
      serial_number: asset.serial_number || '',
      image: null,
      imagePreview: asset.image_url || null
    });
    setEditingAssetId(asset._id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setNewAsset({
      name: '',
      asset_type: 'Office Supplies',
      description: '',
      quantity: 1,
      location: '',
      serial_number: '',
      image: null,
      imagePreview: null
    });
  };

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Assets Management</h1>
              <p>Manage all items available for borrowing</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportAssetsPDF(assets)}
              disabled={loading || assets.length === 0}
            >
              ⬇ Export PDF
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="filter-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by asset name..."
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
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add New Asset'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading assets...</p>
          </div>
        ) : (
          <>
            {/* Add Asset Form */}
            {showForm && (
              <div className="asset-form-card">
                <h2>{editingAssetId ? 'Edit Asset' : 'Add New Asset'}</h2>
                <form onSubmit={handleAddAsset}>
                  <div className="form-group">
                    <label>Asset Name:</label>
                    <input
                      type="text"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                      required
                      placeholder="Enter asset name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset Type:</label>
                    <select 
                      value={newAsset.asset_type}
                      onChange={(e) => setNewAsset({...newAsset, asset_type: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      value={newAsset.description}
                      onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                      placeholder="Enter asset description"
                    />
                  </div>

                  <div className="form-group">
                    <label>Quantity:</label>
                    <input
                      type="number"
                      value={newAsset.quantity}
                      onChange={(e) => setNewAsset({...newAsset, quantity: parseInt(e.target.value) || 0})}
                      placeholder="Enter quantity"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Serial Number:</label>
                    <input
                      type="text"
                      value={newAsset.serial_number}
                      onChange={(e) => setNewAsset({...newAsset, serial_number: e.target.value})}
                      placeholder="Enter serial number (optional)"
                    />
                  </div>

                  <div className="form-group">
                    <label>Location:</label>
                    <input
                      type="text"
                      value={newAsset.location}
                      onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
                      placeholder="Enter asset location"
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset Image:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      placeholder="Upload asset image"
                    />
                    {newAsset.imagePreview && (
                      <div className="image-preview">
                        <img src={newAsset.imagePreview} alt="Preview" />
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-success">
                      {editingAssetId ? 'Update Asset' : 'Add Asset'}
                    </button>
                    {editingAssetId && (
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={handleCancelEdit}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Assets Grid */}
            {filteredAssets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h2>No Assets Found</h2>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className="assets-grid">
                {filteredAssets.map(asset => (
                  <div key={asset._id} className="asset-card">
                    {/* Image Section */}
                    <div className="asset-image">
                      {asset.image_url ? (
                        <img src={asset.image_url} alt={asset.name} />
                      ) : (
                        <div className="placeholder">📦</div>
                      )}
                    </div>

                    <div className="asset-header">
                      <h3>{asset.name}</h3>
                      <span className={`badge ${asset.in_stock ? 'badge-success' : 'badge-warning'}`}>
                        {asset.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                      </span>
                    </div>

                    <div className="asset-details">
                      <p><strong>Type:</strong> {asset.asset_type}</p>
                      {asset.description && <p><strong>Description:</strong> {asset.description}</p>}
                      <div className="quantity-control">
                        <strong>Quantity:</strong>
                        <button 
                          className="qty-btn qty-decrease"
                          onClick={() => handleUpdateQuantity(asset._id, asset.quantity - 1)}
                          disabled={asset.quantity === 0}
                        >
                          −
                        </button>
                        <span className="qty-display">{asset.quantity}</span>
                        <button 
                          className="qty-btn qty-increase"
                          onClick={() => handleUpdateQuantity(asset._id, asset.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <p><strong>Location:</strong> {asset.location || 'N/A'}</p>
                    </div>

                    <div className="asset-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditAsset(asset)}
                      >
                        Edit
                      </button>
                      <button
                        className={`btn-toggle ${asset.in_stock ? 'btn-available' : 'btn-unavailable'}`}
                        onClick={() => handleToggleAvailability(asset._id)}
                      >
                        {asset.in_stock ? 'Mark Out of Stock' : 'Mark In Stock'}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteAsset(asset._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="assets-summary">
              <p>Total Assets: <strong>{assets.length}</strong></p>
              <p>In Stock: <strong>{assets.filter(a => a.in_stock).length}</strong></p>
              <p>Out of Stock: <strong>{assets.filter(a => !a.in_stock).length}</strong></p>
              <p>Total Quantity: <strong>{assets.reduce((sum, a) => sum + (a.quantity || 0), 0)}</strong></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
