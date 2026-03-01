import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Phone, Check } from 'lucide-react';
import { apiService } from '../../../services/api';
import { geoapifyService } from '../../../services/geoapifyService';
import MapAddressSelector from '../../../components/Location/MapAddressSelector';

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

const EMPTY_FORM = { city: '', area: '', address: '', phone: '', lat: null as number | null, lng: null as number | null };

const LocationsTab: React.FC<LocationsTabProps> = ({ restaurantId }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    loadLocations();
  }, [restaurantId]);

  const loadLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getRestaurantLocations(restaurantId);
      if (response.success && response.data) {
        setLocations(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Map select ─────────────────────────────────────────── */
  const handleMapSelect = async (
    coords: { lat: number; lng: number },
    address?: string
  ) => {
    // Always call reverseGeocodeDetails for structured city/area/address
    try {
      const geo = await geoapifyService.reverseGeocodeDetails(coords.lat, coords.lng);
      if (geo) {
        const city = geo.city || geo.county || '';
        const area = geo.suburb || geo.district || geo.neighbourhood || '';
        setFormData(prev => ({
          ...prev,
          lat: coords.lat,
          lng: coords.lng,
          address: geo.formatted || address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
          city: city || prev.city,
          area: area || prev.area,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          lat: coords.lat,
          lng: coords.lng,
          address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        }));
      }
    } catch {
      setFormData(prev => ({
        ...prev,
        lat: coords.lat,
        lng: coords.lng,
        address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      }));
    }
    setMapOpen(false);
  };

  /* ─── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editingLocation) {
        alert('Update location — please delete and recreate for now.');
        return;
      }
      await apiService.addRestaurantLocation(restaurantId, {
        city: formData.city,
        area: formData.area,
        address: formData.address,
        phone: formData.phone || undefined,
        lat: formData.lat ?? undefined,
        lng: formData.lng ?? undefined,
      });
      setShowForm(false);
      setEditingLocation(undefined);
      setFormData(EMPTY_FORM);
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
      lat: location.lat ?? null,
      lng: location.lng ?? null,
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingLocation(undefined);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const handleDelete = async (_locationId: string) => {
    if (!confirm('Delete this location? This cannot be undone.')) return;
    try {
      alert('Delete location — please contact admin to remove locations for now.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete location');
    }
  };

  /* ─── Loading state ──────────────────────────────────────── */
  if (loading && locations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading locations...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
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
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-100">
          <h4 className="text-lg font-semibold mb-4">
            {editingLocation ? 'Edit Location' : 'Add New Location'}
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Select on Map button ── */}
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className={`w-full px-4 py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm transition-all ${formData.lat && formData.lng
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600'
                }`}
            >
              {formData.lat && formData.lng ? (
                <>
                  <Check className="w-4 h-4" />
                  {`📍 ${formData.lat.toFixed(5)}, ${formData.lng.toFixed(5)} — Change`}
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Select on Map (auto-fills address)
                </>
              )}
            </button>

            {/* City / Area */}
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

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Full street address..."
              />
            </div>

            {/* Phone */}
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

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingLocation(undefined);
                  setFormData(EMPTY_FORM);
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

      {/* Existing locations */}
      {locations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No locations added yet. Add your first branch location.</p>
          <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
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
                  {location.lat && location.lng && (
                    <p className="text-xs text-blue-500 mt-1">
                      📍 {Number(location.lat).toFixed(5)}, {Number(location.lng).toFixed(5)}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${location.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map modal */}
      <MapAddressSelector
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={handleMapSelect}
        initialCoords={
          formData.lat && formData.lng
            ? { lat: formData.lat, lng: formData.lng }
            : null
        }
        title="Select Branch Location"
      />
    </div>
  );
};

export default LocationsTab;
