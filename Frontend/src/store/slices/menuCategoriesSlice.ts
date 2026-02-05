import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  displayOrder?: number;
}

interface MenuCategoriesState {
  categories: MenuCategory[];
  categoriesByRestaurant: Record<string, MenuCategory[]>;
  loading: boolean;
  error: string | null;
}

export const initialState: MenuCategoriesState = {
  categories: [],
  categoriesByRestaurant: {},
  loading: false,
  error: null,
};

// Transform backend category to frontend format
const transformCategory = (backendCategory: any, restaurantId: string): MenuCategory => {
  if (!backendCategory) {
    return {
      id: "unknown",
      name: "Uncategorized",
      restaurantId,
      displayOrder: 0,
    };
  }

  return {
    id: backendCategory.category_id || backendCategory.id,
    name: typeof backendCategory.name === 'object'
      ? backendCategory.name.en || JSON.stringify(backendCategory.name)
      : backendCategory.name || 'Uncategorized',
    description: typeof backendCategory.description === 'object'
      ? backendCategory.description.en || JSON.stringify(backendCategory.description)
      : backendCategory.description,
    restaurantId,
    displayOrder: backendCategory.display_order || backendCategory.order || 0,
  };
};

// Async thunk - Use dedicated categories endpoint
export const fetchMenuCategories = createAsyncThunk(
  'menuCategories/fetchByRestaurant',
  async (restaurantId: string) => {
    // Use dedicated categories endpoint
    const response = await apiService.getCategories(restaurantId, { is_active: true });
    if (response.success && response.data) {
      // Handle both array response and object with data property
      let categories: any[] = [];
      const data = response.data as any;
      if (Array.isArray(data)) {
        categories = data;
      } else if (data.data && Array.isArray(data.data)) {
        categories = data.data;
      } else if (Array.isArray(data.categories)) {
        categories = data.categories;
      }
      categories = categories.filter(Boolean);

      return { restaurantId, categories };
    }
    throw new Error(response.error || 'Failed to fetch menu categories');
  },
  {
    condition: (restaurantId: string, { getState }) => {
      const state = getState() as any;
      const categoriesState = state.menuCategories;
      
      // Don't dispatch if already loading
      if (categoriesState.loading) {
        return false;
      }
      
      // Don't dispatch if we already have categories for this restaurant
      if (categoriesState.categoriesByRestaurant[restaurantId]?.length > 0) {
        return false;
      }
      
      return true;
    },
  }
);

const menuCategoriesSlice = createSlice({
  name: 'menuCategories',
  initialState,
  reducers: {
    clearCategories: (state) => {
      state.categories = [];
      state.categoriesByRestaurant = {};
    },
    clearRestaurantCategories: (state, action: PayloadAction<string>) => {
      delete state.categoriesByRestaurant[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuCategories.fulfilled, (state, action) => {
        state.loading = false;
        const transformedCategories = action.payload.categories.map((cat: any) =>
          transformCategory(cat, action.payload.restaurantId)
        );
        state.categoriesByRestaurant[action.payload.restaurantId] = transformedCategories;
        state.categories = transformedCategories;
      })
      .addCase(fetchMenuCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch menu categories';
      });
  },
});

export const { clearCategories, clearRestaurantCategories, clearError } = menuCategoriesSlice.actions;
export default menuCategoriesSlice.reducer;

