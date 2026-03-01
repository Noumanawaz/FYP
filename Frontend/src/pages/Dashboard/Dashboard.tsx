import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Heart, ShoppingBag, Tag, Headphones, Mic, Package, Phone, Mail, MessageCircle, ChevronRight
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Restaurant } from '../../types';
import VoiceOrderModal from '../../components/Voice/VoiceOrderModal';
import { apiService } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNearbyRestaurants, fetchRestaurants } from '../../store/slices/restaurantsSlice';
import RestaurantCard from '../../components/Restaurant/RestaurantCard';

type TabType = 'overview' | 'explore' | 'favorites' | 'history' | 'support';

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userLocation = useMemo(() => {
    return state.currentLocation || state.selectedAddress?.coordinates || { lat: 33.6844, lng: 73.0479 };
  }, [state.currentLocation?.lat, state.currentLocation?.lng, state.selectedAddress?.coordinates?.lat, state.selectedAddress?.coordinates?.lng]);

  const { restaurants: reduxRestaurants, nearbyRestaurants, loading: restaurantsLoading } = useAppSelector((state) => state.restaurants);

  useEffect(() => {
    if (state.isVerifyingAuth) return;
    if (!state.isAuthenticated || !state.user) {
      navigate('/login');
      return;
    }
  }, [state.isAuthenticated, state.user, state.isVerifyingAuth, navigate]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!state.isAuthenticated || !state.user) return;
    const currentLat = userLocation.lat;
    const currentLng = userLocation.lng;
    if (currentLat && currentLng && !isNaN(currentLat) && !isNaN(currentLng)) {
      reduxDispatch(fetchNearbyRestaurants({ lat: currentLat, lng: currentLng, radius: 15 }));
    } else {
      reduxDispatch(fetchRestaurants());
    }
    isInitialMount.current = false;
  }, [reduxDispatch, state.isAuthenticated, state.user, userLocation.lat, userLocation.lng]);

  const restaurants = (nearbyRestaurants.length > 0 ? nearbyRestaurants : reduxRestaurants) as (Restaurant & { distance?: number })[];

  useEffect(() => {
    const favIds = (state.user as any)?.favoriteRestaurants || (state.user as any)?.favorite_restaurants || [];
    if (favIds.length > 0 && restaurants.length > 0) {
      const favs = restaurants.filter(r => favIds.includes(r.id));
      setFavoriteRestaurants(favs);
    } else {
      setFavoriteRestaurants([]);
    }
  }, [state.user, restaurants]);

  useEffect(() => {
    const loadOrders = async () => {
      if (!state.user?.id) return;
      setIsLoading(true);
      try {
        const response = await apiService.getOrders({ page: 1, limit: 20 });
        if (response.success && response.data) {
          const data = response.data as any;
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
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (activeTab === 'history' || activeTab === 'overview') {
      loadOrders();
    }
  }, [activeTab, state.user?.id]);

  useEffect(() => {
    const firstRestaurant = restaurants[0];
    setDeals([
      { id: '1', title: '50% Off on First Order', description: 'Get 50% discount on your first order from any restaurant', discount: '50% OFF', code: 'FIRST50', validUntil: '2025-12-31', image: firstRestaurant?.image },
      { id: '2', title: 'Free Delivery Weekend', description: 'Enjoy free delivery on all orders this weekend', discount: 'FREE DELIVERY', validUntil: '2025-12-08', restaurantName: 'All Restaurants' },
    ]);
  }, [restaurants]);

  const filteredRestaurants = restaurants;
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const toggleFavorite = (restaurantId: string) => {
    const currentFavs = (state.user as any)?.favoriteRestaurants || (state.user as any)?.favorite_restaurants || [];
    const isFavorite = currentFavs.includes(restaurantId);
    const newFavs = isFavorite ? currentFavs.filter((id: string) => id !== restaurantId) : [...currentFavs, restaurantId];
    dispatch({ type: 'SET_USER', payload: { ...state.user!, favoriteRestaurants: newFavs } as any });
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) { case 'delivered': return 'bg-gray-100 text-gray-700'; case 'preparing': return 'bg-blue-50 text-blue-600'; case 'ready': return 'bg-purple-50 text-purple-600'; case 'confirmed': return 'bg-orange-50 text-orange-600'; case 'cancelled': return 'bg-red-50 text-red-600'; default: return 'bg-gray-50 text-gray-600'; }
  };

  if (state.isVerifyingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'explore', label: 'Explore' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'history', label: 'History' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">
              Hello, {state.user?.name?.split(' ')[0] || 'User'}.
            </h1>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1.5" />
              <span>{state.selectedAddress?.address || 'Set your delivery location'}</span>
            </div>
          </div>
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center justify-center px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-medium transition-colors w-full md:w-auto"
          >
            <Mic className="w-4 h-4 mr-2" />
            Voice Order
          </button>
        </header>

        {/* Advanced Segmented Navigation */}
        <div className="mb-10 w-full overflow-x-auto scrollbar-hide">
          <nav className="inline-flex p-1.5 space-x-2 bg-gray-100/80 border border-gray-200/50 rounded-2xl backdrop-blur-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors outline-none ${
                  activeTab === tab.id ? 'text-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="nav-pill" 
                    className="absolute inset-0 bg-white shadow-sm border border-gray-200/50 rounded-xl"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column (Main) */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Tracking Section */}
                    <section>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Active Orders</h2>
                        {activeOrders.length > 1 && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{activeOrders.length}</span>}
                      </div>
                      
                      {isLoading ? (
                        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
                      ) : activeOrders.length > 0 ? (
                        <div className="space-y-4">
                          {activeOrders.map(order => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                  <img src={order.restaurantImage || restaurants[0]?.image || '/placeholder-restaurant.jpg'} alt={order.restaurantName} className="w-full h-full object-cover grayscale-[20%]" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{order.restaurantName}</h3>
                                  <p className="text-sm text-gray-500 mt-1">Order #{order.orderNumber} • {order.items.length} items</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`px-4 py-2 rounded-xl text-sm font-medium capitalize flex-1 md:flex-none text-center ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </div>
                                <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-colors">
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                          <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No active orders right now.</p>
                        </div>
                      )}
                    </section>

                    {/* Past Orders Preview */}
                    <section>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Recent Orders</h2>
                        <button onClick={() => setActiveTab('history')} className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center">
                          View all <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                      {isLoading ? (
                        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
                      ) : pastOrders.length > 0 ? (
                        <div className="space-y-4">
                          {pastOrders.slice(0, 2).map(order => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow cursor-pointer">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                  <img src={order.restaurantImage || restaurants[0]?.image || '/placeholder-restaurant.jpg'} alt={order.restaurantName} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{order.restaurantName}</h3>
                                  <p className="text-sm text-gray-500">{order.date.toLocaleDateString()} • Rs. {order.total}</p>
                                </div>
                              </div>
                              <div className="text-sm font-medium text-black px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors hidden sm:block">
                                Reorder
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                           <ShoppingBag className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                           <p className="text-sm text-gray-500">No past orders to show.</p>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Right Column (Sidebar) */}
                  <div className="space-y-8">
                    {/* Offers Section */}
                    <section>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Offers For You</h2>
                        <div className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">New</div>
                      </div>
                      <div className="flex flex-col gap-4">
                        {deals.map(deal => (
                          <div key={deal.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                            <div className="flex justify-between items-start mb-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-lg z-10">
                                <Tag className="w-4 h-4 text-gray-700" />
                              </div>
                              <div className="text-xs font-bold tracking-wider text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded">{deal.discount}</div>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1 z-10">{deal.title}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2 z-10">{deal.description}</p>
                            {deal.code ? (
                              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100 z-10">
                                <code className="text-xs font-mono font-medium text-gray-800 tracking-wide">{deal.code}</code>
                                <button className="text-xs text-gray-500 hover:text-black font-medium transition-colors">Copy</button>
                              </div>
                            ) : (
                              <button className="w-full text-xs font-medium text-black bg-gray-50 border border-gray-100 hover:bg-gray-100 py-2.5 rounded-xl transition-colors z-10 relative">Apply Now</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Quick Access */}
                    <section>
                      <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5">Quick Actions</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setActiveTab('explore')} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-black hover:shadow-sm transition-all">
                          <Search className="w-5 h-5 text-gray-600 mb-2" />
                          <span className="text-sm font-medium">Find Food</span>
                        </button>
                        <button onClick={() => setActiveTab('support')} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-black hover:shadow-sm transition-all">
                          <Headphones className="w-5 h-5 text-gray-600 mb-2" />
                          <span className="text-sm font-medium">Get Help</span>
                        </button>
                      </div>
                    </section>
                  </div>

                </div>
              )}

              {/* EXPLORE TAB */}
              {activeTab === 'explore' && (
                <div className="space-y-6">
                  {restaurantsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  )}
                </div>
              )}

              {/* FAVORITES TAB */}
              {activeTab === 'favorites' && (
                <div className="space-y-6">
                  {favoriteRestaurants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-12 text-center max-w-2xl mx-auto">
                      <Heart className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No favorites saved yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {isLoading ? (
                    <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
                  ) : pastOrders.length > 0 ? (
                    pastOrders.map(order => (
                      <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                            <img src={order.restaurantImage || restaurants[0]?.image || '/placeholder-restaurant.jpg'} alt={order.restaurantName} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{order.restaurantName}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{order.date.toLocaleDateString()} • Rs. {order.total}</p>
                          </div>
                        </div>
                        <button className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium rounded-xl transition-colors w-full md:w-auto">
                          Reorder
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-12 text-center">
                      <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No past orders found.</p>
                    </div>
                  )}
                </div>
              )}

              {/* SUPPORT TAB */}
              {activeTab === 'support' && (
                <div className="max-w-xl">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">How can we help?</h2>
                  <div className="space-y-4">
                    <a href="tel:+923001234567" className="flex items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-black transition-colors">
                      <Phone className="w-5 h-5 text-gray-400 mr-4" />
                      <div>
                        <div className="font-medium text-gray-900">Call Support</div>
                        <div className="text-sm text-gray-500">+92 300 1234567</div>
                      </div>
                    </a>
                    <a href="mailto:support@vocabite.com" className="flex items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-black transition-colors">
                      <Mail className="w-5 h-5 text-gray-400 mr-4" />
                      <div>
                        <div className="font-medium text-gray-900">Email Us</div>
                        <div className="text-sm text-gray-500">support@vocabite.com</div>
                      </div>
                    </a>
                    <button className="w-full flex items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-black transition-colors text-left">
                      <MessageCircle className="w-5 h-5 text-gray-400 mr-4" />
                      <div>
                        <div className="font-medium text-gray-900">Live Chat</div>
                        <div className="text-sm text-gray-500">Typically replies in 2 minutes</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onOrderSubmit={(orderText) => {
          setIsVoiceModalOpen(false);
        }}
      />
    </div>
  );
};

export default Dashboard;
