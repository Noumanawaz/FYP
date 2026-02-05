import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { User } from '../../types';

interface UsersState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export const initialState: UsersState = {
  currentUser: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Transform backend user to frontend format
const transformUser = (backendUser: any): User => {
  return {
    id: backendUser.user_id,
    email: backendUser.email || '',
    name: backendUser.name,
    phone: backendUser.phone || '',
    role: (backendUser.role as User['role']) || 'customer',
    avatar: undefined,
    isVerified: true,
    addresses: (backendUser.addresses || []).map((addr: any) => ({
      id: addr.id || `${addr.street}-${addr.city}`,
      type: 'home' as const,
      label: addr.label || 'Home',
      address: `${addr.street}, ${addr.city}`,
      city: addr.city,
      coordinates: {
        lat: addr.lat || 0,
        lng: addr.lng || 0,
      },
      isDefault: addr.is_default || false,
    })),
    paymentMethods: [],
    createdAt: new Date(backendUser.created_at || Date.now()),
  };
};

// Async thunks
export const fetchCurrentUser = createAsyncThunk(
  'users/fetchCurrent',
  async (userId: string) => {
    const response = await apiService.getUser(userId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to fetch user');
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async (params: { userId: string; userData: Partial<User> }) => {
    const response = await apiService.updateUser(params.userId, params.userData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update user');
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = transformUser(action.payload);
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user';
        state.isAuthenticated = false;
      })
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = transformUser(action.payload);
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update user';
      });
  },
});

export const { setUser, clearUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;

