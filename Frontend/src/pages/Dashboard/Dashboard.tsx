import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Heart,
  ShoppingBag,
  Tag,
  Headphones,
  Mic,
  Grid,
  List,
  X,
  Package,
  CheckCircle,
  Clock as ClockIcon,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Restaurant } from '../../types';
import VoiceOrderModal from '../../components/Voice/VoiceOrderModal';
import Button from '../../components/Common/Button';
import { apiService } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNearbyRestaurants, fetchRestaurants } from '../../store/slices/restaurantsSlice';
import RestaurantCard from '../../components/Restaurant/RestaurantCard';

type TabType = 'restaurants' | 'favorites' | 'orders' | 'deals' | 'support';

interface Order {
  id: string;
  restaurantName: string;
  restaurantImage: string;
  items: string[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  date: Date;
  orderNumber: string;
}

interface Deal {
  id: string;
  title: string;
  description: string;
  discount: string;
  code?: string;
  validUntil: string;
  image?: string;
  restaurantId?: string;
  restaurantName?: string;
}

const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const reduxDispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabType>('restaurants');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Memoize user location to prevent unnecessary re-renders
  const userLocation = useMemo(() => {
    return state.currentLocation || state.selectedAddress?.coordinates || { lat: 33.6844, lng: 73.0479 }; // Islamabad default
  }, [state.currentLocation?.lat, state.currentLocation?.lng, state.selectedAddress?.coordinates?.lat, state.selectedAddress?.coordinates?.lng]);

  // Get restaurants from Redux store
  const { restaurants: reduxRestaurants, nearbyRestaurants, loading: restaurantsLoading, error: restaurantsError } = useAppSelector((state) => state.restaurants);


  // Redirect if not authenticated (only after verification is complete)
  useEffect(() => {
    // Don't redirect while we're still verifying authentication
    if (state.isVerifyingAuth) {
      return;
    }
    
    // Only redirect if verification is complete and user is not authenticated
    if (!state.isAuthenticated || !state.user) {
      navigate('/login');
      return;
    }
  }, [state.isAuthenticated, state.user, state.isVerifyingAuth, navigate]);

  const isInitialMount = useRef(true);

  // Fetch nearby restaurants when dashboard opens or location changes
  // Fetch nearby restaurants when dashboard opens or location changes
  useEffect(() => {
    // Skip if not authenticated
    if (!state.isAuthenticated || !state.user) {
      return;
    }

    const currentLat = userLocation.lat;
    const currentLng = userLocation.lng;
    
    // Only fetch if we have valid coordinates
    if (currentLat && currentLng && !isNaN(currentLat) && !isNaN(currentLng)) {
      // The thunk itself handles caching now, so we can safely dispatch this.
      // It will only hit the API if location changed significantly or cache expired.
      console.log('📍 Dashboard: Checking nearby restaurants for', currentLat, currentLng);
      reduxDispatch(fetchNearbyRestaurants({ lat: currentLat, lng: currentLng, radius: 15 }));
    } else {
      console.log('🌐 Dashboard: No valid location, fetching all restaurants');
      reduxDispatch(fetchRestaurants());
    }

    isInitialMount.current = false;
  }, [reduxDispatch, state.isAuthenticated, state.user, userLocation.lat, userLocation.lng]);

  // Use nearby restaurants if available, otherwise use all restaurants
  const restaurants = (nearbyRestaurants.length > 0 ? nearbyRestaurants : reduxRestaurants) as (Restaurant & { distance?: number })[];

