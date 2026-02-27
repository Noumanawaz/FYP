import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, Cart, Order, Restaurant, Notification, Address, CartItem } from '../types';
import { apiService } from '../services/api';
import { geoapifyService } from '../services/geoapifyService';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  cart: Cart;
  orders: Order[];
  notifications: Notification[];
  currentLocation: { lat: number; lng: number } | null;
  selectedAddress: Address | null;
  restaurants: Restaurant[];
  isLoading: boolean;
  isVerifyingAuth: boolean; // Track if we're verifying authentication
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGOUT' }
  | { type: 'SET_CART'; payload: Cart }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'UPDATE_CART_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_LOCATION'; payload: { lat: number; lng: number } }
  | { type: 'SET_ADDRESS'; payload: Address }
  | { type: 'SET_RESTAURANTS'; payload: Restaurant[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VERIFYING_AUTH'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  cart: {
    items: [],
    restaurantId: '',
    subtotal: 0,
    deliveryFee: 0,
    tax: 0,
    discount: 0,
    total: 0,
  },
  orders: [],
  notifications: [],
  currentLocation: null,
  selectedAddress: null,
  restaurants: [],
  isLoading: false,
  isVerifyingAuth: true, // Start as true, will be set to false after verification
  error: null,
};

function calculateCartTotals(items: CartItem[]): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.08; // 8% tax
  const deliveryFee = 35; // Fixed delivery fee
  const total = subtotal + tax + deliveryFee;

  return { subtotal, tax, total };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    case 'LOGOUT':
      // Clear tokens from storage
      apiService.clearTokens();
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        cart: initialState.cart,
      };
    case 'SET_CART':
      return {
        ...state,
        cart: action.payload,
      };
    case 'ADD_TO_CART': {
      // Check if the same menu item already exists in the cart (same menuItem.id, customizations, and addons)
      const existingItemIndex = state.cart.items.findIndex(
        (item) =>
          item.menuItem.id === action.payload.menuItem.id &&
          JSON.stringify(item.customizations) === JSON.stringify(action.payload.customizations) &&
          JSON.stringify(item.addons) === JSON.stringify(action.payload.addons) &&
          item.specialInstructions === action.payload.specialInstructions
      );

      let newItems: CartItem[];

      if (existingItemIndex !== -1) {
        // Item already exists, increment quantity
        newItems = state.cart.items.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + action.payload.quantity;
            return {
              ...item,
              quantity: newQuantity,
              price: item.menuItem.price * newQuantity,
            };
          }
          return item;
        });
      } else {
        // New item, add to cart
        newItems = [...state.cart.items, action.payload];
      }

      const { subtotal, tax, total } = calculateCartTotals(newItems);

      return {
        ...state,
        cart: {
          ...state.cart,
          items: newItems,
          subtotal,
          tax,
          total,
        },
      };
    }
    case 'UPDATE_CART_ITEM': {
      const updatedItems = state.cart.items.map(item =>
        item.id === action.payload.itemId
          ? { ...item, quantity: action.payload.quantity, price: item.menuItem.price * action.payload.quantity }
          : item
      );
      const { subtotal, tax, total } = calculateCartTotals(updatedItems);

      return {
        ...state,
        cart: {
          ...state.cart,
          items: updatedItems,
          subtotal,
          tax,
          total,
        },
      };
    }
    case 'REMOVE_FROM_CART': {
      const filteredItems = state.cart.items.filter(item => item.id !== action.payload);
      const { subtotal, tax, total } = calculateCartTotals(filteredItems);

      return {
        ...state,
        cart: {
          ...state.cart,
          items: filteredItems,
          subtotal,
          tax,
          total,
        },
      };
    }
    case 'CLEAR_CART':
      return {
        ...state,
        cart: initialState.cart,
      };
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
      };
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id
            ? { ...order, ...action.payload.updates }
            : order
        ),
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, isRead: true }
            : notification
        ),
      };
    case 'SET_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
      };
    case 'SET_ADDRESS':
      return {
        ...state,
        selectedAddress: action.payload,
      };
    case 'SET_RESTAURANTS':
      return {
        ...state,
        restaurants: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_VERIFYING_AUTH':
      return {
        ...state,
        isVerifyingAuth: action.payload,
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Helper function to convert backend addresses to frontend format
const convertBackendAddresses = (backendAddresses: any[]): Address[] => {
  if (!backendAddresses || !Array.isArray(backendAddresses)) {
    return [];
  }
  return backendAddresses.map((addr: any, idx: number) => ({
    id: addr.id || `addr-${idx}`,
    type: (addr.type || 'home') as 'home' | 'work' | 'other',
    label: addr.label || addr.street || 'Address',
    address: addr.address || `${addr.street || ''}, ${addr.area || ''}, ${addr.city || ''}`.replace(/^,\s*|,\s*$/g, ''),
    city: addr.city || '',
    coordinates: {
      lat: addr.lat || addr.coordinates?.lat || 0,
      lng: addr.lng || addr.coordinates?.lng || 0,
    },
    isDefault: addr.is_default || false,
  }));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const hasInitialized = React.useRef(false);

  useEffect(() => {
    // Prevent strict mode double-firing
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialize app data
    const initializeApp = async () => {
      try {
        // Check for existing token and restore user session
        const token = apiService.getToken();
        if (token) {
          try {
            const response = await apiService.verifyToken(token);
            if (response.success && response.data?.valid && response.data?.user_id) {
              // Token is valid, fetch user data from database to get actual role
              const userResponse = await apiService.getUser(response.data.user_id);
              if (userResponse.success && userResponse.data) {
                const userData = userResponse.data as any;
                dispatch({
                  type: 'SET_USER',
                  payload: {
                    id: userData.user_id,
                    email: userData.email || '',
                    phone: userData.phone || '',
                    name: userData.name,
                    role: userData.role as 'customer' | 'restaurant_owner' | 'admin',
                    isVerified: true,
                    addresses: convertBackendAddresses(userData.addresses),
                    paymentMethods: [],
                    createdAt: new Date(userData.created_at || Date.now()),
                  },
                });
                // Mark verification as complete
                dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
                return; // Exit early on success
              }
            } else {
              // Token invalid, try to refresh
              const refreshToken = apiService.getRefreshToken();
              if (refreshToken) {
                try {
                  const refreshResponse = await apiService.refreshToken(refreshToken);
                  if (refreshResponse.success && refreshResponse.data?.access_token) {
                    apiService.setToken(refreshResponse.data.access_token);
                    // Retry verification with new token
                    const newToken = apiService.getToken();
                    if (newToken) {
                      const verifyResponse = await apiService.verifyToken(newToken);
                      if (verifyResponse.success && verifyResponse.data?.valid && verifyResponse.data?.user_id) {
                        const userResponse = await apiService.getUser(verifyResponse.data.user_id);
                        if (userResponse.success && userResponse.data) {
                          const userData = userResponse.data as any;
                          dispatch({
                            type: 'SET_USER',
                            payload: {
                              id: userData.user_id,
                              email: userData.email || '',
                              phone: userData.phone || '',
                              name: userData.name,
                              role: userData.role as any,
                              isVerified: true,
                              addresses: convertBackendAddresses(userData.addresses),
                              paymentMethods: [],
                              createdAt: new Date(userData.created_at || Date.now()),
                            },
                          });
                          dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
                          return; // Exit early on success
                        }
                      }
                    }
                  }
                } catch (refreshError) {
                  // Refresh failed, clear all tokens
                  apiService.clearTokens();
                  dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
                }
              } else {
                // No refresh token, clear access token
                apiService.setToken(null);
                dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
              }
            }
          } catch (error) {
            // Token verification failed, try refresh token
            const refreshToken = apiService.getRefreshToken();
            if (refreshToken) {
              try {
                const refreshResponse = await apiService.refreshToken(refreshToken);
                if (refreshResponse.success && refreshResponse.data?.access_token) {
                  apiService.setToken(refreshResponse.data.access_token);
                  // Retry verification with new token
                  const newToken = apiService.getToken();
                  if (newToken) {
                    const verifyResponse = await apiService.verifyToken(newToken);
                    if (verifyResponse.success && verifyResponse.data?.valid && verifyResponse.data?.user_id) {
                      const userResponse = await apiService.getUser(verifyResponse.data.user_id);
                      if (userResponse.success && userResponse.data) {
                        const userData = userResponse.data as any;
                        dispatch({
                          type: 'SET_USER',
                          payload: {
                            id: userData.user_id,
                            email: userData.email || '',
                            phone: userData.phone || '',
                            name: userData.name,
                            role: userData.role as any,
                            isVerified: true,
                            addresses: convertBackendAddresses(userData.addresses),
                            paymentMethods: [],
                            createdAt: new Date(userData.created_at || Date.now()),
                          },
                        });
                        dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
                        return; // Exit early on success
                      }
                    }
                  }
                }
              } catch (refreshError) {
                // Refresh failed, clear all tokens
                apiService.clearTokens();
                dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
              }
            } else {
              // No refresh token, clear access token
              apiService.setToken(null);
              dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
            }
          }
        } else {
          // No token found, user is not authenticated
          dispatch({ type: 'SET_VERIFYING_AUTH', payload: false });
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    const initializeLocation = async () => {
      // Get user location (optional - don't fail if unavailable)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              dispatch({
                type: 'SET_LOCATION',
                payload: { lat, lng },
              });
              
              try {
                // Automatically set a meaningful address for the dashboard
                const addressText = await geoapifyService.reverseGeocode(lat, lng);
                if (addressText) {
                  const parts = addressText.split(',');
                  // Address Line 1 or building name is usually the first part
                  const shortName = parts[0]?.trim() || "Current Location";
                  const city = parts[parts.length - 1]?.trim() || "Unknown";
                  const address: Address = {
                    id: `curr-${Date.now()}`,
                    type: "other",
                    label: shortName, // Meaningful building name or street
                    address: addressText,
                    city: city,
                    coordinates: { lat, lng },
                    isDefault: false,
                  };
                  dispatch({ type: 'SET_ADDRESS', payload: address });
                } else {
                  throw new Error("Empty address");
                }
              } catch (error) {
                console.error('Auto reverse geocoding failed', error);
                const address: Address = {
                  id: `curr-${Date.now()}`,
                  type: "other",
                  label: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, // Fallback directly to coordinates
                  address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                  city: "Unknown",
                  coordinates: { lat, lng },
                  isDefault: false,
                };
                dispatch({ type: 'SET_ADDRESS', payload: address });
              }
            },
            async (error) => {
              // Silently fall back to default location (Islamabad - where test restaurant is)
              // Only log if it's a permission issue (user might want to know)
              if (error.code === error.PERMISSION_DENIED) {
                console.warn('Location access denied. Using default location.');
              }
              // Default to Islamabad (where test restaurant is located)
              const defaultLat = 33.6844;
              const defaultLng = 73.0479;
              dispatch({
                type: 'SET_LOCATION',
                payload: { lat: defaultLat, lng: defaultLng }, // Islamabad, Pakistan
              });
              
              try {
                const addressText = await geoapifyService.reverseGeocode(defaultLat, defaultLng);
                if (addressText) {
                  const parts = addressText.split(',');
                  const shortName = parts[0]?.trim() || "Islamabad Center";
                  const city = parts[parts.length - 1]?.trim() || "Islamabad";
                  const address: Address = {
                    id: `curr-${Date.now()}`,
                    type: "other",
                    label: shortName, 
                    address: addressText,
                    city: city,
                    coordinates: { lat: defaultLat, lng: defaultLng },
                    isDefault: false,
                  };
                  dispatch({ type: 'SET_ADDRESS', payload: address });
                } else {
                   throw new Error("Empty address");
                }
              } catch (e) {
                console.error("Auto reverse geocoding default failed", e);
                const address: Address = {
                  id: `curr-${Date.now()}`,
                  type: "other",
                  label: `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`, 
                  address: `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`,
                  city: "Unknown",
                  coordinates: { lat: defaultLat, lng: defaultLng },
                  isDefault: false,
                };
                dispatch({ type: 'SET_ADDRESS', payload: address });
              }
            },
            {
              enableHighAccuracy: false, // Don't require high accuracy
              timeout: 5000, // Shorter timeout
              maximumAge: 60000, // Accept cached location up to 1 minute old
            }
          );
        } else {
          // Browser doesn't support geolocation - use default
          const defaultLat = 33.6844;
          const defaultLng = 73.0479;
          dispatch({
            type: 'SET_LOCATION',
            payload: { lat: defaultLat, lng: defaultLng }, // Islamabad, Pakistan
          });
          
          try {
            const addressText = await geoapifyService.reverseGeocode(defaultLat, defaultLng);
            if (addressText) {
              const parts = addressText.split(',');
              const shortName = parts[0]?.trim() || "Islamabad Center";
              const city = parts[parts.length - 1]?.trim() || "Islamabad";
              const address: Address = {
                id: `curr-${Date.now()}`,
                type: "other",
                label: shortName, 
                address: addressText,
                city: city,
                coordinates: { lat: defaultLat, lng: defaultLng },
                isDefault: false,
              };
              dispatch({ type: 'SET_ADDRESS', payload: address });
            } else {
               throw new Error("Empty address");
            }
          } catch (e) {
             console.error("Auto reverse geocoding default failed", e);
             const address: Address = {
                id: `curr-${Date.now()}`,
                type: "other",
                label: `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`, 
                address: `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`,
                city: "Unknown",
                coordinates: { lat: defaultLat, lng: defaultLng },
                isDefault: false,
             };
             dispatch({ type: 'SET_ADDRESS', payload: address });
          }
        }
    };

    initializeApp();
    initializeLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};