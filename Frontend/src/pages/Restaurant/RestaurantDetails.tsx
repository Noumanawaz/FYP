import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Clock, Truck, MapPin, Phone, Info, Plus, Minus, ShoppingCart, Heart, Share2, ChevronLeft, Search, Filter, Leaf, Flame, Award, Navigation } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchRestaurantById } from "../../store/slices/restaurantsSlice";
import { fetchMenuItems } from "../../store/slices/menuItemsSlice";
import { fetchMenuCategories } from "../../store/slices/menuCategoriesSlice";
import { Restaurant, MenuItem, CartItem } from "../../types";
import { calculateDistance } from "../../utils/distance";
import Button from "../../components/Common/Button";
import LoadingSpinner from "../../components/Common/LoadingSpinner";

const RestaurantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch: contextDispatch } = useApp();
  const reduxDispatch = useAppDispatch();
  const { selectedRestaurant, loading: restaurantLoading, error: restaurantError } = useAppSelector((state) => state.restaurants);
  const { itemsByRestaurant, loading: menuLoading, error: menuError } = useAppSelector((state) => state.menuItems);
  const { categoriesByRestaurant } = useAppSelector((state) => state.menuCategories);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<{ [key: string]: number }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vegetarian: false,
    spicy: false,
    popular: false,
  });

  const userLocation = state.currentLocation || state.selectedAddress?.coordinates || { lat: 33.6844, lng: 73.0479 };

  // Track last fetched restaurant ID to prevent duplicate calls
  const lastFetchedId = useRef<string | null>(null);
  const { loading: categoriesLoading } = useAppSelector((state) => state.menuCategories);

  // Fetch restaurant and menu data
  useEffect(() => {
    // Skip if no ID
    if (!id) {
      return;
    }

    // Skip if already loading
    if (restaurantLoading || menuLoading || categoriesLoading) {
      return;
    }

    // Skip if same ID was just fetched
    if (lastFetchedId.current === id) {
      return;
    }

    // Check if we already have the data
    const hasRestaurant = selectedRestaurant?.id === id;
    const hasMenuItems = itemsByRestaurant[id]?.length > 0;
    const hasCategories = categoriesByRestaurant[id]?.length > 0;

    // Only fetch what's missing
    if (!hasRestaurant) {
      reduxDispatch(fetchRestaurantById(id));
    }
    if (!hasMenuItems) {
      reduxDispatch(fetchMenuItems({ restaurantId: id }));
    }
    if (!hasCategories) {
      reduxDispatch(fetchMenuCategories(id));
    }

    lastFetchedId.current = id;
  }, [id, reduxDispatch, restaurantLoading, menuLoading, categoriesLoading, selectedRestaurant, itemsByRestaurant, categoriesByRestaurant]);

  useEffect(() => {
    if (selectedRestaurant && userLocation.lat && userLocation.lng) {
      const distance = calculateDistance(userLocation, selectedRestaurant.coordinates);
      // Update restaurant with distance if needed
    }
  }, [selectedRestaurant, userLocation]);

  const restaurant = selectedRestaurant;
  const menuItems = id ? itemsByRestaurant[id] || [] : [];
  const categories = id ? categoriesByRestaurant[id] || [] : [];

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  // Loading state
  if (restaurantLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (restaurantError || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{restaurantError || "Restaurant not found"}</p>
          <Link to="/restaurants" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
            ← Back to restaurants
          </Link>
        </div>
      </div>
    );
  }

  const filteredMenu = menuItems.filter((item) => {
    // Category filtering: match by category ID (preferred) or category name (fallback)
    const matchesCategory = !selectedCategory || 
      item.categoryId === selectedCategory || 
      item.category === selectedCategory ||
      (categories.find(cat => cat.id === selectedCategory)?.name === item.category);
    
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilters = (!filters.vegetarian || item.isVegetarian) && 
      (!filters.spicy || item.isSpicy) && 
      (!filters.popular || item.isPopular);

    return matchesCategory && matchesSearch && matchesFilters;
  });

  const handleAddToCart = (item: MenuItem) => {
    // Check if item already exists in cart (same menu item with no customizations/addons)
    const existingCartItem = state.cart.items.find(
      (cartItem) =>
        cartItem.menuItem.id === item.id &&
        cartItem.customizations.length === 0 &&
        cartItem.addons.length === 0 &&
        !cartItem.specialInstructions
    );

    if (existingCartItem) {
      // Increment quantity of existing item
      contextDispatch({
        type: "UPDATE_CART_ITEM",
        payload: { itemId: existingCartItem.id, quantity: existingCartItem.quantity + 1 },
      });
    } else {
      // Add new item to cart
      const cartItem: CartItem = {
        id: `${item.id}-${Date.now()}`, // Unique cart item ID
        menuItem: item,
        quantity: 1,
        customizations: [],
        addons: [],
        specialInstructions: "",
        price: item.price,
      };

      contextDispatch({ type: "ADD_TO_CART", payload: cartItem });
    }

    setCartItems((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (item: MenuItem) => {
    // Find the cart item to remove
    const cartItem = state.cart.items.find((cartItem) => cartItem.menuItem.id === item.id);

    if (cartItem) {
      if (cartItem.quantity > 1) {
        contextDispatch({
          type: "UPDATE_CART_ITEM",
          payload: { itemId: cartItem.id, quantity: cartItem.quantity - 1 },
        });
      } else {
        contextDispatch({ type: "REMOVE_FROM_CART", payload: cartItem.id });
      }
    }

    setCartItems((prev) => ({
      ...prev,
      [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
    }));
  };

  const getItemQuantityInCart = (itemId: string): number => {
    return state.cart.items.filter((cartItem) => cartItem.menuItem.id === itemId).reduce((total, cartItem) => total + cartItem.quantity, 0);
  };

  const getTotalItems = () => {
    return state.cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.cart.subtotal;
  };

  const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
    const quantity = getItemQuantityInCart(item.id);

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                {item.isVegetarian && (
                  <div className="w-4 h-4 border-2 border-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
                {item.isSpicy && <Flame className="w-4 h-4 text-red-500" />}
                {item.isPopular && <Award className="w-4 h-4 text-yellow-500" />}
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900">
                  PKR {item.price.toLocaleString()}
                </span>
                {item.originalPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    PKR {item.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {quantity === 0 ? (
                <Button size="sm" onClick={() => handleAddToCart(item)} leftIcon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              ) : (
                <div className="flex items-center space-x-3 bg-primary-50 rounded-lg px-3 py-2">
                  <button onClick={() => handleRemoveFromCart(item)} className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-medium text-primary-700 min-w-[20px] text-center">{quantity}</span>
                  <button onClick={() => handleAddToCart(item)} className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {item.customizations && item.customizations.length > 0 && <p className="text-xs text-gray-500 mt-2">Customizable</p>}
          </div>

          {item.image && (
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/restaurants" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span>Back to restaurants</span>
            </Link>

            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Hero */}
      <div className="relative">
        <div className="h-64 md:h-80 overflow-hidden">
          <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{restaurant.name}</h1>
                <p className="text-white/90 mb-4">{restaurant.description}</p>

                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{restaurant.rating}</span>
                    <span className="text-white/70">({restaurant.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{restaurant.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Truck className="w-4 h-4" />
                    <span>PKR {restaurant.deliveryFee} delivery</span>
                  </div>
                  {restaurant.distance && (
                    <div className="flex items-center space-x-1">
                      <Navigation className="w-4 h-4" />
                      <span>{restaurant.distance}km away</span>
                    </div>
                  )}
                </div>
              </div>

              {restaurant.promo && (
                <div className="bg-primary-500 text-white px-4 py-2 rounded-lg">
                  <div className="font-semibold">{restaurant.promo.title}</div>
                  <div className="text-sm">{restaurant.promo.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Address</div>
                <div className="text-sm text-gray-600">{restaurant.address}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Contact</div>
                <div className="text-sm text-gray-600">+91 98765 43210</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Minimum Order</div>
                <div className="text-sm text-gray-600">PKR {restaurant.minimumOrder}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {restaurant.cuisines.map((cuisine) => (
              <span key={cuisine} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {cuisine}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Menu Content */}
          <div className="flex-1">
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Search menu items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>

                <Button variant="outline" onClick={() => setShowFilters(!showFilters)} leftIcon={<Filter className="w-4 h-4" />}>
                  Filters
                </Button>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center">
                      <input type="checkbox" checked={filters.vegetarian} onChange={(e) => setFilters((prev) => ({ ...prev, vegetarian: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <Leaf className="w-4 h-4 text-green-500 mr-1" />
                        Vegetarian
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input type="checkbox" checked={filters.spicy} onChange={(e) => setFilters((prev) => ({ ...prev, spicy: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <Flame className="w-4 h-4 text-red-500 mr-1" />
                        Spicy
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input type="checkbox" checked={filters.popular} onChange={(e) => setFilters((prev) => ({ ...prev, popular: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <Award className="w-4 h-4 text-yellow-500 mr-1" />
                        Popular
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Menu Categories</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory("")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedCategory ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  All Items ({menuItems.length})
                </button>
                {categories.map((category) => {
                  // Count items that match this category by ID or name
                  const count = menuItems.filter((item) => 
                    item.categoryId === category.id || 
                    item.category === category.name ||
                    item.category === category.id
                  ).length;
                  return (
                    <button 
                      key={category.id} 
                      onClick={() => setSelectedCategory(category.id)} 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category.id ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      {category.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {filteredMenu.length > 0 ? (
                filteredMenu.map((item) => <MenuItemCard key={item.id} item={item} />)
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
                  <p className="text-gray-600">{searchQuery ? `No menu items match "${searchQuery}" with current filters.` : "No items match your current filters."}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilters({ vegetarian: false, spicy: false, popular: false });
                      setSelectedCategory("");
                    }}
                    className="mt-4"
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          {getTotalItems() > 0 && (
            <div className="lg:w-80">
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Order</h3>

                <div className="space-y-3 mb-4">
                  {state.cart.items.map((cartItem) => (
                    <div key={cartItem.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{cartItem.menuItem.name}</div>
                        <div className="text-sm text-gray-600">₹{cartItem.menuItem.price} each</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleRemoveFromCart(cartItem.menuItem)} className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-medium min-w-[20px] text-center">{cartItem.quantity}</span>
                        <button onClick={() => handleAddToCart(cartItem.menuItem)} className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{getTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Delivery fee</span>
                    <span className="font-medium">PKR {restaurant.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-semibold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>PKR {getTotalPrice() + restaurant.deliveryFee}</span>
                  </div>
                </div>

                <Link to="/cart" className="block mt-4">
                  <Button className="w-full" leftIcon={<ShoppingCart className="w-4 h-4" />} disabled={getTotalPrice() < restaurant.minimumOrder}>
                    {getTotalPrice() < restaurant.minimumOrder ? `Minimum order PKR ${restaurant.minimumOrder}` : `View Cart (${getTotalItems()} items)`}
                  </Button>
                </Link>

                {getTotalPrice() < restaurant.minimumOrder && <p className="text-xs text-gray-500 mt-2 text-center">Add PKR {restaurant.minimumOrder - getTotalPrice()} more to place order</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetails;
