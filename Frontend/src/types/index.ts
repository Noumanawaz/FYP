// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'restaurant_owner' | 'admin';
  avatar?: string;
  isVerified: boolean;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  createdAt: Date;
}

export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  label: string;
  address: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'upi' | 'cod';
  label: string;
  details: string;
  isDefault: boolean;
}

// Restaurant Types
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  coverImage?: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  cuisines: string[];
  isOpen: boolean;
  isVegetarian: boolean;
  isPremium: boolean;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  menu: MenuItem[];
  openingHours: OpeningHours;
  promo?: Promo;
  distance?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string; // Currency code (e.g., "PKR", "USD")
  originalPrice?: number;
  image?: string;
  category: string; // Category name for display
  categoryId?: string; // Category ID for filtering
  isVegetarian: boolean;
  isSpicy: boolean;
  isPopular: boolean;
  customizations?: Customization[];
  addons?: Addon[];
}

export interface Customization {
  id: string;
  name: string;
  options: CustomizationOption[];
  isRequired: boolean;
  maxSelection: number;
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface OpeningHours {
  monday: { open: string; close: string; isClosed: boolean };
  tuesday: { open: string; close: string; isClosed: boolean };
  wednesday: { open: string; close: string; isClosed: boolean };
  thursday: { open: string; close: string; isClosed: boolean };
  friday: { open: string; close: string; isClosed: boolean };
  saturday: { open: string; close: string; isClosed: boolean };
  sunday: { open: string; close: string; isClosed: boolean };
}

// Order Types
export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  restaurant: Restaurant;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: Address;
  specialInstructions?: string;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
  deliveryPartner?: DeliveryPartner;
  tracking?: OrderTracking;
}

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  price: number;
  customizations: CustomizationOption[];
  addons: Addon[];
  specialInstructions?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderTracking {
  estimatedDeliveryTime: Date;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  updates: TrackingUpdate[];
}

export interface TrackingUpdate {
  id: string;
  status: OrderStatus;
  timestamp: Date;
  message: string;
  location?: {
    lat: number;
    lng: number;
  };
}

// Delivery Partner Types
export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  rating: number;
  deliveryCount: number;
  isOnline: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  vehicle: {
    type: 'bike' | 'car' | 'bicycle';
    number: string;
  };
}

// Promo Types
export interface Promo {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  minimumOrder: number;
  validUntil: Date;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
}

// Cart Types
export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: CustomizationOption[];
  addons: Addon[];
  specialInstructions?: string;
  price: number;
  restaurantId?: string;
}

export interface Cart {
  items: CartItem[];
  restaurantId: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  appliedPromo?: Promo;
}

// Grocery Types (PandaMart)
export interface GroceryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory: string;
  unit: string;
  isInStock: boolean;
  brand: string;
  discount?: number;
}

export interface GroceryCategory {
  id: string;
  name: string;
  image: string;
  subcategories: GrocerySubcategory[];
}

export interface GrocerySubcategory {
  id: string;
  name: string;
  image: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// Filter Types
export interface RestaurantFilter {
  cuisine?: string[];
  rating?: number;
  deliveryTime?: number;
  priceRange?: 'low' | 'medium' | 'high';
  isVegetarian?: boolean;
  isOpen?: boolean;
  sortBy?: 'rating' | 'delivery_time' | 'distance' | 'popularity' | 'price_low_to_high' | 'price_high_to_low';
}

// Search Types
export interface SearchResult {
  restaurants: Restaurant[];
  dishes: MenuItem[];
  categories: string[];
}