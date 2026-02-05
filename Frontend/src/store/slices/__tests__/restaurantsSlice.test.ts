import restaurantsReducer, { setFilters, clearFilters, clearError, fetchRestaurants, fetchRestaurantById, searchRestaurants, fetchNearbyRestaurants, initialState } from "../restaurantsSlice";
import { apiService } from "../../../services/api";

// Mock the API service
jest.mock("../../../services/api", () => ({
  apiService: {
    getRestaurants: jest.fn(),
    getRestaurant: jest.fn(),
    searchRestaurants: jest.fn(),
    getNearbyRestaurants: jest.fn(),
  },
}));

describe("restaurantsSlice - Whitebox Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state structure", () => {
      expect(initialState).toEqual({
        restaurants: [],
        selectedRestaurant: null,
        nearbyRestaurants: [],
        loading: false,
        error: null,
        filters: {
          search: "",
        },
      });
    });
  });

  describe("setFilters reducer", () => {
    it("should update filters correctly when setFilters is called", () => {
      const action = setFilters({ search: "pizza", priceRange: "mid-range" });
      const newState = restaurantsReducer(initialState, action);

      expect(newState.filters.search).toBe("pizza");
      expect(newState.filters.priceRange).toBe("mid-range");
      expect(newState.filters).toEqual({
        search: "pizza",
        priceRange: "mid-range",
      });
    });

    it("should merge filters without overwriting existing ones", () => {
      const stateWithFilters = {
        ...initialState,
        filters: { search: "burger", categories: ["fast-food"] },
      };
      const action = setFilters({ priceRange: "budget" });
      const newState = restaurantsReducer(stateWithFilters, action);

      expect(newState.filters.search).toBe("burger");
      expect(newState.filters.categories).toEqual(["fast-food"]);
      expect(newState.filters.priceRange).toBe("budget");
    });

    it("should update categories array correctly", () => {
      const action = setFilters({ categories: ["Italian", "Pizza"] });
      const newState = restaurantsReducer(initialState, action);

      expect(newState.filters.categories).toEqual(["Italian", "Pizza"]);
    });

    it("should update status filter", () => {
      const action = setFilters({ status: "active" });
      const newState = restaurantsReducer(initialState, action);

      expect(newState.filters.status).toBe("active");
    });
  });

  describe("clearFilters reducer", () => {
    it("should reset filters to initial state", () => {
      const stateWithFilters = {
        ...initialState,
        filters: { search: "pizza", priceRange: "premium", categories: ["Italian"] },
      };
      const action = clearFilters();
      const newState = restaurantsReducer(stateWithFilters, action);

      expect(newState.filters).toEqual({ search: "" });
    });
  });

  describe("clearError reducer", () => {
    it("should clear error state", () => {
      const stateWithError = {
        ...initialState,
        error: "Some error occurred",
      };
      const action = clearError();
      const newState = restaurantsReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });
  });

  describe("fetchRestaurants async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: fetchRestaurants.pending.type };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should transform and store restaurants when fulfilled", () => {
      const mockBackendData = {
        restaurant_id: "123",
        name: "Test Restaurant",
        status: "active",
        price_range: "premium",
        categories: ["Italian"],
        location: { lat: 33.6844, lng: 73.0479, address: "Test Address" },
        logo_url: "test-logo.jpg",
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockBackendData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.restaurants).toHaveLength(1);
      expect(newState.restaurants[0].id).toBe("123");
      expect(newState.restaurants[0].name).toBe("Test Restaurant");
      expect(newState.restaurants[0].isPremium).toBe(true);
      expect(newState.restaurants[0].isOpen).toBe(true);
      expect(newState.restaurants[0].coordinates).toEqual({ lat: 33.6844, lng: 73.0479 });
      expect(newState.restaurants[0].address).toBe("Test Address");
    });

    it("should handle restaurant with locations array", () => {
      const mockBackendData = {
        restaurant_id: "456",
        name: "Restaurant with Locations",
        status: "active",
        locations: [{ lat: 31.5497, lng: 74.3436, address: "Lahore Address" }],
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockBackendData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants[0].coordinates).toEqual({ lat: 31.5497, lng: 74.3436 });
      expect(newState.restaurants[0].address).toBe("Lahore Address");
    });

    it("should handle restaurant with object description", () => {
      const mockBackendData = {
        restaurant_id: "789",
        name: "Restaurant with Object Description",
        description: { en: "English description", ur: "Urdu description" },
        status: "active",
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockBackendData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants[0].description).toBe("English description");
    });

    it("should handle vegetarian restaurant detection", () => {
      const mockBackendData = {
        restaurant_id: "veg-123",
        name: "Vegetarian Restaurant",
        categories: ["Vegetarian", "Indian"],
        status: "active",
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockBackendData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants[0].isVegetarian).toBe(true);
    });

    it("should set error when rejected", () => {
      const action = {
        type: fetchRestaurants.rejected.type,
        error: { message: "Failed to fetch restaurants" },
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Failed to fetch restaurants");
    });

    it("should handle empty array response", () => {
      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants).toHaveLength(0);
      expect(newState.loading).toBe(false);
    });
  });

  describe("fetchRestaurantById async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: fetchRestaurantById.pending.type };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should set selectedRestaurant when fulfilled", () => {
      const mockRestaurant = {
        restaurant_id: "selected-123",
        name: "Selected Restaurant",
        status: "active",
        location: { lat: 33.6844, lng: 73.0479, address: "Selected Address" },
      };

      const action = {
        type: fetchRestaurantById.fulfilled.type,
        payload: mockRestaurant,
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.selectedRestaurant).not.toBeNull();
      expect(newState.selectedRestaurant?.id).toBe("selected-123");
      expect(newState.selectedRestaurant?.name).toBe("Selected Restaurant");
    });

    it("should set error when rejected", () => {
      const action = {
        type: fetchRestaurantById.rejected.type,
        error: { message: "Restaurant not found" },
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Restaurant not found");
    });
  });

  describe("searchRestaurants async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: searchRestaurants.pending.type };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should update restaurants array when fulfilled", () => {
      const mockResults = [
        {
          restaurant_id: "search-1",
          name: "Search Result 1",
          status: "active",
        },
        {
          restaurant_id: "search-2",
          name: "Search Result 2",
          status: "active",
        },
      ];

      const action = {
        type: searchRestaurants.fulfilled.type,
        payload: mockResults,
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.restaurants).toHaveLength(2);
    });

    it("should set error when rejected", () => {
      const action = {
        type: searchRestaurants.rejected.type,
        error: { message: "Search failed" },
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Search failed");
    });
  });

  describe("fetchNearbyRestaurants async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: fetchNearbyRestaurants.pending.type };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should store nearby restaurants separately", () => {
      const mockNearby = [
        {
          restaurant_id: "nearby-1",
          name: "Nearby Restaurant",
          status: "active",
          distance: 2.5,
        },
      ];

      const action = {
        type: fetchNearbyRestaurants.fulfilled.type,
        payload: mockNearby,
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.nearbyRestaurants).toHaveLength(1);
      expect(newState.nearbyRestaurants[0].id).toBe("nearby-1");
      expect(newState.nearbyRestaurants[0].distance).toBe(2.5);
    });

    it("should set error when rejected", () => {
      const action = {
        type: fetchNearbyRestaurants.rejected.type,
        error: { message: "Failed to fetch nearby restaurants" },
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Failed to fetch nearby restaurants");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing location data", () => {
      const mockData = {
        restaurant_id: "no-location",
        name: "No Location Restaurant",
        status: "active",
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants[0].coordinates).toEqual({ lat: 0, lng: 0 });
      expect(newState.restaurants[0].address).toBe("Address not available");
    });

    it("should handle inactive restaurant status", () => {
      const mockData = {
        restaurant_id: "inactive",
        name: "Inactive Restaurant",
        status: "inactive",
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants[0].isOpen).toBe(false);
    });

    it("should handle restaurant with distance property", () => {
      const mockData = {
        restaurant_id: "with-distance",
        name: "Restaurant with Distance",
        status: "active",
        distance: 5.3,
      };

      const action = {
        type: fetchRestaurants.fulfilled.type,
        payload: [mockData],
      };
      const newState = restaurantsReducer(initialState, action);

      expect(newState.restaurants[0].distance).toBe(5.3);
    });
  });
});
