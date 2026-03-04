import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import { LogOut, Building2, ClipboardList, MapPin } from 'lucide-react';
import OrdersTab from '../RestaurantOwner/components/OrdersTab';
import { VOCABITELogo } from "../../components/Layout/Header";

interface Restaurant {
  restaurant_id: string;
  name: string;
  logo_url?: string;
}

type TabType = 'orders';

const BranchDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const user = state.user;
  const navigate = useNavigate();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(new Set(['orders']));

  const hasLoaded = React.useRef(false);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set(prev).add(tab));
  };

  useEffect(() => {
    if (!user || user.role !== 'branch_user') {
      if (!user) setLoading(true);
      return;
    }
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadDashboardData();
  }, [user?.user_id, user?.role]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    // Fallbacks if user lacks restaurant_id or location_id
    // But we'll try to fetch getMyRestaurant. Wait, branch users don't own the restaurant, 
    // so `getMyRestaurant` might not work if it checks owner_id. 
    // Let's just use the OrdersTab. Wait, OrdersTab needs a restaurantId prop! 
    // In our auth context, does branch_user have restaurant_id in token? 
    // Currently `apiService.login` doesn't strictly provide `restaurant_id` in User type unless fetched.
    // Let's rely on standard GET /api/v1/restaurants/:id if they have it, 
    // or just let OrdersTab use the user's context directly if possible.

    try {
      // Actually, we can fetch the user's details which includes restaurant_id
      const userRes = await apiService.getUser(user!.id);
      if (userRes.success && userRes.data) {
        const branchUserId = userRes.data.user_id;
        const assignedRestaurantId = userRes.data.restaurant_id;
        
        if (!assignedRestaurantId) {
          setError('No restaurant assigned to your branch account.');
          setLoading(false);
          return;
        }

        // Fetch location list to pass to OrdersTab for display/matching
        try {
          const locRes = await apiService.getRestaurantLocations(assignedRestaurantId);
          setLocations(Array.isArray(locRes.data) ? locRes.data : []);
        } catch {
          setLocations([]);
        }

        setRestaurant({
          restaurant_id: assignedRestaurantId,
          name: "Your Assigned Restaurant",
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.setToken(null);
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
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

  if (user.role !== 'branch_user') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <p className="text-red-400">Access denied. This page is for branch managers only.</p>
        </div>
      </div>
    );
  }

  if (loading && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading branch data...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'orders' as TabType, label: 'Branch Orders', icon: ClipboardList }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="mb-4 inline-block">
              <Link to="/"><VOCABITELogo /></Link>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 mt-2">
              Branch Owner Portal
            </h1>
            <div className="flex items-center text-sm text-gray-400">
              <MapPin className="w-4 h-4 mr-1.5" />
              <span>Welcome, {user.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5 rounded-full font-medium text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-10 w-full overflow-x-auto scrollbar-hide">
          <nav className="inline-flex p-1.5 space-x-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors outline-none ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-300 rounded-xl"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          <div className={activeTab === 'orders' ? 'block' : 'hidden'}>
            {visitedTabs.has('orders') && restaurant && (
              <OrdersTab restaurantId={restaurant.restaurant_id} locations={locations} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;
