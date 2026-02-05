import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/api";
import { MenuItem } from "../../types";

interface MenuItemsState {
  items: MenuItem[];
  itemsByRestaurant: Record<string, MenuItem[]>;
  selectedItem: MenuItem | null;
  loading: boolean;
  error: string | null;
}

export const initialState: MenuItemsState = {
  items: [],
  itemsByRestaurant: {},
  selectedItem: null,
  loading: false,
  error: null,
};

// Transform backend menu item to frontend format
const transformMenuItem = (backendItem: any): MenuItem => {
  if (!backendItem) {
    return {
      id: "unknown",
      name: "",
      description: "",
      price: 0,
      currency: "PKR",
      image: "/placeholder-food.jpg",
      category: "Uncategorized",
      categoryId: "uncategorized",
      isVegetarian: false,
      isSpicy: false,
      isPopular: false,
      customizations: [],
      addons: [],
    };
  }

  // Handle both backend field names (item_id, base_price) and frontend field names (id, price)
  const itemId = backendItem.item_id || backendItem.id || backendItem.menu_item_id || "unknown";
  const itemName = typeof backendItem.name === "object" ? backendItem.name.en || JSON.stringify(backendItem.name) : backendItem.name || "";
  const itemDescription = typeof backendItem.description === "object" ? backendItem.description.en || JSON.stringify(backendItem.description) : backendItem.description || "";
  // Backend uses base_price, frontend expects price
  const itemPrice = Number.parseFloat(backendItem.base_price ?? backendItem.price ?? "0") || 0;
  // Get currency from database (defaults to PKR)
  const currency = backendItem.currency || "PKR";

  // Store both category_id and category_name for proper filtering
  const categoryId = backendItem.category_id || "uncategorized";
  const categoryName = backendItem.category_name || "Uncategorized";

  return {
    id: itemId,
    name: itemName,
    description: itemDescription,
    price: itemPrice,
    currency: currency,
    originalPrice: backendItem.original_price ? parseFloat(backendItem.original_price) : undefined,
    image: backendItem.image_urls?.[0] || backendItem.image_url || backendItem.image || "/placeholder-food.jpg",
    category: categoryName, // Use name for display
    categoryId: categoryId, // Store ID separately for filtering
    isVegetarian: (backendItem.dietary_tags && Array.isArray(backendItem.dietary_tags) && backendItem.dietary_tags.includes("vegetarian")) || (backendItem.dietary_tags && typeof backendItem.dietary_tags === "string" && backendItem.dietary_tags.includes("vegetarian")) || false,
    isSpicy: (backendItem.dietary_tags && Array.isArray(backendItem.dietary_tags) && backendItem.dietary_tags.includes("spicy")) || (backendItem.dietary_tags && typeof backendItem.dietary_tags === "string" && backendItem.dietary_tags.includes("spicy")) || (itemName && itemName.toLowerCase().includes("spicy")) || false,
    isPopular: backendItem.is_popular || backendItem.is_featured || false,
    customizations:
      backendItem.variants?.map((variant: any) => ({
        id: variant.variant_id,
        name: variant.name,
        options:
          variant.options?.map((opt: any) => ({
            id: opt.option_id,
            name: opt.name,
            price: parseFloat(opt.price) || 0,
          })) || [],
        isRequired: variant.is_required || false,
        maxSelection: variant.max_selection || 1,
      })) || [],
    addons:
      backendItem.addons?.map((addon: any) => ({
        id: addon.addon_id,
        name: addon.name,
        price: parseFloat(addon.price) || 0,
        isAvailable: addon.is_available !== false,
      })) || [],
  };
};

// Async thunks
export const fetchMenuItems = createAsyncThunk(
  "menuItems/fetchByRestaurant",
  async (params: { restaurantId: string; category_id?: string; is_available?: boolean; search?: string }, { getState }) => {
    // Check if already fetched for this restaurant (skip if so, unless filtering)
    const state = getState() as any;
    const menuItemsState = state.menuItems;

    // Skip if already have items for this restaurant (unless filtering)
    if (!params.category_id && !params.search && menuItemsState.itemsByRestaurant[params.restaurantId]?.length > 0) {
      return {
        restaurantId: params.restaurantId,
        items: menuItemsState.itemsByRestaurant[params.restaurantId],
      };
    }

    const response = await apiService.getMenuItems(params.restaurantId, {
      category_id: params.category_id,
      is_available: params.is_available,
      search: params.search,
    });
    if (response.success && response.data) {
      // Handle both array response and object with items property
      let items: any[] = [];
      const data = response.data as any;
      if (Array.isArray(data)) {
        items = data;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.data?.items && Array.isArray(data.data.items)) {
        items = data.data.items;
      } else if (data.menu_items && Array.isArray(data.menu_items)) {
        items = data.menu_items;
      } else if (data.data?.menu_items && Array.isArray(data.data.menu_items)) {
        items = data.data.menu_items;
      }
      return { restaurantId: params.restaurantId, items };
    }
    throw new Error(response.error || "Failed to fetch menu items");
  },
  {
    condition: (params: { restaurantId: string; category_id?: string; is_available?: boolean; search?: string }, { getState }) => {
      const state = getState() as any;
      const menuItemsState = state.menuItems;

      // Don't dispatch if already loading
      if (menuItemsState.loading) {
        return false;
      }

      // Don't dispatch if we already have items for this restaurant (unless filtering)
      if (!params.category_id && !params.search && menuItemsState.itemsByRestaurant[params.restaurantId]?.length > 0) {
        return false;
      }

      return true;
    },
  }
);

const menuItemsSlice = createSlice({
  name: "menuItems",
  initialState,
  reducers: {
    clearItems: (state) => {
      state.items = [];
      state.itemsByRestaurant = {};
    },
    clearRestaurantItems: (state, action: PayloadAction<string>) => {
      delete state.itemsByRestaurant[action.payload];
    },
    setSelectedItem: (state, action: PayloadAction<MenuItem | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.loading = false;
        const transformedItems = (action.payload.items || []).filter(Boolean).map(transformMenuItem);
        state.itemsByRestaurant[action.payload.restaurantId] = transformedItems;
        // Also update main items array
        state.items = transformedItems;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch menu items";
      });
  },
});

export const { clearItems, clearRestaurantItems, setSelectedItem, clearError } = menuItemsSlice.actions;
export default menuItemsSlice.reducer;
