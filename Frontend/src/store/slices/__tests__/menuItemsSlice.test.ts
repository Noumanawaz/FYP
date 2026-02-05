import menuItemsReducer, { clearItems, clearRestaurantItems, setSelectedItem, clearError, fetchMenuItems, initialState } from "../menuItemsSlice";
import { apiService } from "../../../services/api";
import { MenuItem } from "../../../types";

// Mock the API service
jest.mock("../../../services/api", () => ({
  apiService: {
    getMenuItems: jest.fn(),
  },
}));

describe("menuItemsSlice - Whitebox Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state structure", () => {
      expect(initialState).toEqual({
        items: [],
        itemsByRestaurant: {},
        selectedItem: null,
        loading: false,
        error: null,
      });
    });
  });

  describe("clearItems reducer", () => {
    it("should clear all items and itemsByRestaurant", () => {
      const stateWithItems = {
        ...initialState,
        items: [{ id: "1", name: "Item 1" } as MenuItem],
        itemsByRestaurant: {
          "rest-1": [{ id: "1", name: "Item 1" } as MenuItem],
        },
      };

      const action = clearItems();
      const newState = menuItemsReducer(stateWithItems, action);

      expect(newState.items).toEqual([]);
      expect(newState.itemsByRestaurant).toEqual({});
    });
  });

  describe("clearRestaurantItems reducer", () => {
    it("should remove items for specific restaurant", () => {
      const stateWithItems = {
        ...initialState,
        itemsByRestaurant: {
          "rest-1": [{ id: "1", name: "Item 1" } as MenuItem],
          "rest-2": [{ id: "2", name: "Item 2" } as MenuItem],
        },
      };

      const action = clearRestaurantItems("rest-1");
      const newState = menuItemsReducer(stateWithItems, action);

      expect(newState.itemsByRestaurant["rest-1"]).toBeUndefined();
      expect(newState.itemsByRestaurant["rest-2"]).toHaveLength(1);
    });
  });

  describe("setSelectedItem reducer", () => {
    it("should set selected item", () => {
      const item = { id: "1", name: "Selected Item" } as MenuItem;
      const action = setSelectedItem(item);
      const newState = menuItemsReducer(initialState, action);

      expect(newState.selectedItem).toEqual(item);
    });

    it("should clear selected item when null is passed", () => {
      const stateWithSelected = {
        ...initialState,
        selectedItem: { id: "1", name: "Item" } as MenuItem,
      };

      const action = setSelectedItem(null);
      const newState = menuItemsReducer(stateWithSelected, action);

      expect(newState.selectedItem).toBeNull();
    });
  });

  describe("clearError reducer", () => {
    it("should clear error state", () => {
      const stateWithError = {
        ...initialState,
        error: "Some error",
      };

      const action = clearError();
      const newState = menuItemsReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });
  });

  describe("fetchMenuItems async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: fetchMenuItems.pending.type };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should transform and store menu items when fulfilled", () => {
      const mockBackendItem = {
        item_id: "item-123",
        name: "Test Item",
        description: "Test Description",
        price: "299.99",
        image_url: "test-image.jpg",
        category_name: "Main Course",
        dietary_tags: ["vegetarian"],
        is_featured: true,
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-123",
          items: [mockBackendItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.items).toHaveLength(1);
      expect(newState.items[0].id).toBe("item-123");
      expect(newState.items[0].name).toBe("Test Item");
      expect(newState.items[0].price).toBe(299.99);
      expect(newState.items[0].isVegetarian).toBe(true);
      expect(newState.items[0].isPopular).toBe(true);
      expect(newState.itemsByRestaurant["rest-123"]).toHaveLength(1);
    });

    it("should handle menu item with object name and description", () => {
      const mockItem = {
        item_id: "item-obj",
        name: { en: "English Name", ur: "Urdu Name" },
        description: { en: "English Description" },
        price: "199",
        category_name: "Appetizer",
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].name).toBe("English Name");
      expect(newState.items[0].description).toBe("English Description");
    });

    it("should handle menu item with variants", () => {
      const mockItem = {
        item_id: "item-variants",
        name: "Item with Variants",
        price: "299",
        variants: [
          {
            variant_id: "var-1",
            name: "Size",
            options: [
              { option_id: "opt-1", name: "Small", price: "0" },
              { option_id: "opt-2", name: "Large", price: "50" },
            ],
            is_required: true,
            max_selection: 1,
          },
        ],
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].customizations).toHaveLength(1);
      expect(newState.items[0].customizations[0].id).toBe("var-1");
      expect(newState.items[0].customizations[0].options).toHaveLength(2);
      expect(newState.items[0].customizations[0].isRequired).toBe(true);
    });

    it("should handle menu item with addons", () => {
      const mockItem = {
        item_id: "item-addons",
        name: "Item with Addons",
        price: "199",
        addons: [
          { addon_id: "addon-1", name: "Extra Cheese", price: "30", is_available: true },
          { addon_id: "addon-2", name: "Extra Sauce", price: "20", is_available: false },
        ],
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].addons).toHaveLength(2);
      expect(newState.items[0].addons[0].isAvailable).toBe(true);
      expect(newState.items[0].addons[1].isAvailable).toBe(false);
    });

    it("should handle spicy item detection", () => {
      const mockItem = {
        item_id: "spicy-item",
        name: "Spicy Burger",
        price: "249",
        dietary_tags: ["spicy"],
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].isSpicy).toBe(true);
    });

    it("should handle originalPrice", () => {
      const mockItem = {
        item_id: "discounted",
        name: "Discounted Item",
        price: "199",
        original_price: "299",
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].originalPrice).toBe(299);
    });

    it("should handle menu_item_id as fallback for id", () => {
      const mockItem = {
        menu_item_id: "alt-id",
        name: "Item with Alt ID",
        price: "199",
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].id).toBe("alt-id");
    });

    it("should set error when rejected", () => {
      const action = {
        type: fetchMenuItems.rejected.type,
        error: { message: "Failed to fetch menu items" },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Failed to fetch menu items");
    });

    it("should handle empty items array", () => {
      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items).toHaveLength(0);
      expect(newState.itemsByRestaurant["rest-1"]).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing price gracefully", () => {
      const mockItem = {
        item_id: "no-price",
        name: "Item without Price",
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].price).toBe(0);
    });

    it("should handle missing image with placeholder", () => {
      const mockItem = {
        item_id: "no-image",
        name: "Item without Image",
        price: "199",
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].image).toBe("/placeholder-food.jpg");
    });

    it("should handle missing category with default", () => {
      const mockItem = {
        item_id: "no-category",
        name: "Item without Category",
        price: "199",
      };

      const action = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [mockItem],
        },
      };
      const newState = menuItemsReducer(initialState, action);

      expect(newState.items[0].category).toBe("Uncategorized");
    });

    it("should handle multiple restaurants items storage", () => {
      const action1 = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-1",
          items: [{ item_id: "item-1", name: "Item 1", price: "199" }],
        },
      };
      const state1 = menuItemsReducer(initialState, action1);

      const action2 = {
        type: fetchMenuItems.fulfilled.type,
        payload: {
          restaurantId: "rest-2",
          items: [{ item_id: "item-2", name: "Item 2", price: "299" }],
        },
      };
      const state2 = menuItemsReducer(state1, action2);

      expect(state2.itemsByRestaurant["rest-1"]).toHaveLength(1);
      expect(state2.itemsByRestaurant["rest-2"]).toHaveLength(1);
      expect(state2.items).toHaveLength(1); // Only last fetched items
    });
  });
});
