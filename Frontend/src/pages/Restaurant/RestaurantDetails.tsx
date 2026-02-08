import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Clock, Truck, MapPin, Phone, Plus, Minus, ShoppingCart, Heart, Share2, ChevronLeft, Search, Leaf, Flame, Award, Navigation } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchRestaurantById } from "../../store/slices/restaurantsSlice";
import { fetchMenuItems } from "../../store/slices/menuItemsSlice";
import { fetchMenuCategories } from "../../store/slices/menuCategoriesSlice";
import { MenuItem, CartItem } from "../../types";
import { getRestaurantImage } from "../../utils/imageUtils";
import Button from "../../components/Common/Button";
import LoadingSpinner from "../../components/Common/LoadingSpinner";

const RestaurantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch: contextDispatch } = useApp();
  const reduxDispatch = useAppDispatch();
  const { selectedRestaurant, loading: restaurantLoading, error: restaurantError } = useAppSelector((state) => state.restaurants);
  const { itemsByRestaurant, loading: menuLoading } = useAppSelector((state) => state.menuItems);
  const { categoriesByRestaurant } = useAppSelector((state) => state.menuCategories);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    vegetarian: false,
    spicy: false,
    popular: false,
  });

  // Reset selected category when restaurant ID changes
  useEffect(() => {
    setSelectedCategory("");
  }, [id]);

  // Track last fetched restaurant ID to prevent duplicate calls
  const lastFetchedId = useRef<string | null>(null);
  const { loading: categoriesLoading } = useAppSelector((state) => state.menuCategories);

  // Fetch restaurant and menu data
  useEffect(() => {
    // Skip if no ID
    if (!id) {
      return;
    }

    // Removed loading check to allow concurrent fetching
    // if (restaurantLoading || menuLoading || categoriesLoading) {
    //   return;
    // }

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

    // setCartItems removed

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

    // setCartItems removed

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
      <div className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group">
        <div className="flex gap-5">
          {item.image && (
            <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 relative">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               {(item.isVegetarian || item.isSpicy || item.isPopular) && (
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                     {item.isVegetarian && <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" title="Vegetarian"><Leaf className="w-3 h-3 text-green-500" /></div>}
                     {item.isSpicy && <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" title="Spicy"><Flame className="w-3 h-3 text-red-500" /></div>}
                     {item.isPopular && <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" title="Popular"><Award className="w-3 h-3 text-yellow-500" /></div>}
                  </div>
               )}
            </div>
          )}
          
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                 <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{item.name}</h3>
              </div>
              
              <p className="text-gray-500 text-sm mb-3 line-clamp-2 leading-relaxed">{item.description}</p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900">
                  Rs. {item.price.toLocaleString()}
                </span>
                {item.originalPrice && (
                  <span className="text-xs text-gray-400 line-through">
                    Rs. {item.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {quantity === 0 ? (
                <Button size="sm" onClick={() => handleAddToCart(item)} className="rounded-xl px-6 shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 transition-all">
                  Add
                </Button>
              ) : (
                <div className="flex items-center bg-gray-50 rounded-xl p-1 shadow-inner">
                  <button onClick={() => handleRemoveFromCart(item)} className="w-8 h-8 rounded-lg bg-white text-gray-600 shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-100">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-gray-900 w-8 text-center">{quantity}</span>
                  <button onClick={() => handleAddToCart(item)} className="w-8 h-8 rounded-lg bg-primary-500 text-white shadow-md shadow-primary-500/30 flex items-center justify-center hover:bg-primary-600 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            
            {item.customizations && item.customizations.length > 0 && (
               <div className="mt-2 text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                  Customizable
               </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Immersive Hero */}
      <div className="relative h-[400px] md:h-[500px] w-full group">
         <div className="absolute inset-0 overflow-hidden">
            <img 
               src={restaurant.coverImage || getRestaurantImage(restaurant.name, 'cover', restaurant.cuisines)} 
               alt={restaurant.name}
               onError={(e) => {
                  const backup = getRestaurantImage(restaurant.name, 'cover', restaurant.cuisines);
                  if ((e.target as HTMLImageElement).src !== backup) {
                     (e.target as HTMLImageElement).src = backup;
                  } else {
                     (e.target as HTMLImageElement).src = "/restaurant-5521372_1920.jpg";
                  }
               }}
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
               <Link to="/restaurants" className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all border border-white/10">
                  <ChevronLeft className="w-6 h-6" />
               </Link>
               <div className="flex gap-3">
                  <button className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all border border-white/10">
                     <Share2 className="w-5 h-5" />
                  </button>
                  <button className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all border border-white/10">
                     <Heart className="w-5 h-5" />
                  </button>
               </div>
            </div>
         </div>

         {/* Restaurant Info Card - Floating */}
         <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 translate-y-12 max-w-7xl mx-auto">
            <div className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
               
               <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h1>
                     {restaurant.isPremium && <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200">PREMIUM</span>}
                  </div>
                  <p className="text-gray-500 text-lg mb-6 max-w-2xl font-light">{restaurant.description}</p>
                  
                  <div className="flex flex-wrap gap-4 md:gap-8">
                     <div className="flex items-center gap-2">
                        <div className="bg-green-50 p-2 rounded-full">
                           <Star className="w-5 h-5 text-green-600 fill-current" />
                        </div>
                        <div>
                           <div className="font-bold text-gray-900">{restaurant.rating} <span className="text-gray-400 font-normal">/ 5</span></div>
                           <div className="text-xs text-gray-500">{restaurant.reviewCount} reviews</div>
                        </div>
                     </div>
                     <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
                     <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-2 rounded-full">
                           <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                           <div className="font-bold text-gray-900">{restaurant.deliveryTime}</div>
                           <div className="text-xs text-gray-500">Delivery Time</div>
                        </div>
                     </div>
                     <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
                     <div className="flex items-center gap-2">
                        <div className="bg-purple-50 p-2 rounded-full">
                           <Truck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                           <div className="font-bold text-gray-900">Rs. {restaurant.deliveryFee}</div>
                           <div className="text-xs text-gray-500">Delivery Fee</div>
                        </div>
                     </div>
                     {restaurant.distance && (
                         <>
                            <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-50 p-2 rounded-full">
                                <Navigation className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                <div className="font-bold text-gray-900">{restaurant.distance} km</div>
                                <div className="text-xs text-gray-500">Distance</div>
                                </div>
                            </div>
                         </>
                     )}
                  </div>
               </div>

               {restaurant.promo && (
                  <div className="relative z-10 bg-gradient-to-br from-primary-500 to-primary-600 text-white p-5 rounded-2xl shadow-lg shadow-primary-500/20 max-w-xs w-full">
                     <div className="font-bold text-lg mb-1 flex items-center"><Award className="w-5 h-5 mr-2" /> {restaurant.promo.title}</div>
                     <div className="text-primary-100 text-sm">{restaurant.promo.description}</div>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            
            {/* Left Sidebar - Categories & Info */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-24">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Menu</h3>
                  <div className="space-y-1">
                     <button 
                        onClick={() => setSelectedCategory("")}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${!selectedCategory ? "bg-primary-50 text-primary-700 shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
                     >
                        All Items
                     </button>
                     {categories.map(cat => (
                        <button 
                           key={cat.id}
                           onClick={() => setSelectedCategory(cat.id)}
                           className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex justify-between group ${selectedCategory === cat.id ? "bg-primary-50 text-primary-700 shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                           <span>{cat.name}</span>
                           <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === cat.id ? "bg-primary-100/50" : "bg-gray-100 group-hover:bg-gray-200"} transition-colors`}>
                              {menuItems.filter(i => i.categoryId === cat.id || i.category === cat.name || i.category === cat.id).length}
                           </span>
                        </button>
                     ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100">
                     <h3 className="font-bold text-gray-900 mb-4 text-lg">Info</h3>
                     <div className="space-y-4">
                        <div className="flex items-start gap-3 text-sm text-gray-600">
                           <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                           <span>{restaurant.address}</span>
                        </div>
                         <div className="flex items-start gap-3 text-sm text-gray-600">
                           <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                           <span>+91 98765 43210</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Middle - Menu Items */}
            <div className="lg:col-span-2">
               {/* Search & Filters */}
               <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 sticky top-24 z-30">
                  <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                     <input 
                        type="text" 
                        placeholder="Search menu..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20 text-sm"
                     />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                     <button 
                        onClick={() => setFilters(f => ({...f, vegetarian: !f.vegetarian}))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${filters.vegetarian ? "bg-green-50 border-green-200 text-green-700" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                     >
                        <Leaf className="w-3.5 h-3.5" /> Veg
                     </button>
                     <button 
                         onClick={() => setFilters(f => ({...f, spicy: !f.spicy}))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${filters.spicy ? "bg-red-50 border-red-200 text-red-700" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                     >
                        <Flame className="w-3.5 h-3.5" /> Spicy
                     </button>
                     <button 
                         onClick={() => setFilters(f => ({...f, popular: !f.popular}))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${filters.popular ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                     >
                        <Award className="w-3.5 h-3.5" /> Popular
                     </button>
                  </div>
               </div>

               {/* Menu List */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-gray-900">
                        {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "All Items"}
                     </h2>
                     <span className="text-sm text-gray-500">{filteredMenu.length} items</span>
                  </div>

                  {filteredMenu.length > 0 ? (
                    <div className="grid gap-6">
                       {filteredMenu.map((item, index) => (
                          <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                             <MenuItemCard item={item} />
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                       <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                       </div>
                       <h3 className="text-lg font-bold text-gray-900">No items found</h3>
                       <p className="text-gray-500 mb-6">Try adjusting your filters or search query.</p>
                       <Button variant="outline" onClick={() => { setSearchQuery(""); setFilters({ vegetarian: false, spicy: false, popular: false }); setSelectedCategory(""); }}>
                          Clear all filters
                       </Button>
                    </div>
                  )}
               </div>
            </div>

            {/* Right Sidebar - Cart */}
            <div className="lg:col-span-1">
               <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sticky top-24 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                     <ShoppingCart className="w-5 h-5 mr-2 text-primary-500" />
                     Your Cart
                  </h3>

                  {getTotalItems() > 0 ? (
                     <>
                        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           {state.cart.items.map((cartItem) => (
                              <div key={cartItem.id} className="flex items-center justify-between group">
                                 <div className="flex-1">
                                    <div className="font-semibold text-gray-900 text-sm">{cartItem.menuItem.name}</div>
                                    <div className="text-xs text-gray-500">Rs. {cartItem.menuItem.price}</div>
                                 </div>
                                 <div className="flex items-center bg-gray-50 rounded-lg p-1">
                                    <button onClick={() => handleRemoveFromCart(cartItem.menuItem)} className="w-6 h-6 rounded-md bg-white text-gray-500 shadow-sm flex items-center justify-center hover:text-red-500 transition-colors">
                                       <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-medium text-xs text-gray-900 w-6 text-center">{cartItem.quantity}</span>
                                    <button onClick={() => handleAddToCart(cartItem.menuItem)} className="w-6 h-6 rounded-md bg-white text-primary-500 shadow-sm flex items-center justify-center hover:text-primary-600 transition-colors">
                                       <Plus className="w-3 h-3" />
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="border-t border-dashed border-gray-200 pt-4 space-y-2 mb-6">
                           <div className="flex justify-between text-sm text-gray-600">
                              <span>Subtotal</span>
                              <span>Rs. {getTotalPrice()}</span>
                           </div>
                           <div className="flex justify-between text-sm text-gray-600">
                              <span>Delivery</span>
                              <span>Rs. {restaurant.deliveryFee}</span>
                           </div>
                           <div className="flex justify-between font-bold text-lg text-gray-900 pt-2">
                              <span>Total</span>
                              <span>Rs. {getTotalPrice() + restaurant.deliveryFee}</span>
                           </div>
                        </div>

                        <Link to="/cart">
                           <Button className="w-full rounded-xl py-3 shadow-lg shadow-primary-500/20" disabled={getTotalPrice() < restaurant.minimumOrder}>
                              {getTotalPrice() < restaurant.minimumOrder ? `Add Rs. ${restaurant.minimumOrder - getTotalPrice()} more` : "Checkout"}
                           </Button>
                        </Link>
                        {getTotalPrice() < restaurant.minimumOrder && (
                           <p className="text-xs text-center text-amber-600 mt-2 bg-amber-50 py-1 rounded-lg">
                              Minimum order is Rs. {restaurant.minimumOrder}
                           </p>
                        )}
                     </>
                  ) : (
                     <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                           <ShoppingCart className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm">Your cart is empty</p>
                        <p className="text-gray-400 text-xs mt-1">Add items to get started</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default RestaurantDetails;
