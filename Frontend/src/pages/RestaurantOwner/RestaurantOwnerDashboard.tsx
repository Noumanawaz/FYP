import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import { geoapifyService } from '../../services/geoapifyService';
import { UtensilsCrossed, LogOut, Building2, Folder, MapPin, Eye } from 'lucide-react';
import RestaurantInfo from './components/RestaurantInfo';
import LocationsTab from './components/LocationsTab';
import CategoriesTab from './components/CategoriesTab';
import MenuItemsTab from './components/MenuItemsTab';
import MenuPreview from './components/MenuPreview';
import ImageUpload from '../../components/Common/ImageUpload';
import MapAddressSelector from '../../components/Location/MapAddressSelector';

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
  owner_id?: string;
}

type TabType = 'restaurant' | 'locations' | 'categories' | 'menu' | 'preview';

const RestaurantOwnerDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const user = state.user;
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('restaurant');
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    description: '',
    country: '',
    price_range: 'budget' as 'budget' | 'mid-range' | 'premium',
    categories: '',
    specialties: '',
    keywords: '',
    food_categories: '',
    logo_url: '',
    founded_year: '',
    // Location fields
    location: {
      city: '',
      area: '',
      address: '',
      phone: '',
      lat: null as number | null,
      lng: null as number | null,
    },
  });

  useEffect(() => {
    if (user && user.role === 'restaurant_owner') {
      loadRestaurant();
    } else if (!user) {
      setLoading(true);
    }
  }, [user]);

  const loadRestaurant = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getMyRestaurant();
      if (response.success && response.data) {
        setRestaurant(response.data as Restaurant);
      } else {
        setShowWelcomeBanner(true);
      }
    } catch (err: any) {
      if (err.message.includes('not found')) {
        setShowWelcomeBanner(true);
      } else {
        setError(err.message || 'Failed to load restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.setToken(null);
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };

  const handleMapSelect = async (coords: { lat: number; lng: number }, address?: string) => {
    try {
      // Reverse geocode to get address details
      const reverseGeocodeResult = await geoapifyService.reverseGeocode(coords.lat, coords.lng);
      let city = '';
      let area = '';
      let fullAddress = address || reverseGeocodeResult || '';

      if (reverseGeocodeResult) {
        // Parse address components from reverse geocode result
        const parts = reverseGeocodeResult.split(',');
        city = parts[parts.length - 1]?.trim() || '';
        area = parts[parts.length - 2]?.trim() || '';
        fullAddress = reverseGeocodeResult;
      }

      setRestaurantForm(prev => ({
        ...prev,
        location: {
          ...prev.location,
          lat: coords.lat,
          lng: coords.lng,
          city: prev.location.city || city,
          area: prev.location.area || area,
          address: prev.location.address || fullAddress,
        },
      }));
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Still set coordinates even if reverse geocoding fails
      setRestaurantForm(prev => ({
        ...prev,
        location: {
          ...prev.location,
          lat: coords.lat,
          lng: coords.lng,
          address: address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        },
      }));
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate location
    if (!restaurantForm.location.city || !restaurantForm.location.area || !restaurantForm.location.address) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // First, create the restaurant
      const response = await apiService.createRestaurant({
        name: restaurantForm.name,
        description: restaurantForm.description ? JSON.parse(restaurantForm.description) : {},
        country: restaurantForm.country,
        price_range: restaurantForm.price_range,
        categories: restaurantForm.categories.split(',').map(s => s.trim()).filter(s => s),
        specialties: restaurantForm.specialties.split(',').map(s => s.trim()).filter(s => s),
        keywords: restaurantForm.keywords.split(',').map(s => s.trim()).filter(s => s),
        food_categories: restaurantForm.food_categories.split(',').map(s => s.trim()).filter(s => s),
        logo_url: restaurantForm.logo_url || undefined,
        founded_year: restaurantForm.founded_year ? parseInt(restaurantForm.founded_year) : undefined,
      });

      if (response.success && response.data) {
        const restaurantData = response.data as Restaurant;
        const restaurantId = restaurantData.restaurant_id || (response.data as any).id;
        
        // Then, add the location
        if (restaurantId) {
          try {
            const locationResponse = await apiService.addRestaurantLocation(restaurantId, {
              city: restaurantForm.location.city,
              area: restaurantForm.location.area,
              address: restaurantForm.location.address,
              phone: restaurantForm.location.phone || undefined,
              lat: restaurantForm.location.lat || undefined,
              lng: restaurantForm.location.lng || undefined,
            } as any);
            
            if (!locationResponse.success) {
              console.warn('Location creation warning:', locationResponse.error);
            }
          } catch (locationError: any) {
            console.error('Failed to add location:', locationError);
            // Don't fail the whole operation if location fails - restaurant is already created
            setError('Restaurant created but location could not be added. You can add it later from the Locations tab.');
          }
        }

        // Update state and UI
        setRestaurant(restaurantData);
        setShowWelcomeBanner(false);
        setShowCreateRestaurant(false);
        setLoading(false);
      } else {
        // If response doesn't include data, fetch it
        setShowCreateRestaurant(false);
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadRestaurant();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
      setLoading(false);
    }
  };

  const handleUpdateRestaurant = async (data: any) => {
    if (!restaurant) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiService.updateRestaurant(restaurant.restaurant_id, data);
      if (response.success) {
        loadRestaurant();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'restaurant_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Access denied. This page is for restaurant owners only.</p>
        </div>
      </div>
    );
  }

  if (loading && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Restaurant Owner Portal</h1>
                <p className="text-sm text-gray-600">Welcome, {user.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {showWelcomeBanner && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm relative">
              <button
                onClick={() => setShowWelcomeBanner(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
                aria-label="Close"
              >
                ×
              </button>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <UtensilsCrossed className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Welcome to Your Restaurant Portal!</h3>
                  <p className="text-gray-600 mb-4">
                    Get started by setting up your restaurant. Add your restaurant details, locations, and manage everything from here.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowWelcomeBanner(false);
                        setShowCreateRestaurant(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      Setup Restaurant Now
                    </button>
                    <button
                      onClick={() => setShowWelcomeBanner(false)}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      I'll Do It Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {showCreateRestaurant ? (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Create Your Restaurant</h2>
              <form onSubmit={handleCreateRestaurant} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
                    <input
                      type="text"
                      required
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <input
                      type="text"
                      required
                      value={restaurantForm.country}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Range *</label>
                    <select
                      required
                      value={restaurantForm.price_range}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, price_range: e.target.value as any })}
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
                      value={restaurantForm.founded_year}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, founded_year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 2020"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    value={restaurantForm.categories}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, categories: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Italian, Pizza, Fast Food"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialties (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    value={restaurantForm.specialties}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, specialties: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Wood-fired Pizza, Pasta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    value={restaurantForm.keywords}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, keywords: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="pizza, italian, family-friendly"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Categories (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    value={restaurantForm.food_categories}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, food_categories: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Main Course, Appetizers, Desserts"
                  />
                </div>
                <div>
                  <ImageUpload
                    value={restaurantForm.logo_url}
                    onChange={(url) => setRestaurantForm({ ...restaurantForm, logo_url: typeof url === 'string' ? url : url[0] || '' })}
                    multiple={false}
                    label="Restaurant Logo"
                  />
                </div>

                {/* Location Section */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Location *</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Location on Map
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">
                          {restaurantForm.location.lat && restaurantForm.location.lng
                            ? `Location Selected: ${restaurantForm.location.lat.toFixed(6)}, ${restaurantForm.location.lng.toFixed(6)}`
                            : 'Click to Select Location on Map'}
                        </span>
                      </button>
                      {restaurantForm.location.lat && restaurantForm.location.lng && (
                        <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Location selected successfully
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={restaurantForm.location.city}
                          onChange={(e) => setRestaurantForm({
                            ...restaurantForm,
                            location: { ...restaurantForm.location, city: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Lahore"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area *</label>
                        <input
                          type="text"
                          required
                          value={restaurantForm.location.area}
                          onChange={(e) => setRestaurantForm({
                            ...restaurantForm,
                            location: { ...restaurantForm.location, area: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Gulberg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Address *</label>
                      <textarea
                        required
                        value={restaurantForm.location.address}
                        onChange={(e) => setRestaurantForm({
                          ...restaurantForm,
                          location: { ...restaurantForm.location, address: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Street address, building number, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={restaurantForm.location.phone}
                        onChange={(e) => setRestaurantForm({
                          ...restaurantForm,
                          location: { ...restaurantForm.location, phone: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="+92 300 1234567"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateRestaurant(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Restaurant'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Restaurant Portal</h2>
              <p className="text-gray-600 mb-6">
                Get started by setting up your restaurant. You can add your restaurant details, locations, and manage everything from here.
              </p>
              <button
                onClick={() => setShowCreateRestaurant(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <UtensilsCrossed className="w-5 h-5 inline-block mr-2" />
                Setup Your Restaurant
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'restaurant' as TabType, label: 'Restaurant Info', icon: Building2 },
    { id: 'locations' as TabType, label: 'Branches', icon: MapPin },
    { id: 'categories' as TabType, label: 'Categories', icon: Folder },
    { id: 'menu' as TabType, label: 'Menu Items', icon: UtensilsCrossed },
    { id: 'preview' as TabType, label: 'Menu Preview', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Restaurant Owner Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {user.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'restaurant' && restaurant && (
            <RestaurantInfo
              restaurant={restaurant}
              onUpdate={handleUpdateRestaurant}
              loading={loading}
            />
          )}

          {activeTab === 'locations' && restaurant && (
            <LocationsTab restaurantId={restaurant.restaurant_id} />
          )}

          {activeTab === 'categories' && restaurant && (
            <CategoriesTab restaurantId={restaurant.restaurant_id} />
          )}

          {activeTab === 'menu' && restaurant && (
            <MenuItemsTab restaurantId={restaurant.restaurant_id} />
          )}

          {activeTab === 'preview' && restaurant && (
            <MenuPreview restaurantId={restaurant.restaurant_id} />
          )}
        </div>
      </div>

      {/* Map Address Selector Modal */}
      <MapAddressSelector
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelect={handleMapSelect}
        initialCoords={restaurantForm.location.lat && restaurantForm.location.lng
          ? { lat: restaurantForm.location.lat, lng: restaurantForm.location.lng }
          : null}
        title="Select Restaurant Location"
      />
    </div>
  );
};

export default RestaurantOwnerDashboard;
