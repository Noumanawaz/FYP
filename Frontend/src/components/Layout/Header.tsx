import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, ShoppingCart, User, Bell, Menu, X, ChevronDown, Mic, LogOut, Settings } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import LocationSelector from "../Location/LocationSelector";
import VoiceOrderModal from "../Voice/VoiceOrderModal";
import { apiService } from "../../services/api";

// Custom VOCABITE Logo Component
const VOCABITELogo: React.FC = () => {
  return (
    <div className="flex items-center text-2xl sm:text-3xl font-bold text-blue-800" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* V */}
      <span className="text-blue-800">V</span>

      {/* Microphone Icon - using Lucide icon */}
      <div className="mx-1">
        <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-blue-800" />
      </div>

      {/* C */}
      <span className="text-blue-800 relative">
        C{/* Bite marks */}
        <div className="absolute -top-1 left-0 w-2 h-1 bg-white rounded-full"></div>
        <div className="absolute -bottom-1 left-0 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* A */}
      <span className="text-blue-800 relative">
        A{/* Bite mark */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* B */}
      <span className="text-blue-800 relative">
        B{/* Bite mark */}
        <div className="absolute -top-1 left-0 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* I */}
      <span className="text-blue-800">I</span>

      {/* T */}
      <span className="text-blue-800 relative">
        T{/* Bite mark */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* E */}
      <span className="text-blue-800">E</span>
    </div>
  );
};

const Header: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [language, setLanguage] = useState("EN");

  const cartItemCount = state.cart.items.reduce((total, item) => total + item.quantity, 0);
  const unreadNotifications = state.notifications.filter((n) => !n.isRead).length;

  const handleVoiceOrder = (orderText: string) => {
    alert(`🎤 Voice Order Processed Successfully!\n\n${orderText}\n\n✅ In a real app, this would be added to your cart and you could proceed to checkout.`);
  };

  const handleLogout = () => {
    // Clear all tokens from API service (this will also clear localStorage)
    apiService.clearTokens();
    
    // Clear user state
    dispatch({ type: 'LOGOUT' });
    
    // Close user menu
    setIsUserMenuOpen(false);
  };

  const isAuthenticated = state.isAuthenticated && state.user;

  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex items-center">
                <VOCABITELogo />
              </div>
              <div>
                <div className="text-xs text-gray-500 -mt-1">Voice Ordering</div>
              </div>
            </Link>

            {/* Desktop Middle */}
            {isAuthenticated && (
              <div className="hidden lg:flex items-center flex-1 mx-8 space-x-4">
                {/* Location */}
                <button onClick={() => setIsLocationOpen(true)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200 min-w-0 flex-shrink-0">
                  <div className="flex-shrink-0">
                    <MapPin className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">Deliver to</div>
                    <div className="text-xs text-gray-500 truncate">{state.selectedAddress?.label || "Select Location"}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </button>

                {/* Search Bar */}
                <div className="relative flex-1 max-w-2xl">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="text" placeholder="Search Pakistani restaurants, dishes..." className="w-full pl-12 pr-14 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500" />
                    <button onClick={() => setIsVoiceModalOpen(true)} className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Voice Order">
                      <Mic className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Notifications */}
              {isAuthenticated && (
                <button className="relative p-3 rounded-xl hover:bg-gray-100 transition-all duration-200">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">{unreadNotifications}</span>}
                </button>
              )}

              {/* User / Login */}
              {/* User Menu / Auth Buttons */}
              {state.isAuthenticated ? (
                // Logged-in state
                <div className="relative flex items-center space-x-2">
                  <div className="relative">
                    <button 
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-100 transition-all duration-200"
                    >
                      <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <span className="hidden md:block text-sm font-semibold text-gray-900">{state.user?.name}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* User Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{state.user?.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{state.user?.email || state.user?.phone}</p>
                        </div>
                        <ul className="py-2">
                          <li>
                            <Link
                              to="/dashboard"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                            >
                              <User className="w-4 h-4" />
                              <span>My Dashboard</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/profile"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                            >
                              <Settings className="w-4 h-4" />
                              <span>Account Settings</span>
                            </Link>
                          </li>
                          <li>
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-red-600"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Logout</span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <Link to="/cart" className="relative p-3 rounded-xl hover:bg-gray-100 transition-all duration-200">
                    <ShoppingCart className="w-5 h-5 text-gray-600" />
                    {cartItemCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center font-semibold">{cartItemCount}</span>}
                  </Link>
                </div>
              ) : (
                // Not logged-in state
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {!state.isAuthenticated && (
                    <Link
                      to="/login"
                      className="bg-gray-900 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                    >
                      Login
                    </Link>
                  )}
                  <Link to="/signup" className="hidden sm:inline-flex bg-white text-gray-900 px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-semibold">
                    Sign up for free delivery
                  </Link>
                  <div className="relative">
                    <button onClick={() => setIsLangOpen(!isLangOpen)} className="hidden sm:flex items-center space-x-2 px-4 py-3 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200">
                      <span className="text-sm font-medium text-gray-700">{language}</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>

                    {isLangOpen && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        <ul className="flex flex-col">
                          <li
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 transition-colors"
                            onClick={() => {
                              setLanguage("EN");
                              setIsLangOpen(false);
                            }}
                          >
                            English
                          </li>
                          <li
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 transition-colors"
                            onClick={() => {
                              setLanguage("FR");
                              setIsLangOpen(false);
                            }}
                          >
                            French
                          </li>
                          <li
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 transition-colors"
                            onClick={() => {
                              setLanguage("UR");
                              setIsLangOpen(false);
                            }}
                          >
                            Urdu
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <Link to={state.isAuthenticated ? "/cart" : "#"} className={`relative p-3 rounded-xl transition-all duration-200 ${state.isAuthenticated ? "hover:bg-gray-100 text-gray-600" : "text-gray-400 cursor-not-allowed"}`}>
                    <ShoppingCart className="w-5 h-5" />
                    {cartItemCount > 0 && state.isAuthenticated && <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center font-semibold">{cartItemCount}</span>}
                  </Link>
                </div>
              )}

              {/* Mobile Menu */}
              <button className="lg:hidden p-3 rounded-xl hover:bg-gray-100 transition-all duration-200" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
              <Link to="/" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
                Home
              </Link>
              <Link to="/restaurants" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
                Restaurants
              </Link>
              <Link to="/vocabite-mart" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
                Vocabite Mart
              </Link>
              <Link to="/orders" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
                Orders
              </Link>
              {!isAuthenticated && (
                <Link to="/login" className="block px-3 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600">
                  Login
                </Link>
              )}

              {/* Mobile language selector */}
              <div className="px-3">
                <button onClick={() => setIsLangOpen(!isLangOpen)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">Language: {language}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {isLangOpen && (
                  <div className="mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <ul className="flex flex-col">
                      <li
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                        onClick={() => {
                          setLanguage("EN");
                          setIsLangOpen(false);
                        }}
                      >
                        English
                      </li>
                      <li
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                        onClick={() => {
                          setLanguage("FR");
                          setIsLangOpen(false);
                        }}
                      >
                        French
                      </li>
                      <li
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
                        onClick={() => {
                          setLanguage("UR");
                          setIsLangOpen(false);
                        }}
                      >
                        Urdu
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modals */}
      <LocationSelector isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} />
      <VoiceOrderModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onOrderSubmit={handleVoiceOrder} />
      
      {/* Close user menu when clicking outside */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
