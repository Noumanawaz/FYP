import { configureStore } from '@reduxjs/toolkit';
import restaurantsReducer from './slices/restaurantsSlice';
import menuItemsReducer from './slices/menuItemsSlice';
import menuCategoriesReducer from './slices/menuCategoriesSlice';
import usersReducer from './slices/usersSlice';

export const store = configureStore({
  reducer: {
    restaurants: restaurantsReducer,
    menuItems: menuItemsReducer,
    menuCategories: menuCategoriesReducer,
    users: usersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

