import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Phone, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/api';
import { geoapifyService } from '../../../services/geoapifyService';
import MapAddressSelector from '../../../components/Location/MapAddressSelector';
import Modal from '../../../components/Common/Modal';

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
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [mapOpen, setMapOpen] = useState(false);

  const hasLoaded = React.useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
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

  const handleMapSelect = async (coords: { lat: number; lng: number }, address?: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiService.addRestaurantLocation(restaurantId, {
        city: formData.city,
        area: formData.area,
        address: formData.address,
        phone: formData.phone || undefined,
        lat: formData.lat ?? undefined,
        lng: formData.lng ?? undefined,
      });
      setShowForm(false);
      setFormData(EMPTY_FORM);
      loadLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (_locationId: string) => {
    if (!confirm('This action will archive the location. Proceed?')) return;
    alert('Contact administrator for branch decommissioning.');
  };

  const inputClasses = "w-full px-5 py-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm active:scale-[0.99] focus:bg-white dark:focus:bg-[#1A1A1A]";
  const labelClasses = "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block";

  if (loading && locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Loading Branches...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      {/* Tab Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-[#161616] p-8 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-sm transition-all">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Branch Network</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scale your operations and manage regional presence</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="group flex items-center gap-2.5 px-8 py-3 bg-cyan-500 text-white rounded-full font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-105 hover:bg-cyan-400 shadow-xl shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          Add Branch
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold tracking-widest uppercase">
          {error}
        </div>
      )}

      {/* Grid Layout for Locations */}
      {locations.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#161616] border border-dashed border-gray-200 dark:border-white/10 rounded-[2.5rem] transition-all">
          <div className="p-6 rounded-full bg-gray-50 dark:bg-white/5 mb-6">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">No Active Units Established</h4>
          <p className="text-gray-400 text-center max-w-sm px-6 mb-8">Begin your expansion by geolocating your first restaurant branch on the platform hub.</p>
          <button onClick={() => setShowForm(true)} className="px-10 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-[10px] tracking-[0.25em] uppercase hover:scale-105 transition-all">
            Establish First Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12 transition-all">
          {locations.map((location) => (
            <div key={location.location_id} className="group relative bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 transition-colors group-hover:bg-cyan-500 group-hover:text-white">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-xl text-gray-900 dark:text-white tracking-tight">{location.area}</h4>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-0.5">{location.city} Node</p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border ${
                  location.status === 'open' 
                    ? 'bg-green-500/5 text-green-600 border-green-500/20' 
                    : 'bg-red-500/5 text-red-600 border-red-500/20'
                }`}>
                  {location.status}
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed truncate-2-lines h-10">
                  {location.address}
                </p>
                {location.phone && (
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <Phone className="w-3.5 h-3.5 text-cyan-500" />
                    {location.phone}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 rounded-2xl font-bold text-[10px] tracking-widest uppercase cursor-default border border-transparent shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Unit Operational
                </button>
                <button
                  onClick={() => handleDelete(location.location_id)}
                  className="p-3 bg-gray-50 dark:bg-white/[0.03] text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-gray-200 dark:border-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Establishment Modal System */}
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title="Establish Unit"
        footer={(
          <div className="flex gap-4">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[1.5] py-4 bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sync Location Node'}
            </button>
          </div>
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className={`group w-full p-10 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
              formData.lat && formData.lng
                ? 'border-green-500 bg-green-500/5 text-green-600'
                : 'border-gray-200 dark:border-white/10 text-gray-400 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02]'
            }`}
          >
            <div className={`p-4 rounded-full transition-colors ${formData.lat && formData.lng ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-white/5 group-hover:bg-cyan-500/10'}`}>
              <MapPin className={`w-8 h-8 ${formData.lat && formData.lng ? 'text-green-500' : 'group-hover:text-cyan-500'}`} />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] block mb-1">Geospatial Selector</span>
              <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest block">
                {formData.lat && formData.lng ? `LAT: ${formData.lat.toFixed(4)} LNG: ${formData.lng.toFixed(4)}` : 'Initialize GPS Handshake'}
              </span>
            </div>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelClasses}>City Hub</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={inputClasses}
                placeholder="e.g. London"
              />
            </div>
            <div className="space-y-2">
              <label className={labelClasses}>Operational Area</label>
              <input
                type="text"
                required
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className={inputClasses}
                placeholder="e.g. Mayfair"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClasses}>Physical Address</label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className={`${inputClasses} resize-none`}
              placeholder="Full street credentials..."
            />
          </div>
        </form>
      </Modal>

      {/* Map Address Selector Integration */}
      <MapAddressSelector
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={handleMapSelect}
        initialCoords={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : null}
        title="Geospatial Node Selector"
      />
    </div>
  );
};

export default LocationsTab;
