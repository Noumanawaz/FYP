import React, { useState, useEffect } from "react";
import { MapPin, Search, Navigation, X, Plus } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { Address } from "../../types";
import Button from "../Common/Button";
import LoadingSpinner from "../Common/LoadingSpinner";
import { geoapifyService } from "../../services/geoapifyService";
import { apiService } from "../../services/api";
import MapAddressSelector from "./MapAddressSelector";

interface LocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { coordinates, isLoading, error, getCurrentLocation } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedMapCoords, setSelectedMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showCurrentLocationForm, setShowCurrentLocationForm] = useState(false);
  const [currentLocationCoords, setCurrentLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newAddress, setNewAddress] = useState({
    type: "home" as "home" | "work" | "other",
    label: "",
    address: "",
    street: "",
    area: "",
    city: "",
  });

  const handleSelectAddress = (address: Address) => {
    dispatch({ type: "SET_ADDRESS", payload: address });
    onClose();
  };

  const [isAutoSelectingLocation, setIsAutoSelectingLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    setIsAutoSelectingLocation(true);
    if (!coordinates) {
      getCurrentLocation();
    }
  };

  // Effect to handle auto-selection when coordinates become available
  useEffect(() => {
    const autoSelectLocation = async () => {
      if (isAutoSelectingLocation && coordinates) {
        try {
          // Default address structure
          let addressText = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
          let city = "Unknown";
          
          // Try to reverse geocode
          try {
            const result = await geoapifyService.reverseGeocode(coordinates.lat, coordinates.lng);
            if (result) {
              addressText = result;
              const parts = result.split(',');
              city = parts[parts.length - 1]?.trim() || city;
            }
          } catch (error) {
            console.error("Reverse geocoding failed:", error);
          }

          const address: Address = {
            id: `curr-${Date.now()}`,
            type: "other",
            label: "Current Location",
            address: addressText,
            city: city,
            coordinates: coordinates,
            isDefault: false,
          };

          handleSelectAddress(address);
          // Also update map coordinates if needed, but mainly we just select the address
        } catch (error) {
          console.error("Error auto-selecting location:", error);
        } finally {
          setIsAutoSelectingLocation(false);
        }
      }
    };

    autoSelectLocation();
  }, [coordinates, isAutoSelectingLocation]);

  const handleSaveCurrentLocation = async () => {
    if (!currentLocationCoords || !newAddress.street || !newAddress.area) {
      return;
    }

    // Create address object
    const fullAddress = `${newAddress.street}, ${newAddress.area}${newAddress.city ? `, ${newAddress.city}` : ''}`;
    const address: Address = {
      id: Date.now().toString(),
      type: newAddress.type,
      label: newAddress.label || "Current Location",
      address: fullAddress,
      city: newAddress.city || "Unknown",
      coordinates: currentLocationCoords,
      isDefault: false,
    };

    // Save to backend if user is authenticated
    if (state.user?.id) {
      try {
        const existingAddresses = (state.user as any).addresses || [];
        const updatedAddresses = [...existingAddresses, {
          id: address.id,
          type: address.type,
          label: address.label,
          street: newAddress.street,
          area: newAddress.area,
          city: address.city,
          address: fullAddress,
          lat: currentLocationCoords.lat,
          lng: currentLocationCoords.lng,
          is_default: address.isDefault,
        }];

        await apiService.updateUser(state.user.id, {
          addresses: updatedAddresses,
        });

        // Reload user data to get updated addresses
        const userResponse = await apiService.getUser(state.user.id);
        if (userResponse.success && userResponse.data) {
          // Convert backend addresses to frontend format
          const backendAddresses = (userResponse.data.addresses || []).map((addr: any, idx: number) => ({
            id: addr.id || `addr-${idx}`,
            type: addr.type || 'home',
            label: addr.label || addr.street || 'Address',
            address: addr.address || `${addr.street || ''}, ${addr.area || ''}, ${addr.city || ''}`,
            city: addr.city || '',
            coordinates: {
              lat: addr.lat || 0,
              lng: addr.lng || 0,
            },
            isDefault: addr.is_default || false,
          }));

          dispatch({
            type: 'SET_USER',
            payload: {
              ...state.user,
              addresses: backendAddresses,
            },
          });
        }
      } catch (error) {
        console.error("Failed to save address:", error);
        // Still set the address locally even if save fails
      }
    }

    dispatch({ type: "SET_ADDRESS", payload: address });
    dispatch({ type: "SET_LOCATION", payload: currentLocationCoords });
    
    // Reset form
    setShowCurrentLocationForm(false);
    setCurrentLocationCoords(null);
    setNewAddress({ type: "home", label: "", address: "", street: "", area: "", city: "" });
    onClose();
  };

  const handleMapSelect = async (coords: { lat: number; lng: number }, address?: string) => {
    setSelectedMapCoords(coords);
    // Try to reverse geocode to get address
    try {
      const reverseGeocodeResult = await geoapifyService.reverseGeocode(coords.lat, coords.lng);
      if (reverseGeocodeResult) {
        setNewAddress(prev => ({
          ...prev,
          address: reverseGeocodeResult,
          city: reverseGeocodeResult.split(',')[reverseGeocodeResult.split(',').length - 1]?.trim() || '',
        }));
      } else if (address) {
        setNewAddress(prev => ({
          ...prev,
          address: address,
        }));
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      if (address) {
        setNewAddress(prev => ({
          ...prev,
          address: address,
        }));
      }
    }
  };

  const handleAddNewAddress = async () => {
    if (newAddress.label && (newAddress.address || selectedMapCoords)) {
      const coords = selectedMapCoords || coordinates || { lat: 33.6844, lng: 73.0479 };
      const fullAddress = newAddress.address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      
      const address: Address = {
        id: Date.now().toString(),
        type: newAddress.type,
        label: newAddress.label,
        address: fullAddress,
        city: newAddress.city || "Unknown",
        coordinates: coords,
        isDefault: false,
      };

      // Save to backend if user is authenticated
      if (state.user?.id) {
        try {
          const existingAddresses = (state.user as any).addresses || [];
          const updatedAddresses = [...existingAddresses, {
            id: address.id,
            type: address.type,
            label: address.label,
            street: newAddress.street || '',
            area: newAddress.area || '',
            city: address.city,
            address: fullAddress,
            lat: coords.lat,
            lng: coords.lng,
            is_default: address.isDefault,
          }];

          await apiService.updateUser(state.user.id, {
            addresses: updatedAddresses,
          });

          // Reload user data to get updated addresses
          const userResponse = await apiService.getUser(state.user.id);
          if (userResponse.success && userResponse.data) {
            // Convert backend addresses to frontend format
            const backendAddresses = (userResponse.data.addresses || []).map((addr: any, idx: number) => ({
              id: addr.id || `addr-${idx}`,
              type: addr.type || 'home',
              label: addr.label || addr.street || 'Address',
              address: addr.address || `${addr.street || ''}, ${addr.area || ''}, ${addr.city || ''}`,
              city: addr.city || '',
              coordinates: {
                lat: addr.lat || 0,
                lng: addr.lng || 0,
              },
              isDefault: addr.is_default || false,
            }));

            dispatch({
              type: 'SET_USER',
              payload: {
                ...state.user,
                addresses: backendAddresses,
              },
            });
          }
        } catch (error) {
          console.error("Failed to save address:", error);
          // Still set the address locally even if save fails
        }
      }

      handleSelectAddress(address);
      setIsAddingNew(false);
      setNewAddress({ type: "home", label: "", address: "", street: "", area: "", city: "" });
      setSelectedMapCoords(null);
    }
  };

  // Handle autocomplete selection
  const handleSelectAutocomplete = async (result: any) => {
    const address: Address = {
      id: Date.now().toString(),
      type: "other",
      label: result.formatted,
      address: result.formatted,
      city: result.city || "",
      coordinates: { lat: result.lat, lng: result.lng },
      isDefault: false,
    };
    handleSelectAddress(address);
    setSearchQuery("");
    setAutocompleteResults([]);
  };

  // Debounced autocomplete search
  useEffect(() => {
    if (searchQuery.length > 2) {
      const timeoutId = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await geoapifyService.autocomplete(searchQuery, 5);
          setAutocompleteResults(results);
        } catch (error) {
          console.error("Autocomplete error:", error);
          setAutocompleteResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setAutocompleteResults([]);
    }
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Select Location</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search with Autocomplete */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <input type="text" placeholder="Search for area, street name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {/* Autocomplete Results */}
            {autocompleteResults.length > 0 && searchQuery.length > 2 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {autocompleteResults.map((result, index) => (
                  <button key={index} onClick={() => handleSelectAutocomplete(result)} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{result.formatted}</div>
                        {result.city && <div className="text-sm text-gray-500">{result.city}</div>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Location */}
          {!showCurrentLocationForm ? (
            <button onClick={handleUseCurrentLocation} disabled={isLoading} className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">{isLoading ? <LoadingSpinner size="sm" /> : <Navigation className="w-5 h-5 text-primary-600" />}</div>
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">Use current location</div>
                <div className="text-sm text-gray-500">{error ? error : "Get precise delivery location"}</div>
              </div>
            </button>
          ) : (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Add Address Details</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["home", "work", "other"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewAddress((prev) => ({ ...prev, type }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${
                        newAddress.type === type
                          ? "bg-primary-500 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Street / House Number *"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Area / Sector *"
                  value={newAddress.area}
                  onChange={(e) => setNewAddress((prev) => ({ ...prev, area: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="City"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />

                {currentLocationCoords && (
                  <p className="text-xs text-gray-500">
                    Location: {currentLocationCoords.lat.toFixed(6)}, {currentLocationCoords.lng.toFixed(6)}
                  </p>
                )}

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCurrentLocationForm(false);
                      setCurrentLocationCoords(null);
                      setNewAddress({ type: "home", label: "", address: "", street: "", area: "", city: "" });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCurrentLocation}
                    className="flex-1"
                    disabled={!newAddress.street || !newAddress.area}
                  >
                    Save Address
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Addresses */}
          <div className="space-y-3 mb-6">
            <h4 className="font-medium text-gray-900">Saved Addresses</h4>
            {(state.user as any)?.addresses?.map((address: Address) => (
              <button key={address.id} onClick={() => handleSelectAddress(address)} className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{address.label}</div>
                  <div className="text-sm text-gray-500">{address.address}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Add New Address */}
          {!isAddingNew ? (
            <button onClick={() => setIsAddingNew(true)} className="w-full flex items-center space-x-3 p-4 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">Add new address</div>
                <div className="text-sm text-gray-500">Save a new delivery location</div>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Add New Address</h4>

              <div className="grid grid-cols-3 gap-2">
                {(["home", "work", "other"] as const).map((type) => (
                  <button key={type} onClick={() => setNewAddress((prev) => ({ ...prev, type }))} className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${newAddress.type === type ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Location on Map
                </label>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 text-gray-700"
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

              <input type="text" placeholder="Label (e.g., Home, Office)" value={newAddress.label} onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />

              <input type="text" placeholder="Street / House Number *" value={newAddress.street} onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />

              <input type="text" placeholder="Area / Sector *" value={newAddress.area} onChange={(e) => setNewAddress((prev) => ({ ...prev, area: e.target.value }))} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />

              <input type="text" placeholder="Complete address (optional)" value={newAddress.address} onChange={(e) => setNewAddress((prev) => ({ ...prev, address: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />

              <input type="text" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => {
                  setIsAddingNew(false);
                  setSelectedMapCoords(null);
                  setNewAddress({ type: "home", label: "", address: "", street: "", area: "", city: "" });
                }} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddNewAddress} className="flex-1" disabled={!newAddress.label || (!newAddress.street && !newAddress.area && !newAddress.address && !selectedMapCoords)}>
                  Save Address
                </Button>
              </div>
            </div>
          )}
        </div>
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

export default LocationSelector;