  // Load favorites
  useEffect(() => {
    // Check both favoriteRestaurants (frontend) and favorite_restaurants (backend)
    const favIds = (state.user as any)?.favoriteRestaurants || (state.user as any)?.favorite_restaurants || [];
    if (favIds.length > 0 && restaurants.length > 0) {
      const favs = restaurants.filter(r => favIds.includes(r.id));
      setFavoriteRestaurants(favs);
    } else {
      setFavoriteRestaurants([]);
    }
  }, [state.user, restaurants]);

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!state.user?.id) return;
      
      setIsLoading(true);
      try {
        const response = await apiService.getOrders({ page: 1, limit: 20 });
        if (response.success && response.data) {
          const data = response.data as any;
          // Transform API orders to local format
          const transformedOrders: Order[] = (data.orders || []).map((order: any) => ({
            id: order.order_id || order._id,
            restaurantName: order.restaurant_name || 'Restaurant',
            restaurantImage: order.restaurant_image || '',
            items: order.items?.map((item: any) => item.name || 'Item') || [],
            total: order.total_amount || 0,
            status: order.order_status || 'pending',
            date: new Date(order.created_at || order.order_date),
            orderNumber: order.order_number || order.order_id?.slice(0, 8) || 'N/A'
          }));
          setOrders(transformedOrders);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
        // Use empty orders if API fails
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, state.user?.id]);

  // Mock deals
  useEffect(() => {
    const firstRestaurant = restaurants[0];
    setDeals([
      {
        id: '1',
        title: '50% Off on First Order',
        description: 'Get 50% discount on your first order from any restaurant',
        discount: '50%',
        code: 'FIRST50',
        validUntil: '2025-12-31',
        image: firstRestaurant?.image
      },
      {
        id: '2',
        title: 'Free Delivery Weekend',
        description: 'Enjoy free delivery on all orders this weekend',
        discount: 'Free Delivery',
        validUntil: '2025-12-08',
        restaurantName: 'All Restaurants'
      },
      {
        id: '3',
        title: 'Buy 2 Get 1 Free',
        description: firstRestaurant ? `Buy any 2 items and get 1 free at ${firstRestaurant.name}` : 'Buy any 2 items and get 1 free',
        discount: '33%',
        code: 'B2G1',
        validUntil: '2025-12-15',
        restaurantId: firstRestaurant?.id,
        restaurantName: firstRestaurant?.name || 'Restaurant'
      },
      {
        id: '4',
        title: 'Weekend Special',
        description: '20% off on all Pakistani cuisine orders',
        discount: '20%',
        code: 'WEEKEND20',
        validUntil: '2025-12-10',
        restaurantName: 'Pakistani Cuisine'
      }
    ]);
  }, [restaurants]);

  // Filter logic removed as search is now handled globally
  const filteredRestaurants = restaurants;

  const toggleFavorite = (restaurantId: string) => {
    const currentFavs = (state.user as any)?.favoriteRestaurants || (state.user as any)?.favorite_restaurants || [];
    const isFavorite = currentFavs.includes(restaurantId);
    
    const newFavs = isFavorite
      ? currentFavs.filter((id: string) => id !== restaurantId)
      : [...currentFavs, restaurantId];

    dispatch({
      type: 'SET_USER',
      payload: {
        ...state.user!,
        favoriteRestaurants: newFavs
      } as any
    });
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
        return 'bg-purple-100 text-purple-700';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'preparing':
        return <ClockIcon className="w-4 h-4" />;
      case 'ready':
        return <Package className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  // Show loading while verifying authentication
  if (state.isVerifyingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-gray-900 tracking-tight">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">{state.user?.name?.split(' ')[0] || 'Hungry User'}</span>
              </h1>
              <div className="flex items-center justify-center md:justify-start space-x-2 mt-4">
                <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-700 hover:border-primary-200 transition-colors cursor-pointer">
                  <MapPin className="w-4 h-4 text-primary-500 mr-2" />
                  <p className="text-sm font-medium">
                    {state.selectedAddress?.address || 'Set your delivery location'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsVoiceModalOpen(true)}
                leftIcon={<Mic className="w-4 h-4" />}
                className="hidden md:flex bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm"
              >
                Voice Order
              </Button>
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="md:hidden w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-16 lg:top-20 z-30 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide py-3">
            {[
              { id: 'restaurants', icon: Grid, label: 'Restaurants' },
              { id: 'favorites', icon: Heart, label: 'Favorites', count: favoriteRestaurants.length },
              { id: 'orders', icon: ShoppingBag, label: 'Past Orders', count: orders.length },
              { id: 'deals', icon: Tag, label: 'Deals & Offers', count: deals.length },
              { id: 'support', icon: Headphones, label: 'Support' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {nearbyRestaurants.length > 0 
                  ? `Restaurants Near You (${filteredRestaurants.length})`
                  : `All Restaurants (${filteredRestaurants.length})`}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
            {restaurantsLoading && filteredRestaurants.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : restaurantsError && filteredRestaurants.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading restaurants</h3>
                <p className="text-gray-600 mb-4">{restaurantsError}</p>
                <Button onClick={() => {
                  if (userLocation.lat && userLocation.lng) {
                    reduxDispatch(fetchNearbyRestaurants({ lat: userLocation.lat, lng: userLocation.lng, radius: 15 }));
                  } else {
                    reduxDispatch(fetchRestaurants());
                  }
                }}>Retry</Button>
              </div>
            ) : (
              <>
                {restaurantsLoading && (
                  <div className="flex items-center justify-center py-4 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="text-sm font-medium">Updating list...</span>
                  </div>
                )}
                <div
                  className={`grid gap-6 ${
                    viewMode === 'grid'
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      : 'grid-cols-1 max-w-3xl mx-auto'
                  }`}
                >
                  {filteredRestaurants.map((restaurant) => (
                    <RestaurantCard 
                      key={restaurant.id} 
                      restaurant={restaurant} 
                      showFavorite={true}
                      isFavorite={(state.user as any)?.favoriteRestaurants?.includes(restaurant.id) || (state.user as any)?.favorite_restaurants?.includes(restaurant.id)}
                      onToggleFavorite={(_, id) => toggleFavorite(id)}
                    />
                  ))}
                </div>
                {filteredRestaurants.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No restaurants found</h3>
                    <p className="text-gray-600">
                      {nearbyRestaurants.length > 0 
                        ? 'Try adjusting your search or filters'
                        : 'No restaurants available in your area. Try updating your location.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Your Favorite Restaurants ({favoriteRestaurants.length})
            </h2>
            {favoriteRestaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRestaurants.map((restaurant) => (
                  <RestaurantCard 
                    key={restaurant.id} 
                    restaurant={restaurant} 
                    showFavorite={true}
                    isFavorite={true}
                    onToggleFavorite={(_, id) => toggleFavorite(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
                <p className="text-gray-600 mb-6">Start adding restaurants to your favorites</p>
                <Button onClick={() => setActiveTab('restaurants')}>Browse Restaurants</Button>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Order History</h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={order.restaurantImage || restaurants[0]?.image || '/placeholder-restaurant.jpg'}
                        alt={order.restaurantName}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.restaurantName}
                            </h3>
                            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status}</span>
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">
                            {order.items.slice(0, 3).join(', ')}
                            {order.items.length > 3 && ` +${order.items.length - 3} more`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.date.toLocaleDateString()} • {order.date.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-semibold text-gray-900">₹{order.total}</p>
                          {order.status === 'delivered' && (
                            <Button variant="outline" size="sm">
                              Reorder
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-6">Start ordering to see your order history here</p>
                <Button onClick={() => setActiveTab('restaurants')}>Browse Restaurants</Button>
              </div>
            )}
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === 'deals' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Deals & Offers
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Tag className="w-4 h-4" />
                <span>{deals.length} active offers</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="inline-flex items-center space-x-2 mb-3 px-3 py-1.5 bg-blue-50 rounded-lg">
                        <span className="text-lg font-bold text-blue-600">{deal.discount}</span>
                        <span className="text-sm text-gray-600">OFF</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{deal.title}</h3>
                      <p className="text-gray-600 mb-3 text-sm leading-relaxed">{deal.description}</p>
                      {deal.restaurantName && (
                        <p className="text-xs text-gray-500 mb-3">
                          Valid at <span className="font-medium text-gray-700">{deal.restaurantName}</span>
                        </p>
                      )}
                    </div>
                    {deal.image && (
                      <img
                        src={deal.image}
                        alt={deal.title}
                        className="w-24 h-24 rounded-lg object-cover ml-4"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex-1">
                      {deal.code && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Promo Code</p>
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-mono font-semibold text-gray-900 border border-gray-300">
                              {deal.code}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(deal.code!);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Valid until {deal.validUntil}</p>
                    </div>
                    <Button size="sm" className="ml-4">Apply</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Service</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Options */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Get in Touch</h3>
                <div className="space-y-4">
                  <a
                    href="tel:+923001234567"
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Call Us</p>
                      <p className="text-sm text-gray-600">+92 300 1234567</p>
                    </div>
                  </a>
                  <a
                    href="mailto:support@vocabite.com"
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Email Us</p>
                      <p className="text-sm text-gray-600">support@vocabite.com</p>
                    </div>
                  </a>
                  <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Live Chat</p>
                      <p className="text-sm text-gray-600">Available 24/7</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  {[
                    { q: 'How do I track my order?', a: 'You can track your order in the Past Orders tab.' },
                    { q: 'What are your delivery times?', a: 'Delivery times vary by restaurant, typically 25-45 minutes.' },
                    { q: 'Can I cancel my order?', a: 'Yes, you can cancel orders within 5 minutes of placing them.' },
                    { q: 'Do you offer refunds?', a: 'Refunds are processed for cancelled or undelivered orders.' }
                  ].map((faq, idx) => (
                    <details key={idx} className="border border-gray-200 rounded-lg p-3">
                      <summary className="font-medium text-gray-900 cursor-pointer">{faq.q}</summary>
                      <p className="text-sm text-gray-600 mt-2">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </div>

              {/* Help Topics */}
              <div className="bg-white rounded-2xl p-6 shadow-sm md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Help Topics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'Account Settings',
                    'Payment Methods',
                    'Delivery Address',
                    'Order Issues',
                    'Promo Codes',
                    'Restaurant Info',
                    'Privacy Policy',
                    'Terms of Service'
                  ].map((topic) => (
                    <button
                      key={topic}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <p className="font-medium text-gray-900">{topic}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Order Modal */}
      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onOrderSubmit={(orderText) => {
          console.log('Order submitted:', orderText);
          // Handle order submission
          setIsVoiceModalOpen(false);
        }}
      />
    </div>
  );
};

export default Dashboard;
