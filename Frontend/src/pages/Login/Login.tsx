import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, ArrowLeft } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiService } from "../../services/api";

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
            // The backend will return "Password is required" if user exists with password
            // or "User not found" if user doesn't exist
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

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 bg-white">
                <div className="w-full max-w-md mx-auto">
                    {/* Back to home */}
                    <Link 
                        to="/" 
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span className="text-sm">Back to home</span>
                    </Link>

                    {/* Logo/Brand */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
                        <p className="text-gray-600">Sign in to continue to Vocabite</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Email/Phone Step */}
                    {(step === "email" || step === "phone") && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {step === "email" ? "Email address" : "Phone number"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {step === "email" ? (
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Phone className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    {step === "email" ? (
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={handleEmailChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    ) : (
                                        <input
                                            type="tel"
                                            placeholder="Enter your phone number"
                                            value={phone}
                                            onChange={handlePhoneChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    )}
                                </div>
                            </div>

                            <button
                                disabled={(!isEmailValid && step === "email") || (!isPhoneValid && step === "phone") || isLoading}
                                onClick={checkUserExists}
                                className={`w-full py-3 rounded-lg font-medium transition-all ${
                                    ((step === "email" && isEmailValid) || (step === "phone" && isPhoneValid)) && !isLoading
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                {isLoading ? "Checking..." : "Continue"}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setStep(step === "email" ? "phone" : "email");
                                    setLoginMethod(step === "email" ? "phone" : "email");
                                    setError("");
                                }}
                                className="w-full py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                {step === "email" ? "Use phone number instead" : "Use email instead"}
                            </button>
                        </div>
                    )}

                    {/* Password Step */}
                    {step === "password" && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <Lock className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                                    Enter your password
                                </h2>
                                <p className="text-gray-600 text-center mb-6">
                                    For {loginMethod === "email" ? email : phone}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={!isPasswordValid || isLoading}
                                onClick={handleLogin}
                                className={`w-full py-3 rounded-lg font-medium transition-all ${
                                    isPasswordValid && !isLoading
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                {isLoading ? "Logging in..." : "Login"}
                            </button>

                            <button
                                onClick={() => {
                                    setStep(loginMethod === "email" ? "email" : "phone");
                                    setPassword("");
                                    setError("");
                                }}
                                className="w-full py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* Sign up link */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{" "}
                            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Image */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-pink-50 to-purple-50 relative overflow-hidden">
                <img
                    src="/copyright-6142611_1920.jpg"
                    alt="Fresh food"
                    className="w-full h-screen object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            </div>
        </div>
    );
};

export default Login;

