import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, User, ArrowLeft, MapPin, UtensilsCrossed, Mic } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiService } from "../../services/api";
import MapAddressSelector from "../../components/Location/MapAddressSelector";
import { motion, AnimatePresence } from "framer-motion";

const Signup: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Step 1 fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    
    // Step 2 fields
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // Step 3 fields
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [province, setProvince] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [country, setCountry] = useState("Pakistan");
    const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isMapOpen, setIsMapOpen] = useState(false);
    
    // Other fields
    const [preferredLanguage, setPreferredLanguage] = useState<"en" | "ur">("en");
    const [role, setRole] = useState<"customer" | "restaurant_owner">("customer");
    
    // Validation states
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [isPhoneValid, setIsPhoneValid] = useState(false);
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const { dispatch } = useApp();
    const navigate = useNavigate();

    const dietaryOptions = [
        "Vegetarian", "Vegan", "Halal", "Gluten-Free",
        "Dairy-Free", "Nut-Free", "Keto", "Paleo"
    ];

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setIsEmailValid(emailRegex.test(e.target.value));
        setError("");
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setPhone(value);
        setIsPhoneValid(value.length >= 10);
        setError("");
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPassword(value);
        setIsPasswordValid(value.length >= 6);
        setPasswordsMatch(value === confirmPassword && confirmPassword.length > 0);
        setError("");
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setConfirmPassword(value);
        setPasswordsMatch(value === password && password.length >= 6);
        setError("");
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        setError("");
    };

    const toggleDietaryPreference = (pref: string) => {
        setDietaryPreferences(prev => 
            prev.includes(pref) 
                ? prev.filter(p => p !== pref)
                : [...prev, pref]
        );
    };

    const handleMapSelect = (coords: { lat: number; lng: number }, address?: string) => {
        setSelectedCoords(coords);
        if (address) {
            const parts = address.split(',');
            if (parts.length >= 2) {
                setCity(parts[parts.length - 1].trim());
                setStreet(parts.slice(0, -1).join(',').trim());
            } else {
                setStreet(address);
            }
        } else {
            setStreet(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) { setError("Full name is required"); return; }
            if (!email.trim()) { setError("Email is required"); return; }
            if (!isEmailValid) { setError("Please enter a valid email address"); return; }
            setStep(2);
            setError("");
        } else if (step === 2) {
            if (!phone.trim()) { setError("Phone number is required"); return; }
            if (!isPhoneValid) { setError("Please enter a valid phone number (at least 10 digits)"); return; }
            if (!password) { setError("Password is required"); return; }
            if (!isPasswordValid) { setError("Password must be at least 6 characters"); return; }
            if (!confirmPassword) { setError("Please confirm your password"); return; }
            if (!passwordsMatch) { setError("Passwords do not match"); return; }
            setStep(3);
            setError("");
        }
    };

    const handleSignup = async () => {
        if (!street.trim()) { setError("Street address is required"); return; }
        if (!city.trim()) { setError("City is required"); return; }
        if (!province.trim()) { setError("Province is required"); return; }
        if (!postalCode.trim()) { setError("Postal code is required"); return; }

        setIsLoading(true);
        setError("");

        try {
            const response = await apiService.createUser({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password: password,
                preferred_language: preferredLanguage,
                role: role,
                dietary_preferences: dietaryPreferences,
                addresses: [{
                    street: street.trim(),
                    city: city.trim(),
                    province: province.trim(),
                    postal_code: postalCode.trim(),
                    country: country,
                    is_default: true
                }]
            });

            if (response.success && response.data) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                    const loginResponse = await apiService.login(email, phone, password);

                    if (loginResponse.success && loginResponse.data) {
                        apiService.setToken(loginResponse.data.access_token);
                        let userRole: string = loginResponse.data.user.role; 
                        
                        try {
                            const userResponse = await apiService.getUser(loginResponse.data.user.user_id);
                            if (userResponse.success && userResponse.data) {
                                userRole = userResponse.data.role;
                                const backendAddresses = (userResponse.data.addresses || []).map((addr: any, idx: number) => ({
                                    id: addr.id || `addr-${idx}`,
                                    type: (addr.type || 'home') as 'home' | 'work' | 'other',
                                    label: addr.label || addr.street || 'Address',
                                    address: addr.address || `${addr.street || ''}, ${addr.area || ''}, ${addr.city || ''}`.replace(/^,\s*|,\s*$/g, ''),
                                    city: addr.city || '',
                                    coordinates: {
                                        lat: addr.lat || addr.coordinates?.lat || 0,
                                        lng: addr.lng || addr.coordinates?.lng || 0,
                                    },
                                    isDefault: addr.is_default || false,
                                }));

                                dispatch({
                                    type: "SET_USER",
                                    payload: {
                                        id: userResponse.data.user_id,
                                        email: userResponse.data.email || "",
                                        phone: userResponse.data.phone || "",
                                        name: userResponse.data.name,
                                        role: userResponse.data.role as 'customer' | 'restaurant_owner' | 'admin',
                                        isVerified: true,
                                        addresses: backendAddresses,
                                        paymentMethods: [],
                                        createdAt: new Date(userResponse.data.created_at || Date.now()),
                                    },
                                });
                            } else {
                                dispatch({
                                    type: "SET_USER",
                                    payload: {
                                        id: loginResponse.data.user.user_id,
                                        email: loginResponse.data.user.email || "",
                                        phone: loginResponse.data.user.phone || "",
                                        name: loginResponse.data.user.name,
                                        role: loginResponse.data.user.role as 'customer' | 'restaurant_owner' | 'admin',
                                        isVerified: true,
                                        addresses: [],
                                        paymentMethods: [],
                                        createdAt: new Date(),
                                    },
                                });
                            }
                        } catch (err) {
                            dispatch({
                                type: "SET_USER",
                                payload: {
                                    id: loginResponse.data.user.user_id,
                                    email: loginResponse.data.user.email || "",
                                    phone: loginResponse.data.user.phone || "",
                                    name: loginResponse.data.user.name,
                                    role: loginResponse.data.user.role as 'customer' | 'restaurant_owner' | 'admin',
                                    isVerified: true,
                                    addresses: [],
                                    paymentMethods: [],
                                    createdAt: new Date(),
                                },
                            });
                        }

                        if (userRole === 'admin') navigate("/admin");
                        else if (userRole === 'restaurant_owner') navigate("/restaurant-owner");
                        else navigate("/dashboard");
                        return;
                    }
                } catch (loginErr: any) {
                    const errorMsg = loginErr.message || "";
                    if (errorMsg.includes("password") || errorMsg.includes("Password")) {
                        setError("Account created, but password setup failed. Please contact support.");
                    } else {
                        setError(`Account created! Auto-login failed: ${errorMsg}.`);
                    }
                    setTimeout(() => { navigate("/login"); }, 3000);
                    return;
                }
                
                setError("Account created successfully! Please login to continue.");
                setTimeout(() => { navigate("/login"); }, 2000);
            }
        } catch (err: any) {
            const errorMessage = err.message || "Signup failed. Please try again.";
            if (errorMessage.includes("already exists")) {
                setError(`${errorMessage} Please try logging in instead.`);
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Form variant animations
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            transition: { duration: 0.4, ease: "easeOut" }
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            transition: { duration: 0.3, ease: "easeIn" }
        })
    };

    return (
        <div className="min-h-screen flex bg-[#050505] text-white selection:bg-cyan-500/30 overflow-hidden relative">
            
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 relative z-10 w-full lg:w-1/2 py-20">
                <div className="w-full max-w-lg mx-auto relative">
                    
                    {/* Glass Container */}
                    <div className="bg-gray-900/40 backdrop-blur-3xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl overflow-hidden relative">
                        
                        {/* Header & Back Link */}
                        <div className="flex items-center justify-between mb-8 z-20 relative">
                            <Link 
                                to="/" 
                                className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors group text-sm font-medium tracking-wide"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </Link>

                            <div className="flex items-center text-xl font-extrabold tracking-tight">
                                <span className="text-white">V</span>
                                <Mic className="w-4 h-4 text-cyan-400 mx-0.5" />
                                <span className="text-white">CABITE</span>
                            </div>
                        </div>

                        {/* Progress Steps UI */}
                        <div className="mb-10 relative z-20">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 rounded-full pointer-events-none hidden sm:block"></div>
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500 hidden sm:block pointer-events-none`}
                                     style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>

                                {/* Step 1 node */}
                                <div className={`relative flex flex-col items-center z-10 ${step >= 1 ? 'text-cyan-400' : 'text-gray-500'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                        step >= 1 ? 'bg-cyan-500 text-[#050505] shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/10 text-gray-400'
                                    }`}>
                                        {step > 1 ? '✓' : '1'}
                                    </div>
                                    <span className="hidden sm:block absolute top-10 text-xs font-semibold uppercase tracking-widest whitespace-nowrap">Basic Info</span>
                                </div>
                                
                                {/* Step 2 node */}
                                <div className={`relative flex flex-col items-center z-10 ${step >= 2 ? 'text-cyan-400' : 'text-gray-500'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                        step >= 2 ? 'bg-cyan-500 text-[#050505] shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/10 text-gray-400'
                                    }`}>
                                        {step > 2 ? '✓' : '2'}
                                    </div>
                                    <span className="hidden sm:block absolute top-10 text-xs font-semibold uppercase tracking-widest whitespace-nowrap">Security</span>
                                </div>

                                {/* Step 3 node */}
                                <div className={`relative flex flex-col items-center z-10 ${step >= 3 ? 'text-cyan-400' : 'text-gray-500'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                        step >= 3 ? 'bg-cyan-500 text-[#050505] shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/10 text-gray-400'
                                    }`}>
                                        3
                                    </div>
                                    <span className="hidden sm:block absolute top-10 text-xs font-semibold uppercase tracking-widest whitespace-nowrap">Details</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8 pt-4 sm:pt-6 relative z-20">
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                {step === 1 && "Create account"}
                                {step === 2 && "Secure your profile"}
                                {step === 3 && "Where should we deliver?"}
                            </h1>
                            <p className="text-gray-400 font-light text-sm">
                                {step === 1 && "Let's start your zero-friction journey."}
                                {step === 2 && "Set up a strong password."}
                                {step === 3 && "Tell us about your preferences."}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 overflow-hidden relative z-20"
                                >
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                                        {error}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form Container */}
                        <div className="relative z-20 overflow-visible min-h-[300px]">
                            <AnimatePresence mode="wait" custom={1}>
                                
                                {/* Step 1: Basic Info */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        custom={1}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">Full Name</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input type="text" placeholder="John Doe" value={name} onChange={handleNameChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-600 transition-all outline-none"
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">Email</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input type="email" placeholder="john@example.com" value={email} onChange={handleEmailChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-600 transition-all outline-none"
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">Account Type <span className="text-gray-600 normal-case">(optional)</span></label>
                                            <select value={role} onChange={(e) => setRole(e.target.value as "customer" | "restaurant_owner")}
                                                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white outline-none appearance-none"
                                            >
                                                <option value="customer" className="bg-gray-900 text-white">Customer (Default)</option>
                                                <option value="restaurant_owner" className="bg-gray-900 text-white">Restaurant Owner</option>
                                            </select>
                                        </div>

                                        <button onClick={handleNext} disabled={!name.trim() || !email.trim() || !isEmailValid}
                                            className="group relative w-full py-4 mt-4 rounded-xl font-bold transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-[#050505] hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:shadow-none"
                                        >
                                            Next Step
                                        </button>
                                    </motion.div>
                                )}

                                {/* Step 2: Credentials */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        custom={1}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">Phone Number</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input type="tel" placeholder="Your phone number" value={phone} onChange={handlePhoneChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-600 transition-all outline-none"
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input type="password" placeholder="Create a password" value={password} onChange={handlePasswordChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-600 transition-all outline-none"
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">Confirm Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={handleConfirmPasswordChange}
                                                    className={`w-full pl-12 pr-4 py-3.5 bg-black/40 border rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all outline-none ${confirmPassword && !passwordsMatch ? 'border-red-500/50' : 'border-white/10'}`}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                                                />
                                            </div>
                                            {confirmPassword && passwordsMatch && <p className="text-xs text-green-400 mt-2 ml-1">✓ Passwords match</p>}
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button onClick={() => setStep(1)} className="w-[30%] py-3.5 rounded-xl font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-all">Back</button>
                                            <button onClick={handleNext} disabled={!phone.trim() || !isPhoneValid || !password || !isPasswordValid || !confirmPassword || !passwordsMatch}
                                                className="w-[70%] py-3.5 rounded-xl font-bold transition-all justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-[#050505] hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:shadow-none"
                                            >Next Step</button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 3: Logistics */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        custom={1}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400"/> Primary Location</label>
                                            <button type="button" onClick={() => setIsMapOpen(true)}
                                                className="w-full px-4 py-3.5 border border-dashed border-white/20 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/5 text-gray-300 transition-all flex items-center justify-center gap-2 mt-2 bg-black/20"
                                            >
                                                <MapPin className="w-5 h-5 text-cyan-400" />
                                                {selectedCoords ? 'Update Map Pinned Location' : 'Select on Map (Recommended)'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <input type="text" placeholder="Street Address" value={street} onChange={(e) => setStreet(e.target.value)}
                                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all outline-none" />
                                            </div>
                                            <div>
                                                <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)}
                                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all outline-none" />
                                            </div>
                                            <div>
                                                <input type="text" placeholder="Province" value={province} onChange={(e) => setProvince(e.target.value)}
                                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all outline-none" />
                                            </div>
                                            <div>
                                                <input type="text" placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-600 transition-all outline-none" />
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-pink-400"/> Dietary Prefs (Opts)</label>
                                            <div className="flex flex-wrap gap-2">
                                                {dietaryOptions.map((option) => (
                                                    <button key={option} type="button" onClick={() => toggleDietaryPreference(option.toLowerCase())}
                                                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wider uppercase transition-all ${
                                                            dietaryPreferences.includes(option.toLowerCase())
                                                                ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
                                                                : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30"
                                                        }`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button onClick={() => setStep(2)} className="w-[30%] py-3.5 rounded-xl font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-all">Back</button>
                                            <button onClick={handleSignup} disabled={!street.trim() || !city.trim() || !province.trim() || !postalCode.trim() || isLoading}
                                                className="w-[70%] py-3.5 rounded-xl font-bold transition-all justify-center flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-[#050505] hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:shadow-none"
                                            >
                                                {isLoading ? <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div> : "Complete Sign Up"}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Login link */}
                        <div className="mt-8 text-center pt-6 border-t border-white/5 relative z-20">
                            <p className="text-sm text-gray-400">
                                Already have an account?{" "}
                                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                                    Sign in instead
                                </Link>
                            </p>
                        </div>

                    </div>
                </div>
            </div>

            {/* Map Address Selector Modal */}
            <MapAddressSelector
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={handleMapSelect}
                initialCoords={selectedCoords}
                title="Pinpoint your location"
            />

            {/* Right Side - Visuals */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#0a0a0a] items-center justify-center overflow-hidden border-l border-white/5 p-12">
                <div className="absolute inset-0 z-0">
                    <img
                        // Using the existing local placeholder image reference from the previous version
                        src="/restaurant-5521372_1920.jpg"
                        alt="Restaurant atmosphere"
                        className="w-full h-full object-cover opacity-20 contrast-125 saturate-50 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#050505] w-[20%]"></div>
                </div>

                {/* Glass Feature Card */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                    className="relative z-10 w-full max-w-lg"
                >
                    <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-colors duration-500"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-colors duration-500"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-6 leading-tight">Elevate your eating<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">with zero friction.</span></h2>
                            <ul className="space-y-4 text-gray-400 font-light mb-8">
                                <li className="flex gap-3"><span className="text-cyan-400 align-top">✦</span> Voice activated ordering that understands contextual nuances.</li>
                                <li className="flex gap-3"><span className="text-cyan-400 align-top">✦</span> Intelligent dietary matching based on your profile inputs.</li>
                                <li className="flex gap-3"><span className="text-cyan-400 align-top">✦</span> Instant delivery tracking powered by advanced AI algorithms.</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Signup;
