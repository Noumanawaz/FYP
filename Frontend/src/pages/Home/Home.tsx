import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, Star, ChevronRight, ChevronDown } from "lucide-react";
import { mockRestaurants } from "../../data/mockData";
import { ShoppingCart } from "lucide-react";
import VoiceOrderModal from "../../components/Voice/VoiceOrderModal";
import { useApp } from "../../contexts/AppContext";
import BlurText from "../../components/Common/BlurText";

// ⬇️ Map imports
// ⬇️ add Circle import
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
// Fix marker icon paths (Vite/CRA bundlers need explicit imports)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper to recentre map when we get coords
const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
};

const Home: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      navigate("/dashboard", { replace: true });
    }
  }, [state.isAuthenticated, state.user, navigate]);

  // ⬇️ State for the location modal + geolocation
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // ⬇️ State for voice order modal
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const handleVoiceOrder = (orderData: any) => {
    console.log("Voice order received:", orderData);
    // Handle voice order logic here
    setIsVoiceModalOpen(false);
  };

  const handleLocate = () => {
    setIsMapOpen(true);
    setLocError(null);
    setLoadingLoc(true);

    if (!("geolocation" in navigator)) {
      setLocError("Geolocation is not supported by your browser.");
      setLoadingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLoc(false);
      },
      (err) => {
        setLocError(`Unable to get location: ${err.message}`);
        setLoadingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="w-full bg-gradient-to-br from-slate-900 via-gray-900 to-black h-[85vh] flex items-center relative overflow-hidden">
        {/* Background Image with Low Opacity */}
        <div className="absolute inset-0 opacity-20">
          <img
            src="/hamburger-494706.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 w-full">
          {/* Main Layout - Left: BlurText Animation, Right: Action Card */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: BlurText Animation */}
            <div className="flex flex-col justify-center items-center text-center">
              <BlurText
                text="Isn't this so cool?!"
                delay={200}
                animateBy="words"
                direction="top"
                onAnimationComplete={() => console.log('Animation completed!')}
                className="text-[5rem] md:text-[6rem] leading-tight font-bold text-white mb-8 tracking-wider justify-center w-full"
                style={{ fontFamily: "Comic Sans MS, cursive" }}
              />
            </div>

            {/* Right Side: Action Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-lg">
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-6 shadow-2xl">
                  {/* Address Input Section */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Where should we deliver?</h3>
                    <div className="relative mb-4">
                      <input type="text" placeholder="Enter your address for Pakistani cuisine delivery" className="w-full px-5 py-3 pr-12 bg-white/20 border border-white/30 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-white placeholder-gray-300 backdrop-blur-sm text-sm" />
                      <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors" onClick={handleLocate}>
                        <MapPin className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quick Search Options */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-300 mb-2">Popular Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {["Karachi", "Lahore", "Islamabad", "Rawalpindi"].map((city) => (
                          <button key={city} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full border border-white/20 transition-colors">
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Voice Order Section */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-1.5">Ready to order?</h3>
                    <p className="text-gray-300 mb-4 text-sm">Try our revolutionary voice ordering</p>

                    <button className="group bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full border border-gray-600 hover:border-gray-500" onClick={() => setIsVoiceModalOpen(true)}>
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-base">Start Voice Order</span>
                      </div>
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-3">
                      or{" "}
                      <Link to="/restaurants" className="text-cyan-400 cursor-pointer hover:underline">
                        browse restaurants manually
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid - Below the main layout */}
          <div className="mt-16 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">Voice Commands</h3>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">Pakistani Cuisine</h3>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">AI-Powered</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Restaurants Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
              <div className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse"></div>
              Featured Restaurants
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Featured Pakistani Restaurants</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">Discover authentic flavors from top Pakistani restaurants with our curated selection of the finest dining experiences</p>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
              <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                <span className="font-medium text-gray-700">Voice Ordering Available</span>
              </div>
              <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="font-medium text-gray-700">Authentic Pakistani Cuisine</span>
              </div>
              <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="font-medium text-gray-700">Fast Delivery</span>
              </div>
            </div>
          </div>

          {/* Enhanced Carousel Container */}
          <div className="relative">
            {/* Navigation Controls */}
            <div className="absolute -top-16 right-0 hidden sm:flex space-x-3 z-10">
              <button
                onClick={() => {
                  const carousel = document.getElementById("restaurants-carousel");
                  if (carousel) carousel.scrollBy({ left: -350, behavior: "smooth" });
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200"
              >
                <ChevronRight className="w-6 h-6 rotate-180 text-gray-700" />
              </button>
              <button
                onClick={() => {
                  const carousel = document.getElementById("restaurants-carousel");
                  if (carousel) carousel.scrollBy({ left: 350, behavior: "smooth" });
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* Restaurant Cards */}
            <div id="restaurants-carousel" className="flex overflow-x-auto scrollbar-hide space-x-6 sm:space-x-8 scroll-smooth" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {mockRestaurants.slice(0, 6).map((restaurant) => (
                <Link key={restaurant.id} to={`/restaurant/${restaurant.id}`} className="group w-[260px] sm:w-[320px] flex-shrink-0">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full border border-gray-100 hover:border-primary-200">
                    {/* Image Container */}
                    <div className="relative overflow-hidden">
                      <img src={restaurant.image} alt={restaurant.name} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Promo badge */}
                      {restaurant.promo && <div className="absolute top-4 left-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">{restaurant.promo.title}</div>}

                      {/* Voice ordering badge */}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-primary-600 px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-1.5 animate-pulse"></div>
                          Voice Order
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors duration-200 truncate pr-2">{restaurant.name}</h3>
                        <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-semibold text-gray-800 ml-1">{restaurant.rating}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">{restaurant.description}</p>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700">({restaurant.reviewCount})+ orders</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-primary-500" />
                          <span className="font-medium">{restaurant.deliveryTime}</span>
                        </div>
                      </div>

                      {/* Delivery info */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center text-gray-600">
                          <ShoppingCart className="w-4 h-4 mr-2 text-primary-500" />
                          <span className="text-sm font-medium">₨{restaurant.deliveryFee ?? 0} Delivery</span>
                        </div>
                        <div className="text-primary-600 text-sm font-semibold group-hover:text-primary-700 transition-colors">Order Now →</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* View All Button */}
          <div className="text-center mt-12">
            <Link to="/restaurants" className="inline-flex items-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
              View All Restaurants
              <ChevronRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Partner With Us Section */}
      <section className="relative py-16">
        {/* Full-width image */}
        <div className="w-full h-[420px] relative">
          <img src="/home-vendor-pk.webp" alt="Partner with us" className="w-full h-full object-cover" />

          {/* White Card overlapping bottom left */}
          <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 md:left-16 md:translate-x-0 bg-white rounded-xl shadow-lg p-8 max-w-xl w-[90%]">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Partner with Vocabite</h2>
            <p className="text-gray-700 mb-4">Join Pakistan's premier voice-ordering platform and reach customers through innovative AI-powered ordering.</p>
            <p className="text-gray-700 mb-4">We help Pakistani restaurants showcase their authentic cuisine, process voice orders, and deliver exceptional experiences to food lovers across the country.</p>
            <p className="text-gray-700 mb-6">Ready to revolutionize your restaurant's ordering experience?</p>
            <Link to="/partner">
              <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium transition-colors">Partner with Us</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Cities Section removed by request */}

      {/* Take your office out to lunch */}
      <section className="relative py-16">
        {/* Heading */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Vocabite for Business</h2>
        </div>

        {/* Full-width image */}
        <div className="w-full h-[420px] relative">
          <img src="/home-corporate-pk.webp" alt="Partner with us" className="w-full h-full object-cover" />

          {/* White Card overlapping bottom */}
          <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 md:left-16 md:translate-x-0 bg-white rounded-xl shadow-lg p-8 max-w-xl w-[90%]">
            <h4 className="text-3xl md:text-3xl font-bold text-gray-700">Vocabite for Business</h4>
            <p className="text-gray-700 mb-6">Streamline corporate catering with voice ordering. Perfect for office lunches, corporate events, client meetings, and team gatherings with authentic Pakistani cuisine.</p>
            <Link to="/partner">
              <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium transition-colors">Get Started</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Vocabite Info & FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-left">Order authentic Pakistani cuisine with voice commands on Vocabite</h2>

          {/* Paragraphs */}
          <p className="text-gray-700 mb-4 text-left">Craving authentic Pakistani flavors? Looking for a convenient way to order your favorite biryani, karahi, or kebabs? Vocabite is Pakistan's first voice-ordering platform that brings you the best Pakistani restaurants and authentic cuisine through innovative AI-powered voice commands. Simply speak your order and enjoy a seamless dining experience.</p>

          <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 text-left">What makes Vocabite special?</h3>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1 text-left">
            <li>Revolutionary voice ordering technology powered by AI</li>
            <li>Curated selection of authentic Pakistani restaurants and cuisine</li>
            <li>Intelligent voice recognition that understands context and preferences</li>
            <li>Seamless integration with traditional ordering methods</li>
            <li>Fast and reliable delivery across major Pakistani cities</li>
          </ul>

          <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 text-left">Frequently Asked Questions</h3>

          {/* Stylish FAQ Accordion */}
          <FAQAccordion />
        </div>
      </section>

      {/* ⬇️ LOCATION MAP MODAL */}
      {isMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[95%] max-w-3xl rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Your current location</h3>
              <button onClick={() => setIsMapOpen(false)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {loadingLoc && <div className="text-sm text-gray-600">Finding your location…</div>}
              {locError && <div className="text-sm text-red-600">{locError}</div>}

              <div className="h-[420px] rounded-xl overflow-hidden border">
                <MapContainer
                  center={coords ? [coords.lat, coords.lng] : [24.8607, 67.0011]} // Karachi fallback
                  zoom={coords ? 13 : 13}
                  className="h-full w-full relative"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

                  {coords && (
                    <>
                      <Marker position={[coords.lat, coords.lng]}>
                        <Popup>You are here</Popup>
                      </Marker>

                      {/* Circle with 15km radius */}
                      <Circle
                        center={[coords.lat, coords.lng]}
                        radius={15000} // 15 km
                        pathOptions={{ color: "blue", fillColor: "skyblue", fillOpacity: 0.2 }}
                      />

                      <Recenter lat={coords.lat} lng={coords.lng} />
                    </>
                  )}

                  {/* Always visible button in bottom-right */}
                  <div className="absolute bottom-4 right-4 z-[1000]">
                    <button onClick={handleLocate} className="p-3 rounded-full shadow bg-white hover:bg-gray-100 border border-gray-300" aria-label="Locate">
                      <MapPin className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                </MapContainer>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setIsMapOpen(false)} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
                  Close
                </button>
                {/* Optional: wire this to use coords in your address input later */}
                <button onClick={() => setIsMapOpen(false)} className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700">
                  Use this location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Order Modal */}
      <VoiceOrderModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onOrderSubmit={handleVoiceOrder} />
    </div>
  );
};

export default Home;

// Lightweight accordion for FAQ
const FAQAccordion: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs: { q: string; a: string }[] = [
    {
      q: "How does voice ordering work on Vocabite?",
      a: 'Simply click the voice order button or say "Hey Vocabite" to start. Our AI will understand your order, ask clarifying questions if needed, and process your request. You can also browse restaurants traditionally and use voice commands for specific items.',
    },
    {
      q: "What Pakistani cuisines are available on Vocabite?",
      a: "Vocabite features authentic Pakistani restaurants offering biryani, karahi, kebabs, naan, traditional sweets, lassi, and much more. We curate the best Pakistani restaurants in your area to ensure authentic flavors and quality.",
    },
    {
      q: "Does Vocabite deliver 24 hours?",
      a: "Yes, Vocabite offers 24-hour delivery in major Pakistani cities. However, restaurant availability may vary during late hours. You can check which restaurants are open by using our voice assistant or browsing the app.",
    },
    {
      q: "Can I pay cash for Vocabite orders?",
      a: "Yes, Vocabite supports cash on delivery for all orders in Pakistan. We also accept credit/debit cards and digital wallets for online payments.",
    },
    {
      q: "How accurate is the voice recognition?",
      a: "Our AI-powered voice recognition is highly accurate and trained specifically for Pakistani cuisine terminology. It understands various accents and can process complex orders with multiple items and customizations.",
    },
    {
      q: "Can I order for someone else using voice commands?",
      a: 'Yes, you can specify delivery details and recipient information through voice commands. Just say "deliver to [address]" or "for [person\'s name]" and our AI will handle the rest.',
    },
    {
      q: "What if the voice assistant doesn't understand my order?",
      a: "Our AI will ask clarifying questions to ensure accuracy. You can also switch to traditional text-based ordering at any time. The system learns from interactions to improve recognition over time.",
    },
    {
      q: "Which cities does Vocabite serve?",
      a: "Vocabite currently serves major Pakistani cities including Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, and more. We're expanding to additional cities regularly.",
    },
    {
      q: "Is there a minimum order amount?",
      a: "Minimum order amounts vary by restaurant and are clearly displayed during the ordering process. Many restaurants offer free delivery above certain thresholds.",
    },
    {
      q: "How does Vocabite ensure food quality?",
      a: "We partner only with verified, high-quality Pakistani restaurants. Each partner undergoes strict quality checks and customer feedback monitoring to maintain our standards.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {faqs.map((item, idx) => {
        const open = openIdx === idx;
        return (
          <button key={idx} onClick={() => setOpenIdx(open ? null : idx)} className={`text-left bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow transition-shadow ${open ? "ring-2 ring-primary-100" : ""}`} aria-expanded={open}>
            <div className="flex items-start justify-between">
              <h4 className="text-gray-900 font-semibold pr-6 text-base sm:text-lg">{item.q}</h4>
              <span className={`ml-3 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 transition-transform ${open ? "rotate-180" : ""}`}>
                <ChevronDown className="w-5 h-5" />
              </span>
            </div>
            <div className={`mt-3 text-gray-600 text-sm sm:text-base leading-relaxed overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>{item.a}</div>
          </button>
        );
      })}
      <div className="md:col-span-2">
        <div className="mt-4 text-gray-600 text-sm">Experience the future of food ordering with Vocabite — where authentic Pakistani cuisine meets cutting-edge voice technology!</div>
      </div>
    </div>
  );
};
