// ====== Common Types ======
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ====== Restaurant Types ======
export interface Restaurant {
  restaurant_id: string;
  name: string;
  description: Record<string, any>;
  founded_year: number | null;
  country: string;
  price_range: "budget" | "mid-range" | "premium";
  categories: string[];
  specialties: string[];
  keywords: string[];
  food_categories: string[];
  logo_url: string | null;
  status: "active" | "inactive" | "pending";
  owner_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RestaurantLocation {
  location_id: string;
  restaurant_id: string;
  city: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  operating_hours: Record<string, any>;
  delivery_zones: Record<string, any>;
  status: "open" | "closed" | "temporarily_closed";
  created_at: Date;
  updated_at: Date;
}

export interface RestaurantMetadata {
  metadata_id: string;
  restaurant_id: string;
  metadata_key: string;
  metadata_value: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ====== Menu Types ======
export interface MenuCategory {
  category_id: string;
  restaurant_id: string;
  name: string;
  parent_category_id: string | null;
  display_order: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMenuCategoryDto {
  restaurant_id: string;
  name: string;
  parent_category_id?: string | null;
  display_order?: number;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UpdateMenuCategoryDto {
  name?: string;
  parent_category_id?: string | null;
  display_order?: number;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface MenuItem {
  item_id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  currency: string;
  image_urls: string[];
  dietary_tags: string[];
  spice_level: "mild" | "medium" | "hot" | "extra-hot" | null;
  preparation_time: number | null;
  calories: number | null;
  ingredients: string[];
  allergens: string[];
  is_available: boolean;
  is_featured: boolean;
  display_order: number;
  customization_options: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface MenuItemVariant {
  variant_id: string;
  menu_item_id: string;
  variant_type: "size" | "add-on" | "modification";
  variant_name: string;
  price_adjustment: number;
  is_default: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface DealAndOffer {
  deal_id: string;
  restaurant_id: string | null;
  name: string;
  description: string;
  deal_type: "combo" | "discount" | "special_offer";
  discount_percentage: number | null;
  discount_fixed: number | null;
  items_included: string[];
  valid_from: Date;
  valid_to: Date;
  min_order_amount: number | null;
  max_uses_per_customer: number | null;
  is_active: boolean;
  image_url: string | null;
  terms: string | null;
  created_at: Date;
  updated_at: Date;
}

// ====== Embedding Types ======
export interface Embedding {
  embedding_id: string;
  source_type: "menu_item" | "deal" | "restaurant_description" | "category";
  source_id: string;
  restaurant_id: string;
  embedding_vector: number[];
  chunk_text: string;
  chunk_metadata: Record<string, any>;
  model_version: string;
  created_at: Date;
}

// ====== User Types ======
export interface User {
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: "customer" | "restaurant_owner" | "admin";
  preferred_language: "en" | "ur";
  favorite_restaurants: string[];
  dietary_preferences: string[];
  addresses: Record<string, any>[];
  created_at: Date;
  last_active_at: Date;
}

export interface CreateUserDto {
  email?: string | null;
  phone?: string | null;
  name: string;
  password?: string; // Plain password from request
  role?: "customer" | "restaurant_owner" | "admin";
  preferred_language: "en" | "ur";
  favorite_restaurants?: string[];
  dietary_preferences?: string[];
  addresses?: Record<string, any>[];
}

export interface UpdateUserDto {
  email?: string | null;
  phone?: string | null;
  name?: string;
  preferred_language?: "en" | "ur";
  favorite_restaurants?: string[];
  dietary_preferences?: string[];
  addresses?: Record<string, any>[];
  last_active_at?: Date;
}

// ====== Order Types (PostgreSQL) ======
export interface Order {
  order_id: string;
  user_id: string | null;
  restaurant_id: string;
  location_id: string;
  order_type: "voice" | "app" | "web" | "phone";
  order_status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  items: OrderItemData[];
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  delivery_address: string | null;
  phone: string;
  special_instructions: string | null;
  voice_transcript: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  variants_selected: Record<string, any>;
  special_instructions: string | null;
  subtotal: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemData {
  item_id: string;
  quantity: number;
  variants?: Record<string, any>;
  special_instructions?: string;
}

// ====== MongoDB Types (Order History, Logs, Audits) ======
export interface OrderHistory {
  _id?: string;
  order_id: string;
  user_id: string | null;
  restaurant_id: string;
  restaurant_name: string;
  order_data: Order;
  status_changes: OrderStatusChange[];
  created_at: Date;
  updated_at: Date;
}

export interface OrderStatusChange {
  status: string;
  changed_at: Date;
  changed_by?: string;
  notes?: string;
}

export interface AuditLog {
  _id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  changes: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface SystemLog {
  _id?: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: Record<string, any>;
  stack?: string;
  created_at: Date;
}

export interface UserInteraction {
  interaction_id: string;
  user_id: string | null;
  session_id: string;
  query_text: string;
  query_type: "menu_search" | "order" | "question" | "comparison";
  detected_restaurants: string[];
  response_text: string;
  response_language: "en" | "ur";
  restaurant_id: string | null;
  confidence_score: number;
  timestamp: Date;
}

// ====== Request/Response DTOs ======
export interface CreateRestaurantDto {
  owner_id?: string | null; // Optional - will be set from authenticated user if not provided
  name: string;
  description: Record<string, any>;
  founded_year?: number;
  country: string;
  price_range: "budget" | "mid-range" | "premium";
  categories: string[];
  specialties: string[];
  keywords: string[];
  food_categories: string[];
  logo_url?: string;
}

export interface CreateMenuItemDto {
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  currency?: string;
  image_urls?: string[];
  dietary_tags?: string[];
  spice_level?: "mild" | "medium" | "hot" | "extra-hot";
  preparation_time?: number;
  calories?: number;
  ingredients?: string[];
  allergens?: string[];
  is_available?: boolean;
  is_featured?: boolean;
  display_order?: number;
  customization_options?: Record<string, any>;
}

export interface CreateOrderDto {
  user_id?: string;
  restaurant_id: string;
  location_id: string;
  order_type: "voice" | "app" | "web" | "phone";
  items: OrderItemData[];
  delivery_address?: string;
  phone: string;
  special_instructions?: string;
  voice_transcript?: string;
}

export interface SearchQuery {
  query: string;
  restaurant_id?: string;
  category_id?: string;
  limit?: number;
  offset?: number;
}

export interface VectorSearchQuery {
  query: string;
  restaurant_id?: string;
  source_type?: "menu_item" | "deal" | "restaurant_description" | "category";
  limit?: number;
  similarity_threshold?: number;
}
