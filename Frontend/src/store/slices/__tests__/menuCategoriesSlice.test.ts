import menuCategoriesReducer, { clearCategories, clearRestaurantCategories, clearError, fetchMenuCategories, initialState } from "../menuCategoriesSlice";
import { apiService } from "../../../services/api";

// Mock the API service
jest.mock("../../../services/api", () => ({
  apiService: {
    getMenuItems: jest.fn(),
  },
}));

describe("menuCategoriesSlice - Whitebox Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state structure", () => {
      expect(initialState).toEqual({
        categories: [],
        categoriesByRestaurant: {},
        loading: false,
        error: null,
      });
    });
  });

  describe("clearCategories reducer", () => {
    it("should clear all categories and categoriesByRestaurant", () => {
      const stateWithCategories = {
        ...initialState,
        categories: [{ id: "cat-1", name: "Category 1", restaurantId: "rest-1" }],
        categoriesByRestaurant: {
          "rest-1": [{ id: "cat-1", name: "Category 1", restaurantId: "rest-1" }],
        },
      };

      const action = clearCategories();
      const newState = menuCategoriesReducer(stateWithCategories, action);

      expect(newState.categories).toEqual([]);
      expect(newState.categoriesByRestaurant).toEqual({});
    });
  });

  describe("clearRestaurantCategories reducer", () => {
    it("should remove categories for specific restaurant", () => {
      const stateWithCategories = {
        ...initialState,
        categoriesByRestaurant: {
          "rest-1": [{ id: "cat-1", name: "Category 1", restaurantId: "rest-1" }],
          "rest-2": [{ id: "cat-2", name: "Category 2", restaurantId: "rest-2" }],
        },
      };

      const action = clearRestaurantCategories("rest-1");
      const newState = menuCategoriesReducer(stateWithCategories, action);

      expect(newState.categoriesByRestaurant["rest-1"]).toBeUndefined();
      expect(newState.categoriesByRestaurant["rest-2"]).toHaveLength(1);
    });
  });

  describe("clearError reducer", () => {
    it("should clear error state", () => {
      const stateWithError = {
        ...initialState,
        error: "Some error",
      };

      const action = clearError();
      const newState = menuCategoriesReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });
  });

  describe("fetchMenuCategories async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: fetchMenuCategories.pending.type };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should extract and transform categories from menu items when fulfilled", () => {
      const mockMenuItems = [
        {
          item_id: "item-1",
          category_id: "cat-1",
          category_name: "Main Course",
          category_description: "Main dishes",
        },
        {
          item_id: "item-2",
          category_id: "cat-1",
          category_name: "Main Course",
        },
        {
          item_id: "item-3",
          category_id: "cat-2",
          category_name: "Desserts",
        },
      ];

      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-123",
          categories: [
            { category_id: "cat-1", name: "Main Course", description: "Main dishes" },
            { category_id: "cat-2", name: "Desserts" },
          ],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.categories).toHaveLength(2);
      expect(newState.categories[0].id).toBe("cat-1");
      expect(newState.categories[0].name).toBe("Main Course");
      expect(newState.categories[0].restaurantId).toBe("rest-123");
      expect(newState.categoriesByRestaurant["rest-123"]).toHaveLength(2);
    });

    it("should handle category with object name and description", () => {
      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [
            {
              category_id: "cat-1",
              name: { en: "English Name", ur: "Urdu Name" },
              description: { en: "English Description" },
            },
          ],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.categories[0].name).toBe("English Name");
      expect(newState.categories[0].description).toBe("English Description");
    });

    it("should handle displayOrder from backend", () => {
      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [
            {
              category_id: "cat-1",
              name: "Category 1",
              display_order: 2,
            },
            {
              category_id: "cat-2",
              name: "Category 2",
              order: 1,
            },
          ],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.categories[0].displayOrder).toBe(2);
      expect(newState.categories[1].displayOrder).toBe(1);
    });

    it("should set error when rejected", () => {
      const action = {
        type: fetchMenuCategories.rejected.type,
        error: { message: "Failed to fetch categories" },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Failed to fetch categories");
    });

    it("should handle empty categories array", () => {
      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.categories).toHaveLength(0);
      expect(newState.categoriesByRestaurant["rest-1"]).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing category name with default", () => {
      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [
            {
              category_id: "cat-1",
            },
          ],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.categories[0].name).toBe("Uncategorized");
    });

    it("should handle missing category_id with id fallback", () => {
      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [
            {
              id: "alt-id",
              name: "Category",
            },
          ],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.categories[0].id).toBe("alt-id");
    });

    it("should handle default displayOrder as 0", () => {
      const action = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [
            {
              category_id: "cat-1",
              name: "Category",
            },
          ],
        },
      };
      const newState = menuCategoriesReducer(initialState, action);

      expect(newState.categories[0].displayOrder).toBe(0);
    });

    it("should handle multiple restaurants categories storage", () => {
      const action1 = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          categories: [{ category_id: "cat-1", name: "Category 1" }],
        },
      };
      const state1 = menuCategoriesReducer(initialState, action1);

      const action2 = {
        type: fetchMenuCategories.fulfilled.type,
        payload: {
          restaurantId: "rest-2",
          categories: [{ category_id: "cat-2", name: "Category 2" }],
        },
      };
      const state2 = menuCategoriesReducer(state1, action2);

      expect(state2.categoriesByRestaurant["rest-1"]).toHaveLength(1);
      expect(state2.categoriesByRestaurant["rest-2"]).toHaveLength(1);
    });
  });
});
