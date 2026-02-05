import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/api";
import { Restaurant } from "../../types";

interface RestaurantsState {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  nearbyRestaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    priceRange?: string;
    categories?: string[];
    status?: string;
  };
}

export const initialState: RestaurantsState = {
  restaurants: [],
  selectedRestaurant: null,
  nearbyRestaurants: [],
  loading: false,
  error: null,
  filters: {
    search: "",
  },
};

// Transform backend restaurant to frontend format
const transformRestaurant = (backendRestaurant: any, location?: { lat: number; lng: number }): Restaurant => {
  const restaurantLocation = backendRestaurant?.location || backendRestaurant?.locations?.[0];
  const categories = Array.isArray(backendRestaurant?.categories) ? backendRestaurant.categories : [];

  return {
    id: backendRestaurant?.restaurant_id || backendRestaurant?.id || "unknown",
    name: backendRestaurant?.name || "Unknown Restaurant",
    description: typeof backendRestaurant?.description === "object" ? backendRestaurant.description.en || JSON.stringify(backendRestaurant.description) : backendRestaurant?.description || "",
    image: backendRestaurant?.logo_url || "/placeholder-restaurant.jpg",
    rating: 4.5, // Default rating, can be added to backend later
    reviewCount: 0,
    deliveryTime: "30-45 min",
    deliveryFee: 50,
    minimumOrder: 200,
    cuisines: categories,
    isOpen: backendRestaurant?.status === "active",
    isVegetarian: categories.some((cat: string) => typeof cat === "string" && cat.toLowerCase().includes("vegetarian")),
    isPremium: backendRestaurant?.price_range === "premium",
    address: restaurantLocation?.address || "Address not available",
    coordinates: {
      lat: location?.lat ?? restaurantLocation?.lat ?? backendRestaurant?.lat ?? 0,
      lng: location?.lng ?? restaurantLocation?.lng ?? backendRestaurant?.lng ?? 0,
    },
    menu: [],
    openingHours: {
      monday: { open: "10:00", close: "22:00", isClosed: false },
      tuesday: { open: "10:00", close: "22:00", isClosed: false },
      wednesday: { open: "10:00", close: "22:00", isClosed: false },
      thursday: { open: "10:00", close: "22:00", isClosed: false },
      friday: { open: "10:00", close: "22:00", isClosed: false },
      saturday: { open: "10:00", close: "22:00", isClosed: false },
      sunday: { open: "10:00", close: "22:00", isClosed: false },
    },
    distance: backendRestaurant.distance,
  };
};

// Async thunks
export const fetchRestaurants = createAsyncThunk("restaurants/fetchAll", async (params?: { page?: number; limit?: number; search?: string; price_range?: string; categories?: string[] }) => {
  try {
    const response = await apiService.getRestaurants(params);
    if (response.success && response.data) {
      const data = response.data as any;
      const restaurants = Array.isArray(data.restaurants) ? data.restaurants : data;
      return Array.isArray(restaurants) ? restaurants : [];
    }
    throw new Error(response.error || "Failed to fetch restaurants");
  } catch (error) {
    throw error;
  }
});

export const fetchRestaurantById = createAsyncThunk(
  "restaurants/fetchById",
  async (id: string, { getState }) => {
    const state = getState() as any;
    const restaurantsState = state.restaurants;

    // If we already have this restaurant selected, return it
    if (restaurantsState.selectedRestaurant?.id === id) {
      return restaurantsState.selectedRestaurant;
    }

    const response = await apiService.getRestaurant(id);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch restaurant");
  },
  {
    condition: (id: string, { getState }) => {
      const state = getState() as any;
      const restaurantsState = state.restaurants;

      // Don't dispatch if we already have this restaurant selected
      return restaurantsState.selectedRestaurant?.id !== id;
    },
  }
);

export const searchRestaurants = createAsyncThunk("restaurants/search", async (keyword: string) => {
  const response = await apiService.searchRestaurants(keyword);
  if (response.success && response.data) {
    return Array.isArray(response.data) ? response.data : [];
  }
  throw new Error(response.error || "Failed to search restaurants");
});

export const fetchNearbyRestaurants = createAsyncThunk("restaurants/fetchNearby", async (params: { lat: number; lng: number; radius?: number }) => {
  try {
    const response = await apiService.getNearbyRestaurants(params.lat, params.lng, params.radius);
    if (response.success && response.data) {
      const data = response.data as any;
      const restaurants = Array.isArray(data.restaurants) ? data.restaurants : [];
      return restaurants;
    }
    throw new Error(response.error || "Failed to fetch nearby restaurants");
  } catch (error) {
    throw error;
  }
});

const restaurantsSlice = createSlice({
  name: "restaurants",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<RestaurantsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { search: "" };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all restaurants
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload.map((r: any) => transformRestaurant(r));
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch restaurants";
      })
      // Fetch restaurant by ID
      .addCase(fetchRestaurantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRestaurant = transformRestaurant(action.payload);
      })
      .addCase(fetchRestaurantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch restaurant";
      })
      // Search restaurants
      .addCase(searchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload.map((r: any) => transformRestaurant(r));
      })
      .addCase(searchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to search restaurants";
      })
      // Fetch nearby restaurants
      .addCase(fetchNearbyRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearbyRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.nearbyRestaurants = action.payload.map((r: any) => transformRestaurant(r));
      })
      .addCase(fetchNearbyRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch nearby restaurants";
      });
  },
});

export const { setFilters, clearFilters, clearError } = restaurantsSlice.actions;
export default restaurantsSlice.reducer;
