import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Phone } from 'lucide-react';
import { apiService } from '../../../services/api';

interface Location {
  location_id: string;
  restaurant_id: string;
  city: string;
  area: string;
  address: string;
  lat?: number;
  lng?: number;
  phone?: string;
  status: string;
}

interface LocationsTabProps {
  restaurantId: string;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ restaurantId }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>();
  const [formData, setFormData] = useState({
    city: '',
    area: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    loadLocations();
  }, [restaurantId]);

  const loadLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getRestaurantLocations(restaurantId);
      if (response.success && response.data) {
        const locs = Array.isArray(response.data) ? response.data : [];
        setLocations(locs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editingLocation) {
        // For now, we'll just show an alert - update location endpoint may need to be added
        alert('Update location feature coming soon. Please delete and recreate the location.');
        return;
      } else {
        await apiService.addRestaurantLocation(restaurantId, {
          city: formData.city,
          area: formData.area,
          address: formData.address,
          phone: formData.phone || undefined,
        });
      }
      setShowForm(false);
      setEditingLocation(undefined);
      setFormData({ city: '', area: '', address: '', phone: '' });
      loadLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      city: location.city,
      area: location.area,
      address: location.address,
      phone: location.phone || '',
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingLocation(undefined);
    setFormData({ city: '', area: '', address: '', phone: '' });
    setShowForm(true);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }
    try {
      // Delete location endpoint may need to be added to API
      alert('Delete location feature coming soon. Please contact admin to remove locations.');
      // await apiService.deleteRestaurantLocation(restaurantId, locationId);
      // loadLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete location');
    }
  };

  if (loading && locations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading locations...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Branches & Locations</h3>
          <p className="text-sm text-gray-600 mt-1">Manage your restaurant branches and locations</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h4 className="text-lg font-semibold mb-4">{editingLocation ? 'Edit Location' : 'Add New Location'}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Karachi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area *</label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Clifton"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Full street address..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +92 300 1234567"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingLocation(undefined);
                  setFormData({ city: '', area: '', address: '', phone: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingLocation ? 'Update' : 'Add Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No locations added yet. Add your first branch location.</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((location) => (
            <div key={location.location_id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{location.city}, {location.area}</h4>
                  <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  location.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {location.status}
                </span>
              </div>
              {location.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Phone className="w-4 h-4" />
                  {location.phone}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(location)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(location.location_id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationsTab;

