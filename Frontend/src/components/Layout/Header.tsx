import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MapPin, Search, ShoppingCart, User, Bell, Menu, X, ChevronDown, Mic, LogOut, Settings, Navigation
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import LocationSelector from "../Location/LocationSelector";
import VoiceOrderModal from "../Voice/VoiceOrderModal";
import { apiService } from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setFilters } from "../../store/slices/restaurantsSlice";
import { motion, AnimatePresence } from "framer-motion";

// Custom VOCABITE Logo Component
const VOCABITELogo: React.FC = () => {
  return (
    <div
      className="flex items-center text-2xl sm:text-3xl font-extrabold tracking-tight group"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <span className="text-white group-hover:text-cyan-400 transition-colors duration-300">V</span>
      
      {/* Microphone Icon */}
      <div className="mx-1 relative">
        <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
        </span>
      </div>

      <span className="text-white group-hover:text-cyan-400 transition-colors duration-300">CABITE</span>
    </div>
  );
};

const Header: React.FC = () => {
  const { state, dispatch: contextDispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const reduxDispatch = useAppDispatch();
  const searchFilter = useAppSelector((state) => state.restaurants.filters.search);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    reduxDispatch(setFilters({ search: e.target.value }));
    if (location.pathname !== '/restaurants' && e.target.value.trim() !== '') {
       navigate('/restaurants');
    }
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [language, setLanguage] = useState("EN");
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cartItemCount = state.cart.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const unreadNotifications = state.notifications.filter(
    (n) => !n.isRead,
  ).length;

  const handleVoiceOrder = (orderText: string) => {
    alert(
      `🎤 Voice Order Processed Successfully!\n\n${orderText}\n\n✅ In a real app, this would be added to your cart.`
    );
  };

  const handleLogout = () => {
    apiService.clearTokens();
    contextDispatch({ type: "LOGOUT" });
    setIsUserMenuOpen(false);
  };

  const isAuthenticated = state.isAuthenticated && state.user;

  // Header Animation Configuration
  const headerClasses = `fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
    scrolled
      ? "bg-[#050505]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-white/5"
      : "bg-[#050505] border-b border-transparent"
  }`;

  return (
    <>
      <header className={headerClasses}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 lg:h-24">
            
            {/* Logo */}
            <Link to="/" className="flex items-center group relative z-10">
              <VOCABITELogo />
              <div className="ml-4 hidden sm:block">
                <div className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-shadow">
                  Voice First
                </div>
              </div>
            </Link>

            {/* Middle Section - Search & Location */}
            {isAuthenticated && (
              <div className="hidden lg:flex items-center flex-1 mx-12 space-x-6">
                
                {/* Modern Location Selector */}
                <button
                  onClick={() => setIsLocationOpen(true)}
                  className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 group shadow-inner"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Deliver to</div>
                    <div className="text-sm font-semibold text-white truncate max-w-[150px]">
                      {state.selectedAddress?.label || "Set Location"}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </button>

                {/* Sleek Search Bar */}
                <div className="relative flex-1 max-w-xl group">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-hover:text-cyan-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search for Karahi, Biryani or restaurants..."
                      value={searchFilter}
                      onChange={handleSearchChange}
                      className="w-full pl-12 pr-16 py-3.5 bg-[#111] border border-gray-800 focus:border-cyan-500/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 transition-all text-white placeholder-gray-500 outline-none shadow-inner"
                    />
                    
                    {/* Floating Glow on focus */}
                    <div className="absolute inset-0 -z-10 rounded-2xl bg-cyan-500/0 group-focus-within:bg-cyan-500/5 blur-xl transition-all duration-500 pointer-events-none"></div>

                    <button
                      onClick={() => setIsVoiceModalOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-900 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
                      title="Voice Order"
                    >
                      <Mic className="w-4 h-4 font-bold" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center space-x-3 sm:space-x-5 relative z-10">
              
              {/* Notifications */}
              {isAuthenticated && (
                <button className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                  <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#050505] shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
                  )}
                </button>
              )}

              {state.isAuthenticated ? (
                <div className="flex items-center space-x-3 sm:space-x-4">
                  
                  {/* Cart */}
                  <Link
                    to="/cart"
                    className="relative p-2.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all group"
                  >
                    <ShoppingCart className="w-5 h-5 text-cyan-400" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cyan-500 text-gray-900 text-xs font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>

                  {/* User Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-inner">
                        <span className="text-white text-xs font-bold">{state.user?.name?.charAt(0) || 'U'}</span>
                      </div>
                      <span className="hidden md:block text-sm font-semibold text-white">
                        {state.user?.name}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-3 w-64 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-5 border-b border-white/5 bg-gray-950">
                            <p className="text-sm font-bold text-white mb-0.5">{state.user?.name}</p>
                            <p className="text-xs text-gray-500">{state.user?.email || state.user?.phone}</p>
                          </div>
                          <div className="p-2 space-y-1">
                            <Link to="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors">
                              <User className="w-4 h-4 text-cyan-400" />
                              <span className="text-sm font-medium text-gray-300">My Dashboard</span>
                            </Link>
                            <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors">
                              <Settings className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-medium text-gray-300">Settings</span>
                            </Link>
                            <div className="h-px bg-white/5 my-1" />
                            <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-500/10 rounded-xl transition-colors text-red-400">
                              <LogOut className="w-4 h-4" />
                              <span className="text-sm font-medium">Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {/* Language Selector */}
                  <div className="relative hidden sm:block">
                    <button
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="flex items-center space-x-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                      <span>{language}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <AnimatePresence>
                      {isLangOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 mt-2 w-32 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 p-1"
                        >
                          {["EN", "FR", "UR"].map((lang) => (
                            <button
                              key={lang}
                              onClick={() => { setLanguage(lang); setIsLangOpen(false); }}
                              className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              {lang === "EN" ? "English" : lang === "FR" ? "French" : "Urdu"}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <Link to="/login" className="text-white font-semibold text-sm hover:text-cyan-400 transition-colors">
                    Login
                  </Link>
                  <Link to="/signup" className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all transform hover:scale-105">
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-gray-950 border-t border-white/5 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-2">
                <Link to="/" className="block px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 font-medium">Home</Link>
                <Link to="/restaurants" className="block px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 font-medium">Restaurants</Link>
                {!isAuthenticated && (
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                    <Link to="/login" className="block w-full text-center py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5">Login</Link>
                    <Link to="/signup" className="block w-full text-center py-3 rounded-xl bg-cyan-500 text-gray-900 font-bold">Sign up</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacers */}
      <div className="h-20 lg:h-24"></div>

      {/* Modals outside header flow */}
      <LocationSelector isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} />
      <VoiceOrderModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onOrderSubmit={handleVoiceOrder} />

      {/* Close handler for user menu */}
      {isUserMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />}
    </>
  );
};

export default Header;
