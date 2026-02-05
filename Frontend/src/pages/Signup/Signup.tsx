import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, User, ArrowLeft, MapPin, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiService } from "../../services/api";
import MapAddressSelector from "../../components/Location/MapAddressSelector";

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
        "Vegetarian",
        "Vegan",
        "Halal",
        "Gluten-Free",
        "Dairy-Free",
        "Nut-Free",
        "Keto",
        "Paleo"
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
            // Try to parse address components if available
            const parts = address.split(',');
            if (parts.length >= 2) {
                setCity(parts[parts.length - 1].trim());
                setStreet(parts.slice(0, -1).join(',').trim());
            } else {
                setStreet(address);
            }
        } else {
            // Use coordinates as fallback
            setStreet(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) {
                setError("Full name is required");
                return;
            }
            if (!email.trim()) {
                setError("Email is required");
                return;
            }
            if (!isEmailValid) {
                setError("Please enter a valid email address");
                return;
            }
            setStep(2);
            setError("");
        } else if (step === 2) {
            if (!phone.trim()) {
                setError("Phone number is required");
                return;
            }
            if (!isPhoneValid) {
                setError("Please enter a valid phone number (at least 10 digits)");
                return;
            }
            if (!password) {
                setError("Password is required");
                return;
            }
            if (!isPasswordValid) {
                setError("Password must be at least 6 characters");
                return;
            }
            if (!confirmPassword) {
                setError("Please confirm your password");
                return;
            }
            if (!passwordsMatch) {
                setError("Passwords do not match");
                return;
            }
            setStep(3);
            setError("");
        }
    };

    const handleSignup = async () => {
        if (!street.trim()) {
            setError("Street address is required");
            return;
        }
        if (!city.trim()) {
            setError("City is required");
            return;
        }
        if (!province.trim()) {
            setError("Province is required");
            return;
        }
        if (!postalCode.trim()) {
            setError("Postal code is required");
            return;
        }

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
                // Small delay to ensure database transaction is committed
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try to login with the newly created account
                try {
                    const loginResponse = await apiService.login(
                        email,
                        phone,
                        password
                    );

                    if (loginResponse.success && loginResponse.data) {
                        apiService.setToken(loginResponse.data.access_token);
                        
                        // Fetch full user data including addresses
                        let userRole: string = loginResponse.data.user.role; // Default to role from login response
                        
                        try {
                            const userResponse = await apiService.getUser(loginResponse.data.user.user_id);
                            if (userResponse.success && userResponse.data) {
                                // Use role from database (most accurate)
                                userRole = userResponse.data.role;
                                
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
                                        role: userResponse.data.role as 'customer' | 'restaurant_owner' | 'admin',
                                        isVerified: true,
                                        addresses: backendAddresses,
                                        paymentMethods: [],
                                        createdAt: new Date(userResponse.data.created_at || Date.now()),
                                    },
                                });
                            } else {
                                // Fallback if user fetch fails
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
                            // Fallback if user fetch fails
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

                        // Redirect based on role from database
                        if (userRole === 'admin') {
                            navigate("/admin");
                        } else if (userRole === 'restaurant_owner') {
                            navigate("/restaurant-owner");
                        } else {
                            navigate("/dashboard");
                        }
                        return;
                    }
                } catch (loginErr: any) {
                    // If login fails, check if it's because password_hash column doesn't exist
                    const errorMsg = loginErr.message || "";
                    if (errorMsg.includes("password") || errorMsg.includes("Password")) {
                        setError("Account created, but password setup failed. Please run the database migration to add password_hash column, or contact support.");
                    } else {
                        setError(`Account created successfully! However, auto-login failed: ${errorMsg}. Please try logging in manually.`);
                    }
                    // Still redirect to login page
                    setTimeout(() => {
                        navigate("/login");
                    }, 3000);
                    return;
                }
                
                // If we get here, login didn't succeed
                setError("Account created successfully! Please login to continue.");
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            }
        } catch (err: any) {
            // Handle specific error messages
            const errorMessage = err.message || "Signup failed. Please try again.";
            
            // If user already exists, suggest logging in instead
            if (errorMessage.includes("already exists")) {
                setError(`${errorMessage}. Please try logging in instead.`);
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 bg-white">
                <div className="w-full max-w-md mx-auto">
                    {/* Back to home */}
                    <Link 
                        to="/" 
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span className="text-sm">Back to home</span>
                    </Link>

                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                                    step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {step > 1 ? '✓' : '1'}
                                </div>
                                <span className="ml-2 text-sm font-medium hidden sm:block">Basic Info</span>
                            </div>
                            <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                                    step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {step > 2 ? '✓' : '2'}
                                </div>
                                <span className="ml-2 text-sm font-medium hidden sm:block">Account</span>
                            </div>
                            <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                                    step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    3
                                </div>
                                <span className="ml-2 text-sm font-medium hidden sm:block">Details</span>
                            </div>
                        </div>
                    </div>

                    {/* Logo/Brand */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create account</h1>
                        <p className="text-gray-600">
                            {step === 1 && "Let's start with your basic information"}
                            {step === 2 && "Set up your account credentials"}
                            {step === 3 && "Tell us about your preferences"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Name, Email, and Role */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={handleNameChange}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Account Type <span className="text-gray-400 text-xs font-normal">(optional)</span>
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as "customer" | "restaurant_owner")}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                >
                                    <option value="customer">Customer</option>
                                    <option value="restaurant_owner">Restaurant Owner</option>
                                </select>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!name.trim() || !email.trim() || !isEmailValid}
                                className={`w-full py-3 rounded-lg font-medium transition-all ${
                                    name.trim() && email.trim() && isEmailValid
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {/* Step 2: Phone, Password, Confirm Password */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="Enter your phone number"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password <span className="text-red-500">*</span>
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
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Password must be at least 6 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={handleConfirmPasswordChange}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                            confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    />
                                </div>
                                {confirmPassword && !passwordsMatch && (
                                    <p className="text-xs text-red-500 mt-1.5">
                                        Passwords do not match
                                    </p>
                                )}
                                {confirmPassword && passwordsMatch && (
                                    <p className="text-xs text-green-500 mt-1.5">
                                        Passwords match
                                    </p>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setError("");
                                    }}
                                    className="flex-1 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!phone.trim() || !isPhoneValid || !password || !isPasswordValid || !confirmPassword || !passwordsMatch}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                        phone.trim() && isPhoneValid && password && isPasswordValid && confirmPassword && passwordsMatch
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Address and Dietary Preferences */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                                    Delivery Address
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Location on Map <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsMapOpen(true)}
                                            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-700"
                                        >
                                            <MapPin className="w-5 h-5" />
                                            {selectedCoords ? 'Change Location on Map' : 'Select Location on Map'}
                                        </button>
                                        {selectedCoords && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Selected: {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Street Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter street address"
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                City <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="City"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Province <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Province"
                                                value={province}
                                                onChange={(e) => setProvince(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Postal Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Postal code"
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <UtensilsCrossed className="w-5 h-5 mr-2 text-blue-600" />
                                    Dietary Preferences
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">Select all that apply (optional)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {dietaryOptions.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => toggleDietaryPreference(option.toLowerCase())}
                                            className={`px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                                                dietaryPreferences.includes(option.toLowerCase())
                                                    ? "bg-blue-50 border-blue-500 text-blue-700"
                                                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setStep(2);
                                        setError("");
                                    }}
                                    className="flex-1 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSignup}
                                    disabled={!street.trim() || !city.trim() || !province.trim() || !postalCode.trim() || isLoading}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                        street.trim() && city.trim() && province.trim() && postalCode.trim() && !isLoading
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    {isLoading ? "Creating account..." : "Create Account"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Login link */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{" "}
                            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Map Address Selector Modal */}
            <MapAddressSelector
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={handleMapSelect}
                initialCoords={selectedCoords}
                title="Select Your Delivery Address"
            />

            {/* Right Side - Image */}
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
                <img
                    src="/restaurant-5521372_1920.jpg"
                    alt="Restaurant"
                    className="w-full h-screen object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            </div>
        </div>
    );
};

export default Signup;
