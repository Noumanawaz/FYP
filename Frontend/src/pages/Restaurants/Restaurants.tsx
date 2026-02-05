import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, Star, Clock, Truck, MapPin, Grid, List, X, Navigation, AlertCircle } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchRestaurants, fetchNearbyRestaurants } from "../../store/slices/restaurantsSlice";
import { Restaurant, RestaurantFilter } from "../../types";
import { calculateDistance } from "../../utils/distance";
import Button from "../../components/Common/Button";
import LoadingSpinner from "../../components/Common/LoadingSpinner";

const Restaurants: React.FC = () => {
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const { restaurants: reduxRestaurants, nearbyRestaurants, loading, error } = useAppSelector((state) => state.restaurants);
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<RestaurantFilter>({
    cuisine: [],
    rating: undefined,
    deliveryTime: undefined,
    priceRange: undefined,
    isVegetarian: false,
    isOpen: true,
    sortBy: "distance",
  });

  const cuisines = ["American", "Indian", "Italian", "Chinese", "Fast Food", "Vegetarian", "Desserts", "Mexican", "Healthy"];
  const priceRanges = [
    { value: "low", label: "Under ₹200", min: 0, max: 199 },
    { value: "medium", label: "₹200 - ₹500", min: 200, max: 500 },
    { value: "high", label: "Above ₹500", min: 501, max: Infinity },
  ];

  // Memoize user location to prevent unnecessary re-renders
  const userLocation = useMemo(() => {
    return state.currentLocation || state.selectedAddress?.coordinates || { lat: 33.6844, lng: 73.0479 };
  }, [state.currentLocation?.lat, state.currentLocation?.lng, state.selectedAddress?.coordinates?.lat, state.selectedAddress?.coordinates?.lng]);

  // Track last fetched location to prevent duplicate calls
  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);
  const isInitialMount = useRef(true);

  // Fetch restaurants on mount and when location changes
  useEffect(() => {
    // Skip if already loading
    if (loading) return;

    const currentLat = userLocation.lat;
    const currentLng = userLocation.lng;

    // Check if location has actually changed
    const locationChanged = 
      !lastFetchedLocation.current ||
      lastFetchedLocation.current.lat !== currentLat ||
      lastFetchedLocation.current.lng !== currentLng;

    // Only fetch if location changed or on initial mount
    if (!isInitialMount.current && !locationChanged) {
      return;
    }

    console.log("🔍 Fetching restaurants...", { lat: currentLat, lng: currentLng });
    
    if (currentLat && currentLng) {
      // Fetch nearby restaurants if location is available
      console.log("📍 Fetching nearby restaurants with lat:", currentLat, "lng:", currentLng);
      dispatch(fetchNearbyRestaurants({ lat: currentLat, lng: currentLng, radius: 15 }));
      lastFetchedLocation.current = { lat: currentLat, lng: currentLng };
    } else {
      // Otherwise fetch all restaurants
      console.log("🌐 No location available, fetching all restaurants");
      dispatch(fetchRestaurants());
      lastFetchedLocation.current = null;
    }

    isInitialMount.current = false;
  }, [dispatch, userLocation.lat, userLocation.lng, loading]); // Re-fetch when location changes

  // Update restaurants when Redux state changes
  useEffect(() => {
    const restaurantsToUse = nearbyRestaurants.length > 0 ? nearbyRestaurants : reduxRestaurants;
    console.log("🔄 Updating restaurants state:", {
      nearbyCount: nearbyRestaurants.length,
      allCount: reduxRestaurants.length,
      using: restaurantsToUse.length,
      loading,
    });
    if (restaurantsToUse.length > 0) {
      // Add distance if not already present
      const restaurantsWithDistance = restaurantsToUse.map((rest) => ({
        ...rest,
        distance: rest.distance || (userLocation.lat && userLocation.lng ? calculateDistance(userLocation, rest.coordinates) : undefined),
      }));
      setRestaurants(restaurantsWithDistance);
    } else if (!loading && restaurantsToUse.length === 0) {
      // Clear restaurants if loading is done and no results
      setRestaurants([]);
    }
  }, [reduxRestaurants, nearbyRestaurants, userLocation, loading]);

  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      setFilters((prev) => ({ ...prev, cuisine: [category] }));
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = [...restaurants];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((restaurant) => restaurant.name.toLowerCase().includes(query) || restaurant.description.toLowerCase().includes(query) || restaurant.cuisines.some((cuisine) => cuisine.toLowerCase().includes(query)) || restaurant.address.toLowerCase().includes(query));
    }

    // Apply cuisine filter
    if (filters.cuisine && filters.cuisine.length > 0) {
      filtered = filtered.filter((restaurant) => filters.cuisine!.some((filterCuisine) => restaurant.cuisines.some((restCuisine) => restCuisine.toLowerCase().includes(filterCuisine.toLowerCase()))));
    }

    // Apply rating filter
    if (filters.rating !== undefined) {
      filtered = filtered.filter((restaurant) => restaurant.rating >= filters.rating!);
    }

    // Apply delivery time filter
    if (filters.deliveryTime !== undefined) {
      filtered = filtered.filter((restaurant) => {
        // Extract max delivery time from string like "25-35 min"
        const timeMatch = restaurant.deliveryTime.match(/(\d+)-(\d+)/);
        if (timeMatch) {
          const maxTime = parseInt(timeMatch[2]);
          return maxTime <= filters.deliveryTime!;
        }
        return false;
      });
    }

    // Apply price range filter
    if (filters.priceRange) {
      const priceRange = priceRanges.find((p) => p.value === filters.priceRange);
      if (priceRange) {
        filtered = filtered.filter((restaurant) => {
          const minOrder = restaurant.minimumOrder;
          return minOrder >= priceRange.min && minOrder <= priceRange.max;
        });
      }
    }

    // Apply vegetarian filter
    if (filters.isVegetarian) {
      filtered = filtered.filter((restaurant) => restaurant.isVegetarian);
    }

    // Apply open status filter
    if (filters.isOpen) {
      filtered = filtered.filter((restaurant) => restaurant.isOpen);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "delivery_time":
        filtered.sort((a, b) => {
          const aTimeMatch = a.deliveryTime.match(/(\d+)-(\d+)/);
          const bTimeMatch = b.deliveryTime.match(/(\d+)-(\d+)/);
          const aTime = aTimeMatch ? parseInt(aTimeMatch[1]) : 999;
          const bTime = bTimeMatch ? parseInt(bTimeMatch[1]) : 999;
          return aTime - bTime;
        });
        break;
      case "popularity":
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "distance":
        filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        break;
      case "price_low_to_high":
        filtered.sort((a, b) => a.minimumOrder - b.minimumOrder);
        break;
      case "price_high_to_low":
        filtered.sort((a, b) => b.minimumOrder - a.minimumOrder);
        break;
    }

    setFilteredRestaurants(filtered);
  }, [searchQuery, filters, restaurants]);

  const handleFilterChange = (key: keyof RestaurantFilter, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCuisineToggle = (cuisine: string) => {
    setFilters((prev) => ({
      ...prev,
      cuisine: prev.cuisine?.includes(cuisine) ? prev.cuisine.filter((c) => c !== cuisine) : [...(prev.cuisine || []), cuisine],
    }));
  };

  const clearFilters = () => {
    setFilters({
      cuisine: [],
      rating: undefined,
      deliveryTime: undefined,
      priceRange: undefined,
      isVegetarian: false,
      isOpen: true,
      sortBy: "distance",
    });
    setSearchQuery("");
    setSearchParams({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.cuisine && filters.cuisine.length > 0) count += filters.cuisine.length;
    if (filters.rating !== undefined) count++;
    if (filters.deliveryTime !== undefined) count++;
    if (filters.priceRange !== undefined) count++;
    if (filters.isVegetarian) count++;
    if (!filters.isOpen) count++;
    return count;
  };

  const RestaurantCard: React.FC<{ restaurant: Restaurant & { distance?: number } }> = ({ restaurant }) => (
    <Link to={`/restaurant/${restaurant.id}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-[1.02]">
        <div className="relative">
          <img src={restaurant.image} alt={restaurant.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
          {restaurant.promo && <div className="absolute top-4 left-4 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">{restaurant.promo.title}</div>}
          {restaurant.isPremium && <div className="absolute top-4 right-4 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">Premium</div>}
          {!restaurant.isOpen && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <div className="text-center">
                <span className="text-white font-semibold text-lg">Closed</span>
                <p className="text-white/80 text-sm mt-1">Opens tomorrow</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium text-gray-900">{restaurant.rating}</span>
            <span className="text-xs text-gray-500">({restaurant.reviewCount})</span>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-900 flex-1 group-hover:text-primary-600 transition-colors">{restaurant.name}</h3>
            {restaurant.distance && (
              <div className="flex items-center text-sm text-gray-500 ml-2 bg-gray-50 px-2 py-1 rounded-full">
                <Navigation className="w-3 h-3 mr-1" />
                <span>{restaurant.distance}km</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mb-3 line-clamp-2">{restaurant.description}</p>
          <div className="flex items-center space-x-2 mb-4">
            {restaurant.cuisines.slice(0, 3).map((cuisine) => (
              <span key={cuisine} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors">
                {cuisine}
              </span>
            ))}
            {restaurant.cuisines.length > 3 && <span className="text-xs text-gray-500">+{restaurant.cuisines.length - 3} more</span>}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{restaurant.deliveryTime}</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Truck className="w-4 h-4" />
              <span>₹{restaurant.deliveryFee}</span>
            </div>
            <div className="text-xs text-gray-500">Min: ₹{restaurant.minimumOrder}</div>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Restaurants Near You</h1>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-sm text-gray-600">{nearbyRestaurants.length > 0 ? `Showing restaurants within 15km radius • ${filteredRestaurants.length} of ${restaurants.length} found` : `Showing ${filteredRestaurants.length} restaurants`}</p>
                {nearbyRestaurants.length > 0 && restaurants.length < reduxRestaurants.length && (
                  <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Some restaurants are outside 15km radius
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary-100 text-primary-600" : "text-gray-600 hover:bg-gray-100"}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary-100 text-primary-600" : "text-gray-600 hover:bg-gray-100"}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
              <Button variant="outline" onClick={() => setIsFilterOpen(true)} leftIcon={<Filter className="w-4 h-4" />} className="relative">
                Filter
                {getActiveFilterCount() > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">{getActiveFilterCount()}</span>}
              </Button>
            </div>
          </div>

          {/* Search and Location */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search restaurants, dishes, cuisines..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 px-4 py-3 bg-gray-100 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 text-sm">{state.selectedAddress?.address || "Current location"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {filteredRestaurants.length} restaurants found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
          <div className="flex items-center space-x-4">
            <select value={filters.sortBy} onChange={(e) => handleFilterChange("sortBy", e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm">
              <option value="distance">Sort by Distance</option>
              <option value="rating">Sort by Rating</option>
              <option value="delivery_time">Sort by Delivery Time</option>
              <option value="popularity">Sort by Popularity</option>
              <option value="price_low_to_high">Price: Low to High</option>
              <option value="price_high_to_low">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {getActiveFilterCount() > 0 && (
          <div className="flex items-center space-x-2 mb-6 flex-wrap gap-2">
            <span className="text-sm text-gray-600 font-medium">Active filters:</span>
            {filters.cuisine?.map((cuisine) => (
              <span key={cuisine} className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {cuisine}
                <button onClick={() => handleCuisineToggle(cuisine)} className="ml-2 text-primary-500 hover:text-primary-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.rating && (
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {filters.rating}+ stars
                <button onClick={() => handleFilterChange("rating", undefined)} className="ml-2 text-primary-500 hover:text-primary-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.deliveryTime && (
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                Under {filters.deliveryTime} min
                <button onClick={() => handleFilterChange("deliveryTime", undefined)} className="ml-2 text-primary-500 hover:text-primary-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.priceRange && (
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {priceRanges.find((p) => p.value === filters.priceRange)?.label}
                <button onClick={() => handleFilterChange("priceRange", undefined)} className="ml-2 text-primary-500 hover:text-primary-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.isVegetarian && (
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                Vegetarian Only
                <button onClick={() => handleFilterChange("isVegetarian", false)} className="ml-2 text-primary-500 hover:text-primary-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {!filters.isOpen && (
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                Include Closed
                <button onClick={() => handleFilterChange("isOpen", true)} className="ml-2 text-primary-500 hover:text-primary-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Clear all
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading restaurants...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Restaurants</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                if (userLocation.lat && userLocation.lng) {
                  dispatch(fetchNearbyRestaurants({ lat: userLocation.lat, lng: userLocation.lng, radius: 15 }));
                } else {
                  dispatch(fetchRestaurants());
                }
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Restaurant Grid */}
        {!loading && !error && (
          <div className={`grid gap-8 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600 mb-4">{restaurants.length === 0 ? "No restaurants available within 15km radius. Try changing your location." : searchQuery ? `No restaurants match your search "${searchQuery}" with current filters.` : "No restaurants match your current filters."}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
              {getActiveFilterCount() > 0 && <Button onClick={clearFilters}>Clear All Filters</Button>}
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Filter Restaurants</h3>
                <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Cuisine Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Cuisine</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cuisines.map((cuisine) => (
                    <label key={cuisine} className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="checkbox" checked={filters.cuisine?.includes(cuisine) || false} onChange={() => handleCuisineToggle(cuisine)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="ml-3 text-gray-700">{cuisine}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Minimum Rating</h4>
                <div className="space-y-2">
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <label key={rating} className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="rating" checked={filters.rating === rating} onChange={() => handleFilterChange("rating", rating)} className="text-primary-600 focus:ring-primary-500" />
                      <span className="ml-3 text-gray-700 flex items-center">
                        {rating}+
                        <Star className="w-4 h-4 text-yellow-400 fill-current ml-1" />
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Time Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Delivery Time</h4>
                <div className="space-y-2">
                  {[30, 45, 60].map((time) => (
                    <label key={time} className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="deliveryTime" checked={filters.deliveryTime === time} onChange={() => handleFilterChange("deliveryTime", time)} className="text-primary-600 focus:ring-primary-500" />
                      <span className="ml-3 text-gray-700">Under {time} minutes</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Price Range (Minimum Order)</h4>
                <div className="space-y-2">
                  {priceRanges.map((range) => (
                    <label key={range.value} className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="priceRange" checked={filters.priceRange === range.value} onChange={() => handleFilterChange("priceRange", range.value)} className="text-primary-600 focus:ring-primary-500" />
                      <span className="ml-3 text-gray-700">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Filters */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Other Filters</h4>
                <div className="space-y-3">
                  <label className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input type="checkbox" checked={filters.isVegetarian} onChange={(e) => handleFilterChange("isVegetarian", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="ml-3 text-gray-700">Vegetarian Only</span>
                  </label>
                  <label className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input type="checkbox" checked={filters.isOpen} onChange={(e) => handleFilterChange("isOpen", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="ml-3 text-gray-700">Open Now</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-4">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
                <Button onClick={() => setIsFilterOpen(false)} className="flex-1">
                  Apply Filters ({filteredRestaurants.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restaurants;
