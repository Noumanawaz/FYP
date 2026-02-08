import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MapPin,
  Search,
  ShoppingCart,
  User,
  Bell,
  Menu,
  X,
  ChevronDown,
  Mic,
  LogOut,
  Settings,
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import LocationSelector from "../Location/LocationSelector";
import VoiceOrderModal from "../Voice/VoiceOrderModal";
import { apiService } from "../../services/api";

// Custom VOCABITE Logo Component
const VOCABITELogo: React.FC = () => {
  return (
    <div
      className="flex items-center text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-900"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* V */}
      <span className="text-blue-900">V</span>

      {/* Microphone Icon - using Lucide icon */}
      <div className="mx-1 relative">
        <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
        </span>
      </div>

      {/* C */}
      <span className="text-blue-900 relative">
        C{/* Bite marks */}
        <div className="absolute -top-1 left-0 w-2 h-1 bg-white rounded-full"></div>
        <div className="absolute -bottom-1 left-0 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* A */}
      <span className="text-blue-900 relative">
        A{/* Bite mark */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* B */}
      <span className="text-blue-900 relative">
        B{/* Bite mark */}
        <div className="absolute -top-1 left-0 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* I */}
      <span className="text-blue-900">I</span>

      {/* T */}
      <span className="text-blue-900 relative">
        T{/* Bite mark */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-white rounded-full"></div>
      </span>

      {/* E */}
      <span className="text-blue-900">E</span>
    </div>
  );
};

const Header: React.FC = () => {
  const { state, dispatch } = useApp();
  const location = useLocation();
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
      `🎤 Voice Order Processed Successfully!\n\n${orderText}\n\n✅ In a real app, this would be added to your cart and you could proceed to checkout.`,
    );
  };

  const handleLogout = () => {
    // Clear all tokens from API service (this will also clear localStorage)
    apiService.clearTokens();

    // Clear user state
    dispatch({ type: "LOGOUT" });

    // Close user menu
    setIsUserMenuOpen(false);
  };

  const isAuthenticated = state.isAuthenticated && state.user;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50"
            : "bg-white shadow-sm border-b border-gray-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <div className="flex items-center transition-transform duration-300 group-hover:scale-105">
                <VOCABITELogo />
              </div>
              <div className="ml-3 hidden sm:block">
                <div className="text-xs font-medium text-primary-600 tracking-wider uppercase bg-primary-50 px-2 py-0.5 rounded-full">
                  Voice Ordering
                </div>
              </div>
            </Link>

            {/* Desktop Middle */}
            {isAuthenticated && (
              <div className="hidden lg:flex items-center flex-1 mx-8 space-x-6">
                {/* Location */}
                <button
                  onClick={() => setIsLocationOpen(true)}
                  className="flex items-center space-x-3 px-4 py-2.5 rounded-full hover:bg-gray-100/80 transition-all duration-300 border border-transparent hover:border-gray-200 group min-w-0 flex-shrink-0"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs text-gray-500 font-medium">
                      Deliver into
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                      {state.selectedAddress?.label || "Select Location"}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                </button>

                {/* Search Bar */}
                <div className="relative flex-1 max-w-2xl group">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search Pakistani restaurants, dishes..."
                      className="w-full pl-12 pr-14 py-3 bg-gray-50 border-transparent focus:bg-white border-2 focus:border-primary-500/50 rounded-2xl focus:ring-4 focus:ring-primary-500/10 transition-all duration-300 text-gray-900 placeholder-gray-500 shadow-sm"
                    />
                    <button
                      onClick={() => setIsVoiceModalOpen(true)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-105 transition-all duration-300 shadow-sm"
                      title="Voice Order"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              {isAuthenticated && (
                <button className="relative p-3 rounded-full hover:bg-gray-100 transition-all duration-200 group">
                  <Bell className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </button>
              )}

              {/* User / Login */}
              {state.isAuthenticated ? (
                // Logged-in state
                <div className="relative flex items-center space-x-3">
                  <Link
                    to="/cart"
                    className="relative p-3 rounded-full hover:bg-gray-100 transition-all duration-200 group mr-1"
                  >
                    <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-sm animate-bounce">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-3 p-1.5 pl-3 pr-2 rounded-full hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200"
                    >
                      <span className="hidden md:block text-sm font-semibold text-gray-700">
                        {state.user?.name}
                      </span>
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-sm text-white">
                        <User className="w-4 h-4" />
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* User Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-slide-up origin-top-right">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {state.user?.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {state.user?.email || state.user?.phone}
                          </p>
                        </div>
                        <ul className="py-2">
                          <li>
                            <Link
                              to="/dashboard"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center space-x-3 px-6 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                              <span className="font-medium">My Dashboard</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/profile"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center space-x-3 px-6 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                            >
                              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Settings className="w-4 h-4" />
                              </div>
                              <span className="font-medium">
                                Account Settings
                              </span>
                            </Link>
                          </li>
                          <li className="border-t border-gray-100 mt-2 pt-2">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center space-x-3 px-6 py-3 hover:bg-red-50 transition-colors text-sm text-red-600"
                            >
                              <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                <LogOut className="w-4 h-4" />
                              </div>
                              <span className="font-medium">Logout</span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Not logged-in state
                <div className="flex items-center space-x-3">
                  <div className="relative hidden sm:block">
                    <button
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 font-medium text-sm"
                    >
                      <span>{language}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {isLangOpen && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-slide-up">
                        {["EN", "FR", "UR"].map((lang) => (
                          <div
                            key={lang}
                            onClick={() => {
                              setLanguage(lang);
                              setIsLangOpen(false);
                            }}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
                          >
                            {lang === "EN"
                              ? "English"
                              : lang === "FR"
                                ? "French"
                                : "Urdu"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!state.isAuthenticated && (
                    <Link
                      to="/login"
                      className="text-gray-900 font-semibold text-sm hover:text-primary-600 px-4 py-2 transition-colors"
                    >
                      Login
                    </Link>
                  )}
                  <Link
                    to="/signup"
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-gray-800 hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm font-semibold shadow-md"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-gray-900" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-900" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 py-4 space-y-2 animate-fade-in bg-white absolute inset-x-0 px-4 shadow-lg rounded-b-2xl">
              <Link
                to="/"
                className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium"
              >
                Home
              </Link>
              <Link
                to="/restaurants"
                className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium"
              >
                Restaurants
              </Link>

              {!isAuthenticated && (
                <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-3">
                  <Link
                    to="/login"
                    className="w-full text-center py-3 rounded-xl border border-gray-200 font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full text-center py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 lg:h-20"></div>

      {/* Modals */}
      <LocationSelector
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onOrderSubmit={handleVoiceOrder}
      />

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
