import React, { useState, useEffect } from 'react';
import { Edit, Save, X, MapPin, Phone, Clock, Building2, Globe } from 'lucide-react';
import ImageUpload from '../../../components/Common/ImageUpload';
import { apiService } from '../../../services/api';

interface Restaurant {
  restaurant_id: string;
  name: string;
  description: Record<string, any>;
  founded_year?: number;
  country: string;
  price_range: string;
  categories: string[];
  specialties: string[];
  keywords: string[];
  food_categories: string[];
  logo_url?: string;
  status: string;
}

interface Location {
  location_id: string;
  restaurant_id: string;
  city: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  operating_hours: Record<string, any>;
  delivery_zones: Record<string, any>;
  status: "open" | "closed" | "temporarily_closed";
  created_at: string;
  updated_at: string;
}

interface RestaurantInfoProps {
  restaurant: Restaurant;
  onUpdate: (data: any) => Promise<void>;
  loading?: boolean;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant, onUpdate, loading = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [formData, setFormData] = useState({
    name: restaurant.name,
    country: restaurant.country,
    price_range: restaurant.price_range as 'budget' | 'mid-range' | 'premium',
    categories: restaurant.categories.join(', '),
    specialties: restaurant.specialties.join(', '),
    keywords: restaurant.keywords.join(', '),
    food_categories: restaurant.food_categories.join(', '),
    logo_url: restaurant.logo_url || '',
    founded_year: restaurant.founded_year?.toString() || '',
  });

  useEffect(() => {
    loadLocations();
  }, [restaurant.restaurant_id]);

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await apiService.getRestaurantLocations(restaurant.restaurant_id);
      if (response.success && response.data) {
        setLocations(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      name: formData.name,
      country: formData.country,
      price_range: formData.price_range,
      categories: formData.categories.split(',').map(s => s.trim()).filter(s => s),
      specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
      keywords: formData.keywords.split(',').map(s => s.trim()).filter(s => s),
      food_categories: formData.food_categories.split(',').map(s => s.trim()).filter(s => s),
      logo_url: formData.logo_url || undefined,
      founded_year: formData.founded_year ? parseInt(formData.founded_year) : undefined,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Edit Restaurant</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range *</label>
              <select
                required
                value={formData.price_range}
                onChange={(e) => setFormData({ ...formData, price_range: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="budget">Budget</option>
                <option value="mid-range">Mid-Range</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
              <input
                type="number"
                value={formData.founded_year}
                onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2020"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUpload
                value={formData.logo_url}
                onChange={(url) => setFormData({ ...formData, logo_url: typeof url === 'string' ? url : url[0] || '' })}
                multiple={false}
                label="Restaurant Logo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categories (comma-separated) *</label>
            <input
              type="text"
              required
              value={formData.categories}
              onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Italian, Pizza, Fast Food"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialties (comma-separated) *</label>
            <input
              type="text"
              required
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Wood-fired Pizza, Pasta"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated) *</label>
            <input
              type="text"
              required
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="pizza, italian, family-friendly"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Categories (comma-separated) *</label>
            <input
              type="text"
              required
              value={formData.food_categories}
              onChange={(e) => setFormData({ ...formData, food_categories: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Main Course, Appetizers, Desserts"
            />
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restaurant Header with Image */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="relative h-64 bg-gradient-to-r from-blue-500 to-indigo-600">
          {restaurant.logo_url ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-24 h-24 text-white opacity-50" />
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{restaurant.name}</h2>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Globe className="w-4 h-4" />
                <span>{restaurant.country}</span>
              </div>
              {restaurant.founded_year && (
                <p className="text-sm text-gray-500">Established {restaurant.founded_year}</p>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs text-gray-600 block mb-1">Price Range</span>
              <span className="font-semibold capitalize">{restaurant.price_range}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs text-gray-600 block mb-1">Status</span>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                restaurant.status === 'active' ? 'bg-green-100 text-green-800' : 
                restaurant.status === 'inactive' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {restaurant.status}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs text-gray-600 block mb-1">Locations</span>
              <span className="font-semibold">{locations.length}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-xs text-gray-600 block mb-1">Categories</span>
              <span className="font-semibold">{restaurant.categories.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Restaurant Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {restaurant.categories.map((cat, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Specialties</h4>
            <div className="flex flex-wrap gap-2">
              {restaurant.specialties.map((spec, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  {spec}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {restaurant.keywords.map((keyword, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Food Categories</h4>
            <div className="flex flex-wrap gap-2">
              {restaurant.food_categories.map((cat, idx) => (
                <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Locations Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Restaurant Locations</h3>
          <span className="text-sm text-gray-500">{locations.length} location{locations.length !== 1 ? 's' : ''}</span>
        </div>
        
        {loadingLocations ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No locations added yet</p>
            <p className="text-sm text-gray-500">Go to the "Branches" tab to add your first location</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div key={location.location_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-lg">{location.area}, {location.city}</h4>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                        location.status === 'open' ? 'bg-green-100 text-green-800' : 
                        location.status === 'closed' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {location.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2 ml-7">{location.address}</p>
                    {location.phone && (
                      <div className="flex items-center gap-2 text-gray-600 ml-7 mb-2">
                        <Phone className="w-4 h-4" />
                        <span>{location.phone}</span>
                      </div>
                    )}
                    {location.lat && location.lng && (
                      <div className="text-xs text-gray-500 ml-7">
                        Coordinates: {Number(location.lat).toFixed(6)}, {Number(location.lng).toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantInfo;

