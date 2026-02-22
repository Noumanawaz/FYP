// Use getEnvVar helper to support both Vite and Jest environments
import { getEnvVar } from '../utils/env';

const API_BASE_URL = getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000/api/v1');

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: any;
}

export class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private storedRefreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load tokens from localStorage on initialization
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("access_token");
      this.storedRefreshToken = localStorage.getItem("refresh_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
  }

  setRefreshToken(refreshToken: string | null) {
    this.storedRefreshToken = refreshToken;
    if (refreshToken && typeof window !== "undefined") {
      localStorage.setItem("refresh_token", refreshToken);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("refresh_token");
    }
  }

  getToken(): string | null {
    // Always get fresh token from localStorage in case it was updated elsewhere
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("access_token");
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      this.storedRefreshToken = localStorage.getItem("refresh_token");
    }
    return this.storedRefreshToken;
  }

  clearTokens() {
    this.token = null;
    this.storedRefreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, skipAuth: boolean = false): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Only set JSON content type when we have a plain body (not FormData)
    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Get fresh token and add Authorization header (unless skipAuth is true for auth endpoints)
    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      // Add timeout to fetch request (increased to 15 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If token expired, try to refresh it (but not for auth endpoints)
      if (response.status === 401 && !skipAuth && endpoint !== "/auth/refresh" && endpoint !== "/auth/login" && endpoint !== "/auth/verify") {
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry the original request with new token
          const newToken = this.getToken();
          if (newToken) {
            headers["Authorization"] = `Bearer ${newToken}`;
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              signal: retryController.signal,
            });
            clearTimeout(retryTimeoutId);
            const retryData: ApiResponse<T> = await this.parseJsonSafely<T>(retryResponse);
            if (!retryResponse.ok) {
              throw new Error(retryData.error || "Request failed");
            }
            return retryData;
          }
        } else {
          // Refresh failed, clear tokens and throw error
          this.clearTokens();
          throw new Error("Session expired. Please login again.");
        }
      }

      // Parse JSON response (or tolerate empty bodies)
      const data: ApiResponse<T> = await this.parseJsonSafely<T>(response);

      if (!response.ok) {
        let errorMessage = "Request failed";
        if (data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return data;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - API server may be unreachable");
      }
      // Normalize unknown errors
      const message = error?.message || error?.toString() || "Network error";
      throw new Error(message);
    }
  }

  private async parseJsonSafely<T>(response: Response): Promise<ApiResponse<T>> {
    // Return empty success for 204/205
    if (response.status === 204 || response.status === 205) {
      return { success: response.ok };
    }

    try {
      return (await response.json()) as ApiResponse<T>;
    } catch {
      if (!response.ok) {
        // Try to surface status if parsing failed
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      throw new Error("Invalid response from server");
    }
  }

  private async attemptTokenRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await this.refreshToken(refreshToken);
      if (response.success && response.data?.access_token) {
        this.setToken(response.data.access_token);
        return true;
      }
    } catch (error) {
      // Refresh failed, clear all tokens
      this.clearTokens();
    }
    return false;
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async patch<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Auth endpoints (skipAuth = true to avoid sending expired token)
  async login(email?: string, phone?: string, password?: string, user_id?: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user: {
        user_id: string;
        name: string;
        email?: string;
        phone?: string;
        role: string;
      };
    }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, phone, password, user_id }),
      },
      true
    );
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ access_token: string }>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      true
    );
  }

  async verifyToken(token: string) {
    return this.request<{ valid: boolean; user_id?: string; role?: string }>(
      "/auth/verify",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      true
    );
  }

  // User endpoints
  async createUser(userData: {
    name: string;
    email?: string;
    phone?: string;
    password?: string;
    preferred_language: "en" | "ur";
    role?: "customer" | "restaurant_owner";
    dietary_preferences?: string[];
    addresses?: Array<{
      street: string;
      city: string;
      province: string;
      postal_code: string;
      country: string;
      is_default: boolean;
    }>;
  }) {
    return this.request<{
      user_id: string;
      name: string;
      email?: string;
      phone?: string;
      role: string;
    }>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getAllUsers(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request<any[]>(`/users${query ? `?${query}` : ""}`);
  }

  async getUser(userId: string) {
    return this.request<{
      user_id: string;
      name: string;
      email?: string;
      phone?: string;
      role: string;
    }>(`/users/${userId}`);
  }

  async updateUser(userId: string, userData: any) {
    return this.request(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  // Restaurant endpoints
  async getRestaurants(params?: { page?: number; limit?: number; status?: string; price_range?: string; categories?: string[]; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => queryParams.append(key, v));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/restaurants${query ? `?${query}` : ""}`);
  }

  async getRestaurant(restaurantId: string) {
    return this.request(`/restaurants/${restaurantId}`);
  }

  async searchRestaurants(keyword: string) {
    return this.request(`/restaurants/search?keyword=${encodeURIComponent(keyword)}`);
  }

  async getNearbyRestaurants(lat: number, lng: number, radius?: number) {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });
    if (radius) {
      params.append("radius", radius.toString());
    }
    return this.request(`/restaurants/nearby?${params.toString()}`);
  }

  async checkDeliveryZone(restaurantId: string, lat: number, lng: number) {
    return this.request(`/restaurants/${restaurantId}/delivery-check?lat=${lat}&lng=${lng}`);
  }

  async getMyRestaurant() {
    return this.request("/restaurants/my/restaurant");
  }

  async createRestaurant(restaurantData: {
    name: string;
    description?: Record<string, any>;
    country: string;
    price_range: "budget" | "mid-range" | "premium";
    categories: string[];
    specialties: string[];
    keywords: string[];
    food_categories: string[];
    logo_url?: string;
    founded_year?: number;
  }) {
    return this.request("/restaurants", {
      method: "POST",
      body: JSON.stringify(restaurantData),
    });
  }

  async updateRestaurant(restaurantId: string, restaurantData: any) {
    return this.request(`/restaurants/${restaurantId}`, {
      method: "PUT",
      body: JSON.stringify(restaurantData),
    });
  }

  async deleteRestaurant(restaurantId: string) {
    return this.request(`/restaurants/${restaurantId}`, {
      method: "DELETE",
    });
  }

  async getRestaurantLocations(restaurantId: string) {
    return this.request(`/restaurants/${restaurantId}/locations`);
  }

  async addRestaurantLocation(restaurantId: string, locationData: {
    city: string;
    area: string;
    address: string;
    phone?: string;
    lat?: number;
    lng?: number;
    operating_hours?: Record<string, any>;
    delivery_zones?: Record<string, any>;
    status?: string;
  }) {
    return this.request(`/restaurants/${restaurantId}/locations`, {
      method: "POST",
      body: JSON.stringify(locationData),
    });
  }

  // Menu endpoints
  async getMenuItems(
    restaurantId: string,
    params?: {
      category_id?: string;
      is_available?: boolean;
      search?: string;
    }
  ) {
    // Dedicated restaurant menu endpoint with optional filters
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/menu/restaurant/${restaurantId}${query ? `?${query}` : ""}`);
  }

  async createCategory(categoryData: {
    restaurant_id: string;
    name: string;
    description?: string;
    image_url?: string;
    parent_category_id?: string;
    is_active?: boolean;
  }) {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(categoryId: string, categoryData: any) {
    return this.request(`/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify(categoryData),
    });
  }

  async createMenuItem(menuItemData: {
    restaurant_id: string;
    category_id: string;
    name: string;
    description: string;
    base_price: number;
    currency?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    spice_level?: 'mild' | 'medium' | 'hot' | 'extra-hot';
    preparation_time?: number;
    calories?: number;
    ingredients?: string[];
    allergens?: string[];
    is_available?: boolean;
    is_featured?: boolean;
  }) {
    return this.request("/menu", {
      method: "POST",
      body: JSON.stringify(menuItemData),
    });
  }

  async updateMenuItem(itemId: string, menuItemData: any) {
    return this.request(`/menu/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(menuItemData),
    });
  }

  async deleteMenuItem(itemId: string) {
    return this.request(`/menu/${itemId}`, {
      method: "DELETE",
    });
  }

  // Image upload endpoints
  async uploadImage(formData: FormData) {
    const token = this.getToken();
    const url = `${this.baseURL}/images/upload`;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData, browser will set it with boundary

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed");
      }

      return data;
    } catch (error: any) {
      if (error.message) {
        throw error;
      }
      throw new Error(error.toString() || "Network error");
    }
  }

  async uploadImages(formData: FormData) {
    const token = this.getToken();
    const url = `${this.baseURL}/images/upload/multiple`;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed");
      }

      return data;
    } catch (error: any) {
      if (error.message) {
        throw error;
      }
      throw new Error(error.toString() || "Network error");
    }
  }

  // Order endpoints
  async createOrder(orderData: {
    restaurant_id: string;
    location_id: string;
    order_type: "voice" | "app" | "web" | "phone";
    items: Array<{
      item_id: string;
      quantity: number;
      variants?: any;
      special_instructions?: string;
    }>;
    delivery_address?: string;
    phone: string;
    special_instructions?: string;
    voice_transcript?: string;
  }) {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  async getMyOrders(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/orders/my-orders${query ? `?${query}` : ""}`);
  }

  async getOrders(params?: { page?: number; limit?: number }) {
    // Use history endpoint for order history
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/orders/history${query ? `?${query}` : ""}`);
  }

  async getOrder(orderId: string) {
    return this.request(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async getRestaurantOrders(restaurantId: string, params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/orders/restaurant/${restaurantId}/history${query ? `?${query}` : ""}`);
  }

  async getOrderItems(orderId: string) {
    return this.request(`/orders/${orderId}/items`);
  }
}

export const apiService = new ApiService(API_BASE_URL);
