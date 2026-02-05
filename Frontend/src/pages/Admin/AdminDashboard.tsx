import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import { Users, UtensilsCrossed, Package, Settings, LogOut, Plus, Edit, Trash2 } from 'lucide-react';

interface User {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  created_at: string;
}

interface Restaurant {
  restaurant_id: string;
  name: string;
  country: string;
  price_range: string;
  status: string;
  owner_id?: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const user = state.user;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'restaurants' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    description: {},
    country: '',
    price_range: 'budget' as 'budget' | 'mid-range' | 'premium',
    categories: [] as string[],
    specialties: [] as string[],
    keywords: [] as string[],
    food_categories: [] as string[],
    logo_url: '',
    founded_year: '',
  });

  useEffect(() => {
    // ProtectedRoute handles auth, just load data
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const response = await apiService.getAllUsers();
        if (response.success && response.data) {
          setUsers(Array.isArray(response.data) ? response.data : []);
        }
      } else if (activeTab === 'restaurants') {
        const response = await apiService.getRestaurants();
        if (response.success && response.data) {
          setRestaurants(response.data.restaurants || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.setToken(null);
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiService.createRestaurant({
        name: restaurantForm.name,
        description: restaurantForm.description,
        country: restaurantForm.country,
        price_range: restaurantForm.price_range,
        categories: restaurantForm.categories,
        specialties: restaurantForm.specialties,
        keywords: restaurantForm.keywords,
        food_categories: restaurantForm.food_categories,
        logo_url: restaurantForm.logo_url || undefined,
        founded_year: restaurantForm.founded_year ? parseInt(restaurantForm.founded_year) : undefined,
      });
      if (response.success) {
        setShowCreateRestaurant(false);
        setRestaurantForm({
          name: '',
          description: {},
          country: '',
          price_range: 'budget',
          categories: [],
          specialties: [],
          keywords: [],
          food_categories: [],
          logo_url: '',
          founded_year: '',
        });
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;
    setLoading(true);
    try {
      await apiService.deleteRestaurant(restaurantId);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete restaurant');
    } finally {
      setLoading(false);
    }
  };

  // ProtectedRoute ensures user is admin, but check anyway
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
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
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'restaurants'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 inline mr-2" />
            Restaurants
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">All Users</h2>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.phone || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              u.role === 'restaurant_owner' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">All Restaurants</h2>
              <button
                onClick={() => setShowCreateRestaurant(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Restaurant
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.map((restaurant) => (
                  <div key={restaurant.restaurant_id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-2">{restaurant.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{restaurant.country}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        restaurant.status === 'active' ? 'bg-green-100 text-green-800' :
                        restaurant.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {restaurant.status}
                      </span>
                      <button
                        onClick={() => handleDeleteRestaurant(restaurant.restaurant_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Restaurant Modal */}
        {showCreateRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Create Restaurant</h2>
              <form onSubmit={handleCreateRestaurant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={restaurantForm.name}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={restaurantForm.country}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
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
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

