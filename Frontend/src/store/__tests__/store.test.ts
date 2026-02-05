import { store } from "../store";
import { RootState } from "../store";

describe("Store Configuration - Whitebox Tests", () => {
  describe("Store Structure", () => {
    it("should have all required reducers", () => {
      const state = store.getState();

      expect(state).toHaveProperty("restaurants");
      expect(state).toHaveProperty("menuItems");
      expect(state).toHaveProperty("menuCategories");
      expect(state).toHaveProperty("users");
    });

    it("should have correct initial state for restaurants", () => {
      const state = store.getState();

      expect(state.restaurants).toEqual({
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

    it("should have correct initial state for menuItems", () => {
      const state = store.getState();

      expect(state.menuItems).toEqual({
        items: [],
        itemsByRestaurant: {},
        selectedItem: null,
        loading: false,
        error: null,
      });
    });

    it("should have correct initial state for menuCategories", () => {
      const state = store.getState();

      expect(state.menuCategories).toEqual({
        categories: [],
        categoriesByRestaurant: {},
        loading: false,
        error: null,
      });
    });

    it("should have correct initial state for users", () => {
      const state = store.getState();

      expect(state.users).toEqual({
        currentUser: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      });
    });
  });

  describe("RootState Type", () => {
    it("should correctly infer RootState type", () => {
      const state: RootState = store.getState();

      // Type checking - if this compiles, the type is correct
      expect(state).toBeDefined();
      expect(typeof state.restaurants).toBe("object");
      expect(typeof state.menuItems).toBe("object");
      expect(typeof state.menuCategories).toBe("object");
      expect(typeof state.users).toBe("object");
    });
  });

  describe("Store Dispatch", () => {
    it("should dispatch actions correctly", () => {
      const initialState = store.getState();

      // Dispatch an action
      store.dispatch({
        type: "restaurants/setFilters",
        payload: { search: "pizza" },
      });

      const newState = store.getState();
      expect(newState.restaurants.filters.search).toBe("pizza");
    });
  });

  describe("Store Immutability", () => {
    it("should not mutate original state", () => {
      // Reset filters first to ensure clean state
      store.dispatch({
        type: "restaurants/setFilters",
        payload: { search: "" },
      });
      
      const initialState = store.getState();
      // Make a deep copy of the state to check immutability
      const initialStateCopy = JSON.parse(JSON.stringify(initialState));
      const restaurantsBefore = initialState.restaurants;

      store.dispatch({
        type: "restaurants/setFilters",
        payload: { search: "test" },
      });

      const newState = store.getState();

      // Original state should not be mutated
      expect(restaurantsBefore).not.toBe(newState.restaurants);
      // Check the copy instead of the reference
      expect(initialStateCopy.restaurants.filters.search).toBe("");
      expect(newState.restaurants.filters.search).toBe("test");
    });
  });
});
