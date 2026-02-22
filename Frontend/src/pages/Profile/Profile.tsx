import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Edit, ArrowLeft, Calendar, Globe, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import Button from '../../components/Common/Button';
import MapAddressSelector from '../../components/Location/MapAddressSelector';
import { Address } from '../../types';

const Profile: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(state.user);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedMapCoords, setSelectedMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: "home" as "home" | "work" | "other",
    label: "",
    address: "",
    city: "",
  });

  useEffect(() => {
    // Don't redirect while we're still verifying authentication
    if (state.isVerifyingAuth) {
      return;
    }

    // Redirect to login if not authenticated (only after verification is complete)
    if (!state.isAuthenticated || !state.user) {
      navigate('/');
      return;
    }

    // Fetch latest user data
    const fetchUserData = async () => {
      if (state.user?.id) {
        setIsLoading(true);
        try {
          const response = await apiService.getUser(state.user.id);
          if (response.success && response.data) {
            setUserData({
              id: response.data.user_id,
              email: response.data.email || '',
              phone: response.data.phone || '',
              name: response.data.name,
              role: response.data.role as any,
              isVerified: true,
              addresses: [],
              paymentMethods: [],
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
  }, [state.user?.id, state.isAuthenticated, navigate]);

  const handleMapSelect = async (coords: { lat: number; lng: number }, address?: string) => {
    setSelectedMapCoords(coords);
    if (address) {
      const parts = address.split(',');
      setNewAddress(prev => ({
        ...prev,
        address: address,
        city: parts.length >= 2 ? parts[parts.length - 1].trim() : '',
      }));
    }
  };

  const handleAddAddress = () => {
    if (newAddress.label && (newAddress.address || selectedMapCoords)) {
      const address: Address = {
        id: Date.now().toString(),
        type: newAddress.type,
        label: newAddress.label,
        address: newAddress.address || `${selectedMapCoords?.lat.toFixed(6)}, ${selectedMapCoords?.lng.toFixed(6)}`,
        city: newAddress.city || "Unknown",
        coordinates: selectedMapCoords || { lat: 33.6844, lng: 73.0479 },
        isDefault: false,
      };

      // Update user addresses in context
      const updatedAddresses = [...(state.user?.addresses || []), address];
      dispatch({
        type: 'SET_USER',
        payload: {
          ...state.user!,
          addresses: updatedAddresses,
        },
      });

      // Reset form
      setIsAddingAddress(false);
      setNewAddress({ type: "home", label: "", address: "", city: "" });
      setSelectedMapCoords(null);
    }
  };

  // Show loading while verifying authentication
  if (state.isVerifyingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!state.isAuthenticated || !state.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{userData?.name}</h2>
                  <p className="text-sm text-gray-500 mb-4 capitalize">{userData?.role?.replace('_', ' ')}</p>
                  <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="text-base font-medium text-gray-900">{userData?.name}</p>
                    </div>
                  </div>

                  {userData?.email && (
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-base font-medium text-gray-900">{userData.email}</p>
                      </div>
                    </div>
                  )}

                  {userData?.phone && (
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="text-base font-medium text-gray-900">{userData.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Account Type</p>
                      <p className="text-base font-medium text-gray-900 capitalize">
                        {userData?.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Addresses */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Saved Addresses</h3>
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address
                  </button>
                </div>
                {!isAddingAddress ? (
                  <div className="space-y-3">
                    {state.user?.addresses && state.user.addresses.length > 0 ? (
                      state.user.addresses.map((address) => (
                        <div key={address.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{address.label}</p>
                                <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                                {address.city && (
                                  <p className="text-xs text-gray-500 mt-1">{address.city}</p>
                                )}
                              </div>
                            </div>
                            {address.isDefault && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No saved addresses</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Location on Map
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-700"
                      >
                        <MapPin className="w-5 h-5" />
                        {selectedMapCoords ? 'Change Location on Map' : 'Select Location on Map'}
                      </button>
                      {selectedMapCoords && (
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {selectedMapCoords.lat.toFixed(6)}, {selectedMapCoords.lng.toFixed(6)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(["home", "work", "other"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewAddress((prev) => ({ ...prev, type }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${newAddress.type === type
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Label (e.g., Home, Office)"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <input
                      type="text"
                      placeholder="Complete address"
                      value={newAddress.address}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <input
                      type="text"
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingAddress(false);
                          setSelectedMapCoords(null);
                          setNewAddress({ type: "home", label: "", address: "", city: "" });
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddAddress}
                        className="flex-1"
                        disabled={!newAddress.label || (!newAddress.address && !selectedMapCoords)}
                      >
                        Save Address
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Settings */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h3>
                <div className="space-y-4">
                  <Link to="/orders" className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-900">Order History</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Address Selector Modal */}
      <MapAddressSelector
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelect={handleMapSelect}
        initialCoords={selectedMapCoords}
        title="Select Location on Map"
      />
    </div>
  );
};

export default Profile;

