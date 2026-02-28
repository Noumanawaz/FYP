import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, ArrowLeft, Mic } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiService } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";

const Login: React.FC = () => {
    const [step, setStep] = useState<"email" | "phone" | "password">("email");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [isPhoneValid, setIsPhoneValid] = useState(false);
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");

    const { dispatch } = useApp();
    const navigate = useNavigate();

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
        setPassword(e.target.value);
        setIsPasswordValid(e.target.value.length >= 6);
        setError("");
    };

    const handleLogin = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await apiService.login(
                loginMethod === "email" ? email : undefined,
                loginMethod === "phone" ? phone : undefined,
                password
            );

            if (response.success && response.data) {
                apiService.setToken(response.data.access_token);
                
                // Fetch user from database to get the actual role
                try {
                    const userResponse = await apiService.getUser(response.data.user.user_id);
                    if (userResponse.success && userResponse.data) {
                        const userRole = userResponse.data.role;
                        
                        // Convert backend addresses to frontend format
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
                                role: userRole as 'customer' | 'restaurant_owner' | 'admin',
                                isVerified: true,
                                addresses: backendAddresses,
                                paymentMethods: [],
                                createdAt: new Date(userResponse.data.created_at || Date.now()),
                            },
                        });

                        // Redirect based on role from database
                        if (userRole === 'admin') {
                            navigate("/admin");
                        } else if (userRole === 'restaurant_owner') {
                            navigate("/restaurant-owner");
                        } else {
                            navigate("/dashboard");
                        }
                    } else {
                        // Fallback to role from login response
                        dispatch({
                            type: "SET_USER",
                            payload: {
                                id: response.data.user.user_id,
                                email: response.data.user.email || "",
                                phone: response.data.user.phone || "",
                                name: response.data.user.name,
                                role: response.data.user.role as 'customer' | 'restaurant_owner' | 'admin',
                                isVerified: true,
                                addresses: [],
                                paymentMethods: [],
                                createdAt: new Date(),
                            },
                        });

                        if (response.data.user.role === 'admin') {
                            navigate("/admin");
                        } else if (response.data.user.role === 'restaurant_owner') {
                            navigate("/restaurant-owner");
                        } else {
                            navigate("/dashboard");
                        }
                    }
                } catch (fetchError) {
                    // If fetching user fails, use role from login response
                    dispatch({
                        type: "SET_USER",
                        payload: {
                            id: response.data.user.user_id,
                            email: response.data.user.email || "",
                            phone: response.data.user.phone || "",
                            name: response.data.user.name,
                            role: response.data.user.role as 'customer' | 'restaurant_owner' | 'admin',
                            isVerified: true,
                            addresses: [],
                            paymentMethods: [],
                            createdAt: new Date(),
                        },
                    });

                    if (response.data.user.role === 'admin') {
                        navigate("/admin");
                    } else if (response.data.user.role === 'restaurant_owner') {
                        navigate("/restaurant-owner");
                    } else {
                        navigate("/dashboard");
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const checkUserExists = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Try to login without password to check if user exists
            await apiService.login(
                loginMethod === "email" ? email : undefined,
                loginMethod === "phone" ? phone : undefined,
                undefined // No password for initial check
            );
        } catch (err: any) {
            if (err.message.includes("not found") || err.message.includes("User not found")) {
                setError("Account not found. Please sign up first.");
                setIsLoading(false);
                return;
            } else if (err.message.includes("Password is required")) {
                // User exists and has password, proceed to password step
                setStep("password");
                setError("");
                setIsLoading(false);
                return;
            } else {
                setError(err.message || "An error occurred");
                setIsLoading(false);
                return;
            }
        }
        
        // If we get here, login succeeded (user exists without password - shouldn't happen)
        setStep("password");
        setIsLoading(false);
    };

    // Animation Variants
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen flex bg-[#050505] text-white selection:bg-cyan-500/30 overflow-hidden relative">
            
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 relative z-10 w-full lg:w-1/2">
                <motion.div 
                    initial="hidden" 
                    animate="visible" 
                    variants={fadeUpVariants}
                    className="w-full max-w-md mx-auto relative"
                >
                    {/* Glass Container */}
                    <div className="bg-gray-900/40 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl">
                        
                        {/* Header & Back Link */}
                        <div className="flex items-center justify-between mb-8">
                            <Link 
                                to="/" 
                                className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors group text-sm font-medium"
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

                        {/* Title */}
                        <div className="mb-8 hidden sm:block">
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
                            <p className="text-gray-400 font-light">Sign in to continue your journey.</p>
                        </div>

                        <div className="mb-8 block sm:hidden text-center">
                            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Welcome back</h1>
                            <p className="text-gray-400 text-sm font-light">Sign in to continue.</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 overflow-hidden"
                                >
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                                        {error}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form Steps container relative for AnimatePresence */}
                        <div className="relative min-h-[220px]">
                            <AnimatePresence mode="wait">
                                {(step === "email" || step === "phone") && (
                                    <motion.div 
                                        key="step1"
                                        variants={fadeUpVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">
                                                {step === "email" ? "Email Address" : "Phone Number"}
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    {step === "email" ? (
                                                        <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                    ) : (
                                                        <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                    )}
                                                </div>
                                                <input
                                                    type={step === "email" ? "email" : "tel"}
                                                    placeholder={step === "email" ? "Enter your email" : "Enter phone number"}
                                                    value={step === "email" ? email : phone}
                                                    onChange={step === "email" ? handleEmailChange : handlePhoneChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-600 transition-all outline-none"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const canProceed = step === "email" ? isEmailValid : isPhoneValid;
                                                            if (canProceed && !isLoading) checkUserExists();
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            disabled={(!isEmailValid && step === "email") || (!isPhoneValid && step === "phone") || isLoading}
                                            onClick={checkUserExists}
                                            className="group relative w-full py-3.5 rounded-xl font-bold transition-all overflow-hidden flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-gray-950 hover:bg-cyan-400"
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <span>Continue</span>
                                            )}
                                        </button>

                                        <div className="relative py-4">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/5"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                                                <span className="px-4 bg-[#050505] text-gray-500 rounded-full border border-white/5">or</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setStep(step === "email" ? "phone" : "email");
                                                setLoginMethod(step === "email" ? "phone" : "email");
                                                setError("");
                                            }}
                                            className="w-full py-3.5 rounded-xl font-semibold border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                                        >
                                            {step === "email" ? "Use phone number" : "Use email instead"}
                                        </button>
                                    </motion.div>
                                )}

                                {step === "password" && (
                                    <motion.div 
                                        key="step2"
                                        variants={fadeUpVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-6"
                                    >
                                        <div className="text-center">
                                            <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-4 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                                <Lock className="w-6 h-6 text-cyan-400" />
                                            </div>
                                            <p className="text-gray-400 font-medium mb-1 line-clamp-1 break-all px-4">
                                                {loginMethod === "email" ? email : phone}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 pl-1">
                                                Password
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="password"
                                                    placeholder="Enter your password"
                                                    value={password}
                                                    onChange={handlePasswordChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent text-white placeholder-gray-600 transition-all outline-none"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && isPasswordValid && !isLoading) {
                                                            handleLogin();
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setStep(loginMethod === "email" ? "email" : "phone");
                                                    setPassword("");
                                                    setError("");
                                                }}
                                                className="w-1/3 py-3.5 rounded-xl font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-all"
                                            >
                                                Back
                                            </button>
                                            <button
                                                disabled={!isPasswordValid || isLoading}
                                                onClick={handleLogin}
                                                className="w-2/3 py-3.5 rounded-xl font-bold transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-gray-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                                            >
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    "Sign In"
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sign up link */}
                        <div className="mt-8 text-center pt-6 border-t border-white/5">
                            <p className="text-sm text-gray-400">
                                Don't have an account?{" "}
                                <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                                    Sign up now
                                </Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Visual / Aesthetic */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#0a0a0a] items-center justify-center p-12 overflow-hidden border-l border-white/5">
                {/* Background image overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/copyright-6142611_1920.jpg"
                        alt="Aesthetic layout"
                        className="w-full h-full object-cover opacity-20 contrast-125 saturate-50 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#050505] w-[20%]"></div>
                </div>

                {/* Aesthetic interactive card */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                    className="relative z-10 w-full max-w-lg"
                >
                    <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-colors duration-500"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors duration-500"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-6 leading-tight">Order from your favorite places<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">using your voice.</span></h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8 font-light">
                                Welcome back to the future of food delivery. Experience zero-friction ordering with Vocabite's intelligent AI.
                            </p>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className={`w-10 h-10 rounded-full border-2 border-[#111] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center z-[${4-i}]`}>
                                            <span className="text-xs text-white">★</span>
                                        </div>
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-gray-300 tracking-wide">Join 10,000+ users</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
