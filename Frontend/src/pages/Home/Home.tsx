import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, Star, ChevronRight, ChevronDown, ShoppingCart, Mic, Navigation, ArrowRight, PlayCircle } from "lucide-react";
import { mockRestaurants } from "../../data/mockData";
import VoiceOrderModal from "../../components/Voice/VoiceOrderModal";
import { useApp } from "../../contexts/AppContext";
import BlurText from "../../components/Common/BlurText";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

// Map imports
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
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

  // Scroll animations
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      navigate("/dashboard", { replace: true });
    }
  }, [state.isAuthenticated, state.user, navigate]);

  // State
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<string | null>(null);

  const handleVoiceOrder = (orderData: any) => {
    console.log("Voice order received:", orderData);
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

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, y: 0, 
      transition: { type: "spring", stiffness: 100, damping: 12 } 
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-cyan-500/30 text-white overflow-hidden">
      
      {/* 🚀 STUNNING HERO SECTION */}
      <motion.section 
        className="relative w-full min-h-[90vh] flex items-center justify-center pt-24 pb-16 overflow-hidden"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle image overlay */}
          <div className="absolute inset-0 bg-[url('/hamburger-494706.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          
          {/* Glowing Orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px]"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              x: [0, -100, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex-1 w-full text-center lg:text-left z-20"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-cyan-300 text-sm font-semibold tracking-wide">Next-Gen Voice Ordering</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Order <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Faster</span> <br className="hidden md:block" />
              With Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Voice.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
              Experience the magic of AI ordering. Craving authentic Pakistani flavors? Just say the word, and we'll deliver it straight to your door.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={() => {
                  if (!state.isAuthenticated) {
                    navigate('/voice-prompt');
                  } else {
                    setIsVoiceModalOpen(true);
                  }
                }}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-cyan-500 text-gray-900 font-bold rounded-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Mic className="w-5 h-5 relative z-10 group-hover:animate-bounce" />
                <span className="relative z-10">Start Voice Order</span>
              </button>
              
              <Link 
                to="/restaurants"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl transition-all hover:border-white/20 backdrop-blur-md"
              >
                Browse Menu <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Interactive Card */}
          <motion.div 
            initial={{ opacity: 0, x: 50, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.2, type: "spring" }}
            className="flex-1 w-full max-w-md perspective-1000"
          >
            <div className="relative rounded-[2rem] bg-gray-900/40 p-1 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform-gpu hover:-translate-y-2 transition-transform duration-500">
              {/* Glass container inner */}
              <div className="bg-gradient-to-b from-gray-800/80 to-gray-950/80 rounded-[1.9rem] p-6 lg:p-8 outline outline-1 outline-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white">Quick Delivery</h3>
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <Navigation className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative group">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Location</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Set your delivery location" 
                        className="w-full px-5 py-4 pl-12 bg-black/40 border border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-500 transition-all outline-none shadow-inner" 
                        readOnly 
                        value={coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ""}
                      />
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      <button 
                        onClick={handleLocate}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-bold uppercase rounded-lg transition-colors"
                      >
                        Locate Me
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 block ml-1">Popular Cities</label>
                    <div className="flex flex-wrap gap-2">
                      {["Karachi", "Lahore", "Islamabad", "Rawalpindi"].map((city, idx) => (
                        <motion.button 
                          key={city}
                          whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-white/5 border border-white/5 text-gray-300 text-sm rounded-xl transition-colors hover:text-white backdrop-blur-sm"
                        >
                          {city}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.section>

      {/* 🌟 STATS / LOGOS SECTION */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-60">
            {["100+ Partner Restaurants", "Fastest Delivery", "AI Powered", "Authentic Recipes", "24/7 Support"].map((text) => (
              <div key={text} className="flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-300 uppercase">
                <Star className="w-4 h-4 text-cyan-400" /> {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 FEATURED RESTAURANTS SECTION */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-5xl font-bold mb-4"
              >
                Trending Spots
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-gray-400 text-lg"
              >
                Discover our top-rated partners serving the best authentic Pakistani cuisine near you.
              </motion.p>
            </div>
            
            <Link to="/restaurants" className="group flex items-center gap-2 text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
              View all restaurants
              <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockRestaurants.slice(0, 6).map((restaurant, idx) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                onHoverStart={() => setHoveredRestaurant(restaurant.id)}
                onHoverEnd={() => setHoveredRestaurant(null)}
              >
                <Link to={`/restaurant/${restaurant.id}`} className="block relative group rounded-3xl overflow-hidden bg-gray-900/50 border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
                  
                  {/* Image Container with creative hover */}
                  <div className="relative h-56 overflow-hidden">
                    <motion.img 
                      src={restaurant.image} 
                      alt={restaurant.name} 
                      className="w-full h-full object-cover"
                      animate={{ scale: hoveredRestaurant === restaurant.id ? 1.05 : 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80"></div>
                    
                    {restaurant.promo && (
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg">
                          {restaurant.promo.title}
                        </span>
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1 border border-white/10">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                      <span className="text-white text-sm font-bold">{restaurant.rating}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 relative">
                    {/* Animated "Voice Order" button overlay */}
                    <AnimatePresence>
                      {hoveredRestaurant === restaurant.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -top-7 right-6 z-20"
                        >
                          <button 
                            className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 p-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-colors"
                            onClick={(e) => { 
                              e.preventDefault(); 
                              if (!state.isAuthenticated) {
                                navigate('/voice-prompt');
                              } else {
                                setIsVoiceModalOpen(true); 
                              }
                            }}
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <h3 className="text-xl font-bold text-white mb-2">{restaurant.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{restaurant.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400 border-t border-white/10 pt-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-gray-500" />
                        <span>₨{restaurant.deliveryFee ?? 0}</span>
                      </div>
                      <span className="font-semibold text-cyan-400 group-hover:text-cyan-300">Order →</span>
                    </div>
                  </div>

                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎧 HOW IT WORKS (Modernized) */}
      <section className="py-24 bg-gray-950 relative border-y border-white/5">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Order At The Speed Of Sound</h2>
            <p className="text-gray-400 text-lg">Vocabite's industry-first conversational AI understands exactly what you want.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[40%] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent -z-10"></div>

            {[
              { icon: Mic, title: "1. Tap & Speak", desc: "Just say 'I want Chicken Karahi from Desi Bites'." },
              { icon: PlayCircle, title: "2. AI Processes", desc: "Our engine instantly parses your request and builds your cart." },
              { icon: Navigation, title: "3. Fast Delivery", desc: "Checkout in one click and track your piping hot food." }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-gray-900 border border-white/10 shadow-2xl flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300 group-hover:border-cyan-500/50">
                  <step.icon className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 💼 BUSINESS & PARTNERS COMPACT SECTION */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Partner Card */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-[2rem] overflow-hidden group min-h-[400px]"
            >
              <img src="/home-vendor-pk.webp" alt="Partner" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-12">
                <div className="inline-block px-4 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-wider mb-4 border border-white/20">For Restaurants</div>
                <h3 className="text-3xl font-bold text-white mb-4">Partner with Vocabite</h3>
                <p className="text-gray-300 mb-8 max-w-sm">Reach more customers with our AI-powered voice ordering platform.</p>
                <Link to="/partner" className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-6 py-3 rounded-xl font-bold transition-colors">
                  Join Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Corporate Card */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-[2rem] overflow-hidden group min-h-[400px]"
            >
              <img src="/home-corporate-pk.webp" alt="Corporate" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-12">
                <div className="inline-block px-4 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-wider mb-4 border border-white/20">For Business</div>
                <h3 className="text-3xl font-bold text-white mb-4">Corporate Catering</h3>
                <p className="text-gray-300 mb-8 max-w-sm">Simplify office lunches and team events with massive group orders.</p>
                <Link to="/partner" className="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-bold transition-colors">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ❓ FAQ ACCORDION */}
      <section className="py-24 bg-gray-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Got Questions?</h2>
            <p className="text-gray-400 text-lg">Everything you need to know about Vocabite's magical experience.</p>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* MODALS */}
      {isMapOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gray-900 w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gray-900/50">
              <h3 className="text-xl font-bold text-white">Select Location</h3>
              <button 
                onClick={() => setIsMapOpen(false)} 
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {loadingLoc && (
                <div className="flex justify-center items-center h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                </div>
              )}
              {locError && <div className="text-sm text-red-500 bg-red-500/10 p-4 rounded-xl mb-4 border border-red-500/20">{locError}</div>}

              {!loadingLoc && (
                <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                  <MapContainer
                    center={coords ? [coords.lat, coords.lng] : [24.8607, 67.0011]}
                    zoom={13}
                    className="h-full w-full z-0"
                  >
                    <TileLayer 
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    {coords && (
                      <>
                        <Marker position={[coords.lat, coords.lng]}>
                          <Popup className="custom-popup">You are here</Popup>
                        </Marker>
                        <Circle
                          center={[coords.lat, coords.lng]}
                          radius={10000}
                          pathOptions={{ color: "#06b6d4", fillColor: "#06b6d4", fillOpacity: 0.1, weight: 1 }}
                        />
                        <Recenter lat={coords.lat} lng={coords.lng} />
                      </>
                    )}

                    <div className="absolute bottom-6 right-6 z-[1000]">
                      <button 
                        onClick={handleLocate} 
                        className="p-4 rounded-xl shadow-2xl bg-gray-900 border border-white/10 hover:border-cyan-500/50 text-white transition-all group"
                      >
                        <Navigation className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
                      </button>
                    </div>
                  </MapContainer>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-6">
                <button 
                  onClick={() => setIsMapOpen(false)} 
                  className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsMapOpen(false)} 
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <VoiceOrderModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onOrderSubmit={handleVoiceOrder} />
    </div>
  );
};

// FAQ Accordion Component using Framer Motion
const FAQAccordion: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does voice ordering work?",
      a: "Just speak naturally! Click the mic and say 'I'd like 2 Chicken Karahis'. Our AI understands accents, complex orders, and customizations perfectly."
    },
    {
      q: "Do you deliver late at night?",
      a: "Yes! Vocabite is available 24/7 in major Pakistani cities, partnering with night-shift restaurants to satisfy those late-night cravings."
    },
    {
      q: "Can I pay with cash?",
      a: "Absolutely. We support Cash on Delivery (COD) across Pakistan alongside secure digital payment methods."
    },
    {
      q: "Which cities are currently supported?",
      a: "We currently operate in Karachi, Lahore, Islamabad, and Rawalpindi, with rapid expansion planned for other major hubs."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <motion.div 
            key={idx} 
            initial={false}
            animate={{ backgroundColor: isOpen ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)" }}
            className={`border rounded-2xl overflow-hidden transition-colors ${isOpen ? 'border-cyan-500/30' : 'border-white/5 hover:border-white/10'}`}
          >
            <button 
              onClick={() => setOpenIdx(isOpen ? null : idx)} 
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <h4 className="text-lg font-semibold text-white">{item.q}</h4>
              <motion.div 
                animate={{ rotate: isOpen ? 180 : 0 }} 
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 ml-4"
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="px-6 pb-6 text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Home;
