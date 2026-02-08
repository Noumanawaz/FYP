import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Filter, ChevronDown, X, Star, Navigation, AlertCircle, Grid, List } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchRestaurants, fetchNearbyRestaurants } from "../../store/slices/restaurantsSlice";
import { Restaurant, RestaurantFilter } from "../../types";
import { calculateDistance } from "../../utils/distance";
import Button from "../../components/Common/Button";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import RestaurantCard from "../../components/Restaurant/RestaurantCard";

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
    { value: "low", label: "Under Rs. 200", min: 0, max: 199 },
    { value: "medium", label: "Rs. 200 - Rs. 500", min: 200, max: 500 },
    { value: "high", label: "Above Rs. 500", min: 501, max: Infinity },
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




  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-primary-900/5 z-0"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                Hungry? <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">We've got you.</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-xl">
                Discover the best food from over <span className="font-semibold text-gray-900">{restaurants.length}</span> restaurants delivered to your doorstep.
              </p>
              
              <div className="flex items-center space-x-2 mt-6 justify-center md:justify-start">
                 <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                    <MapPin className="w-4 h-4 text-primary-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">{state.selectedAddress?.address || "Detecting location..."}</span>
                 </div>
              </div>
            </div>
            
            {/* Search Box */}
            <div className="w-full md:w-auto md:min-w-[400px]">
               <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 flex items-center">
                  <Search className="w-5 h-5 text-gray-400 ml-3" />
                  <input 
                    type="text" 
                    placeholder="Search for restaurants or dishes..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="p-2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
               </div>
               
               <div className="mt-4 flex items-center justify-between">
                 <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setIsFilterOpen(true)} 
                      leftIcon={<Filter className="w-3.5 h-3.5" />}
                      className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      Filters {getActiveFilterCount() > 0 && <span className="ml-1 bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{getActiveFilterCount()}</span>}
                    </Button>
                    
                    <select 
                      value={filters.sortBy} 
                      onChange={(e) => handleFilterChange("sortBy", e.target.value)} 
                      className="pl-3 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-600 outline-none cursor-pointer hover:bg-gray-50"
                    >
                      <option value="distance">Nearest</option>
                      <option value="rating">Top Rated</option>
                      <option value="delivery_time">Fastest</option>
                      <option value="popularity">Popular</option>
                      <option value="price_low_to_high">Cost: Low to High</option>
                      <option value="price_high_to_low">Cost: High to Low</option>
                    </select>
                 </div>
                 
                  <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-primary-600" : "text-gray-500 hover:text-gray-700"}`}>
                      <Grid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary-600" : "text-gray-500 hover:text-gray-700"}`}>
                      <List className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-8 relative z-20">
        
        {/* Nearby Alert */}
        {nearbyRestaurants.length > 0 && (
           <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-slide-up">
              <div className="flex items-center">
                 <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mr-3">
                    <Navigation className="w-5 h-5 text-primary-600" />
                 </div>
                 <div>
                    <h3 className="font-semibold text-gray-900">Nearby Favorites</h3>
                    <p className="text-xs text-gray-500">Showing {filteredRestaurants.length} restaurants within 15km of you</p>
                 </div>
              </div>
              {restaurants.length < reduxRestaurants.length && (
                 <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-medium flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                    Some places hidden (too far)
                 </div>
              )}
           </div>
        )}

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && (
          <div className="flex items-center space-x-2 mb-6 flex-wrap gap-2 animate-fade-in">
            <span className="text-sm text-gray-500 font-medium mr-2">Filters:</span>
            {filters.cuisine?.map((cuisine) => (
              <span key={cuisine} className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium shadow-sm">
                {cuisine}
                <button onClick={() => handleCuisineToggle(cuisine)} className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.rating && (
              <span className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium shadow-sm">
                {filters.rating}+ stars
                <button onClick={() => handleFilterChange("rating", undefined)} className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {/* ... other filters styling ... */}
            <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700 font-semibold underline decoration-2 underline-offset-4 transition-colors ml-2">
              Clear all
            </button>
          </div>
        )}

        {/* Loading State */}
        {/* Loading State - only show full spinner if no data */}
        {loading && filteredRestaurants.length === 0 && (
          <div className="flex flex-col justify-center items-center py-20 animate-fade-in">
            <LoadingSpinner size="lg" />
            <p className="mt-6 text-gray-500 font-medium">Finding the best spots for you...</p>
          </div>
        )}

        {/* Error State - only show full error if no data */}
        {error && !loading && filteredRestaurants.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{error}</p>
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
        {((!loading && !error) || filteredRestaurants.length > 0) && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-4 mb-4 text-primary-600 bg-primary-50/50 rounded-xl">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm font-medium">Updating results...</span>
              </div>
            )}
            <div className={`grid gap-8 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" : "grid-cols-1 max-w-3xl mx-auto"}`}>
              {filteredRestaurants.map((restaurant, index) => (
                <div key={restaurant.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                   <RestaurantCard restaurant={restaurant} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* No Results */}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">{restaurants.length === 0 ? "No restaurants available within 15km radius. Try changing your location." : searchQuery ? `No restaurants match your search "${searchQuery}" with current filters.` : "No restaurants match your current filters."}</p>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center justify-between">
               <h3 className="text-xl font-bold text-gray-900">Filter Restaurants</h3>
               <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Cuisine Filter */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                   <span className="w-1 h-5 bg-primary-500 rounded-full mr-2"></span>
                   Cuisines
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cuisines.map((cuisine) => (
                    <label key={cuisine} className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${filters.cuisine?.includes(cuisine) ? "bg-primary-50 border-primary-200 text-primary-700 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <input type="checkbox" className="hidden" checked={filters.cuisine?.includes(cuisine) || false} onChange={() => handleCuisineToggle(cuisine)} />
                      {cuisine}
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                   <span className="w-1 h-5 bg-yellow-400 rounded-full mr-2"></span>
                   Minimum Rating
                </h4>
                <div className="space-y-3">
                  {[4.5, 4.0, 3.5].map((rating) => (
                    <label key={rating} className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${filters.rating === rating ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:bg-gray-50"}`}>
                      <input type="radio" name="rating" checked={filters.rating === rating} onChange={() => handleFilterChange("rating", rating)} className="text-primary-600 focus:ring-primary-500 w-5 h-5" />
                      <div className="ml-3 flex items-center">
                        <span className="font-semibold text-gray-900 mr-2">{rating}+</span>
                        <div className="flex">
                           {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
                           ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Time & Price */}
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <h4 className="font-bold text-gray-900 mb-4">Max Time</h4>
                    <select 
                       value={filters.deliveryTime || ""} 
                       onChange={(e) => handleFilterChange("deliveryTime", e.target.value ? Number(e.target.value) : undefined)}
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                       <option value="">Any time</option>
                       <option value="30">Under 30 min</option>
                       <option value="45">Under 45 min</option>
                       <option value="60">Under 60 min</option>
                    </select>
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-900 mb-4">Price Range</h4>
                    <select 
                       value={filters.priceRange || ""} 
                       onChange={(e) => handleFilterChange("priceRange", e.target.value || undefined)}
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                       <option value="">Any price</option>
                       {priceRanges.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                 </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="flex items-center justify-between p-1 cursor-pointer">
                  <span className="font-medium text-gray-900">Vegetarian Only</span>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full border border-gray-200 bg-gray-100 has-[:checked]:bg-green-500">
                     <input type="checkbox" checked={filters.isVegetarian} onChange={(e) => handleFilterChange("isVegetarian", e.target.checked)} className="peer sr-only" />
                     <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-6"></span>
                  </div>
                </label>
                <label className="flex items-center justify-between p-1 cursor-pointer">
                  <span className="font-medium text-gray-900">Show Closed Restaurants</span>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full border border-gray-200 bg-gray-100 has-[:checked]:bg-primary-500">
                     <input type="checkbox" checked={!filters.isOpen} onChange={(e) => handleFilterChange("isOpen", !e.target.checked)} className="peer sr-only" />
                     <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-6"></span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
              <div className="flex space-x-4">
                <Button variant="outline" onClick={clearFilters} className="flex-1 border-gray-300 hover:bg-white">
                  Reset
                </Button>
                <Button onClick={() => setIsFilterOpen(false)} className="flex-[2] shadow-lg shadow-primary-500/30">
                  Show {filteredRestaurants.length} Restaurants
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
