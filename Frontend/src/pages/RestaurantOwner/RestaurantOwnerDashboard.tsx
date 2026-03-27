import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import { Building2, Folder, MapPin, Eye, ClipboardList, UtensilsCrossed } from 'lucide-react';
import RestaurantInfo from './components/RestaurantInfo';
import LocationsTab from './components/LocationsTab';
import CategoriesTab from './components/CategoriesTab';
import MenuItemsTab from './components/MenuItemsTab';
import MenuPreview from './components/MenuPreview';
import RestaurantSetupWizard from './components/RestaurantSetupWizard';
import OrdersTab from './components/OrdersTab';
import RestaurantOwnerHeader from './components/RestaurantOwnerHeader';


const RAG_BASE_URL = (import.meta as any).env?.VITE_RAG_URL ?? 'http://localhost:8000';

interface Restaurant {
  restaurant_id: string;
  name: string;
  description: Record<string, any>;
  founded_year?: number;
  country: string;
  price_range: string;
  categories: string[];
  specialties: string[];
  keywords: string[];
  food_categories: string[];
  logo_url?: string;
  status: string;
  owner_id?: string;
}

type TabType = 'restaurant' | 'locations' | 'categories' | 'menu' | 'preview' | 'orders';

const RestaurantOwnerDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const user = state.user;
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('restaurant');
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(new Set(['restaurant']));

  const hasLoaded = React.useRef(false);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set(prev).add(tab));
  };

  useEffect(() => {
    if (!user || user.role !== 'restaurant_owner') {
      if (!user) setLoading(true);
      return;
    }
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadRestaurant();
  }, [user?.id, user?.role]);

  const loadRestaurant = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getMyRestaurant();
      if (response.success && response.data) {
        const rest = response.data as Restaurant;
        setRestaurant(rest);
        try {
          const locRes = await apiService.getRestaurantLocations(rest.restaurant_id);
          setLocations(Array.isArray(locRes.data) ? locRes.data : []);
        } catch {
          setLocations([]);
        }
      } else {
        setShowWelcomeBanner(true);
      }
    } catch (err: any) {
      if (err.message.includes('not found')) {
        setShowWelcomeBanner(true);
      } else {
        setError(err.message || 'Failed to load restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToAI = async () => {
    if (!restaurant || aiSaving) return;
    setAiSaving(true);
    setAiStatus('idle');
    try {
      const [catRes, menuRes] = await Promise.all([
        apiService.getCategories(restaurant.restaurant_id).catch(() => ({ data: [] })),
        apiService.getMenuItems(restaurant.restaurant_id).catch(() => ({ data: [] })),
      ]);

      const menuCategories = (Array.isArray(catRes.data) ? catRes.data : []) as any[];
      const menuItems = (Array.isArray(menuRes.data) ? menuRes.data : (menuRes.data as any)?.items ?? []) as any[];

      const branches = locations.map((l: any) => ({
        city: l.city ?? '',
        area: l.area ?? '',
        address: l.address ?? '',
        phone: l.phone ?? '',
        lat: l.lat ?? null,
        lng: l.lng ?? null,
      }));

      const exportData = {
        name: restaurant.name,
        country: restaurant.country,
        price_range: restaurant.price_range,
        founded_year: restaurant.founded_year ? String(restaurant.founded_year) : '',
        logo_url: restaurant.logo_url ?? '',
        categories: restaurant.categories ?? [],
        specialties: restaurant.specialties ?? [],
        keywords: restaurant.keywords ?? [],
        food_categories: restaurant.food_categories ?? [],
        branches,
        menuCategories,
        menuItems,
      };

      // Build the structured JSON payload — no PDF needed anymore
      const jsonPayload = {
        restaurant_id: restaurant.restaurant_id,
        restaurant_name: restaurant.name,
        data: exportData,
      };

      const res = await fetch(`${RAG_BASE_URL}/ingest-restaurant-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonPayload),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('[SaveToAI] Ingested chunks:', result.chunk_summary);
        setAiStatus('success');
      } else {
        setAiStatus('error');
      }
    } catch (err) {
      setAiStatus('error');
    } finally {
      setAiSaving(false);
      setTimeout(() => setAiStatus('idle'), 4000);
    }
  };

  const handleLogout = () => {
    apiService.setToken(null);
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };

  const handleUpdateRestaurant = async (data: any) => {
    if (!restaurant) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiService.updateRestaurant(restaurant.restaurant_id, data);
      if (response.success) {
        loadRestaurant();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading user...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'restaurant_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <p className="text-red-400">Access denied. This page is for restaurant owners only.</p>
        </div>
      </div>
    );
  }

  if (loading && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <RestaurantOwnerHeader
          restaurantName=""
          onLogout={handleLogout}
          onSaveToAI={handleSaveToAI}
          aiSaving={aiSaving}
          aiStatus={aiStatus}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {showWelcomeBanner && (
            <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-lg p-6 shadow-sm relative">
              <button onClick={() => setShowWelcomeBanner(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold">×</button>
              <div className="flex items-start gap-4">
                <UtensilsCrossed className="w-8 h-8 text-cyan-400" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Welcome to Your Restaurant Portal!</h3>
                  <p className="text-gray-300 mb-4">Get started by setting up your restaurant details and locations.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { setShowWelcomeBanner(false); setShowCreateRestaurant(true); }} className="px-4 py-2 bg-cyan-500 text-gray-900 rounded-lg hover:bg-cyan-400 font-bold transition-colors">Setup Restaurant Now</button>
                    <button onClick={() => setShowWelcomeBanner(false)} className="px-4 py-2 bg-transparent text-gray-300 border border-white/20 rounded-lg hover:bg-white/5 font-medium transition-colors">I'll Do It Later</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showCreateRestaurant ? (
            <div className="bg-[#111] p-6 rounded-lg border border-white/5">
              <RestaurantSetupWizard onComplete={() => { setShowCreateRestaurant(false); loadRestaurant(); }} onCancel={() => setShowCreateRestaurant(false)} />
            </div>
          ) : (
            <div className="bg-[#111] rounded-lg shadow border border-white/5 p-8 text-center">
              <UtensilsCrossed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Your Restaurant Portal</h2>
              <button onClick={() => setShowCreateRestaurant(true)} className="px-6 py-3 bg-cyan-500 text-gray-900 rounded-lg hover:bg-cyan-400 font-bold transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]">Setup Your Restaurant</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'restaurant' as TabType, label: 'Restaurant Info', icon: Building2 },
    { id: 'locations' as TabType, label: 'Branches', icon: MapPin },
    { id: 'categories' as TabType, label: 'Categories', icon: Folder },
    { id: 'menu' as TabType, label: 'Menu Items', icon: UtensilsCrossed },
    { id: 'orders' as TabType, label: 'Orders', icon: ClipboardList },
    { id: 'preview' as TabType, label: 'Menu Preview', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0B0B] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <RestaurantOwnerHeader
        restaurantName={restaurant.name}
        onLogout={handleLogout}
        onSaveToAI={handleSaveToAI}
        aiSaving={aiSaving}
        aiStatus={aiStatus}
      />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
            Restaurant Owner Portal
          </h1>
          <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            <Building2 className="w-4 h-4 mr-2 text-cyan-500" />
            <span>Management & Insights Hub</span>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="sticky top-20 z-40 bg-[#F9FAFB]/80 dark:bg-[#0B0B0B]/80 backdrop-blur-md mb-8 border-b border-gray-200 dark:border-white/5 mx-[-2rem] px-8 py-2">
          <nav className="flex space-x-10 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative pb-5 text-sm font-bold tracking-widest uppercase flex items-center gap-2.5 transition-all outline-none whitespace-nowrap ${
                    isActive ? 'text-cyan-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-500' : ''}`} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="animate-fade-in">
          <div className={activeTab === 'restaurant' ? 'block' : 'hidden'}>
            {visitedTabs.has('restaurant') && restaurant && (
              <RestaurantInfo
                restaurant={restaurant}
                onUpdate={handleUpdateRestaurant}
                loading={loading}
                locations={locations}
              />
            )}
          </div>
          <div className={activeTab === 'locations' ? 'block' : 'hidden'}>
            {visitedTabs.has('locations') && restaurant && <LocationsTab restaurantId={restaurant.restaurant_id} />}
          </div>
          <div className={activeTab === 'categories' ? 'block' : 'hidden'}>
            {visitedTabs.has('categories') && restaurant && <CategoriesTab restaurantId={restaurant.restaurant_id} />}
          </div>
          <div className={activeTab === 'menu' ? 'block' : 'hidden'}>
            {visitedTabs.has('menu') && restaurant && <MenuItemsTab restaurantId={restaurant.restaurant_id} />}
          </div>
          <div className={activeTab === 'orders' ? 'block' : 'hidden'}>
            {visitedTabs.has('orders') && restaurant && <OrdersTab restaurantId={restaurant.restaurant_id} locations={locations} />}
          </div>
          <div className={activeTab === 'preview' ? 'block' : 'hidden'}>
            {visitedTabs.has('preview') && restaurant && <MenuPreview restaurantId={restaurant.restaurant_id} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantOwnerDashboard;
