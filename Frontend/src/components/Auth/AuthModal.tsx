import React, { useState } from "react";
import { ArrowLeft, Mail, Lock, Phone } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiService } from "../../services/api";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<"welcome" | "email" | "phone" | "password" | "signup">("welcome");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [preferredLanguage, setPreferredLanguage] = useState<"en" | "ur">("en");
    const [role, setRole] = useState<"customer" | "restaurant_owner">("customer");
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [isPhoneValid, setIsPhoneValid] = useState(false);
    const [password, setPassword] = useState("");
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");

    const { dispatch } = useApp();
    if (!isOpen) return null;

    // Validate email format
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setIsEmailValid(emailRegex.test(e.target.value));
        setError("");
    };

    // Validate phone format (basic validation)
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        setPhone(value);
        setIsPhoneValid(value.length >= 10);
        setError("");
    };

    // Validate password (minimum 6 characters)
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        setIsPasswordValid(e.target.value.length >= 6);
        setError("");
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        setError("");
    };

    const handleLogin = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await apiService.login(
                loginMethod === "email" ? email : undefined,
                loginMethod === "phone" ? phone : undefined
            );

            if (response.success && response.data) {
                // Store tokens
                apiService.setToken(response.data.access_token);
                apiService.setRefreshToken(response.data.refresh_token);
                
                // Update user in context
                dispatch({
                    type: "SET_USER",
                    payload: {
                        id: response.data.user.user_id,
                        email: response.data.user.email || "",
                        phone: response.data.user.phone || "",
                        name: response.data.user.name,
                        role: response.data.user.role as any,
                        isVerified: true,
                        addresses: [],
                        paymentMethods: [],
                        createdAt: new Date(),
                    },
                });

                onClose();
            }
        } catch (err: any) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async () => {
        // Validate required fields
        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        // Password validation
        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        // At least email or phone must be provided
        if (!email && !phone) {
            setError("Please provide either email or phone number");
            return;
        }

        // If email is provided, it must be valid
        if (email && !isEmailValid) {
            setError("Please enter a valid email address");
            return;
        }

        // If phone is provided, it must be valid
        if (phone && !isPhoneValid) {
            setError("Please enter a valid phone number (at least 10 digits)");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await apiService.createUser({
                name: name.trim(),
                email: email && isEmailValid ? email : undefined,
                phone: phone && isPhoneValid ? phone : undefined,
                preferred_language: preferredLanguage,
                role: role,
            });

            if (response.success && response.data) {
                // Auto-login after signup
                const loginResponse = await apiService.login(
                    email && isEmailValid ? email : undefined,
                    phone && isPhoneValid ? phone : undefined
                );

                if (loginResponse.success && loginResponse.data) {
                    // Store tokens
                    apiService.setToken(loginResponse.data.access_token);
                    apiService.setRefreshToken(loginResponse.data.refresh_token);
                    
                    dispatch({
                        type: "SET_USER",
                        payload: {
                            id: loginResponse.data.user.user_id,
                            email: loginResponse.data.user.email || "",
                            phone: loginResponse.data.user.phone || "",
                            name: loginResponse.data.user.name,
                            role: loginResponse.data.user.role as any,
                            isVerified: true,
                            addresses: [],
                            paymentMethods: [],
                            createdAt: new Date(),
                        },
                    });

                    onClose();
                }
            }
        } catch (err: any) {
            setError(err.message || "Signup failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const checkUserExists = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Try to login - if user exists, go to password step
            // If not, show signup option
            const response = await apiService.login(
                loginMethod === "email" ? email : undefined,
                loginMethod === "phone" ? phone : undefined
            );

            if (response.success) {
                // User exists, but we need password (for now just proceed)
                // In future, implement password authentication
                setStep("password");
            }
        } catch (err: any) {
            // User doesn't exist, show signup option
            if (err.message.includes("not found")) {
                setStep("signup");
            } else {
                setError(err.message || "An error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-auto">
                {/* Close modal button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {step === "welcome" && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-center">Welcome</h2>
                        <p className="text-gray-700 text-center mb-6">
                            Sign up or login to continue
                        </p>

                        {/* Social buttons */}
                        <div className="flex flex-col space-y-3 mb-4">
                            <button className="flex items-center justify-center space-x-2 border rounded-lg px-4 py-2 hover:bg-gray-100">
                                <img src="/icons/facebook.svg" alt="Facebook" className="w-5 h-5" />
                                <span>Continue with Facebook</span>
                            </button>
                            <button className="flex items-center justify-center space-x-2 border rounded-lg px-4 py-2 hover:bg-gray-100">
                                <img src="/icons/google.svg" alt="Google" className="w-5 h-5" />
                                <span>Continue with Google</span>
                            </button>
                            <button className="flex items-center justify-center space-x-2 border rounded-lg px-4 py-2 hover:bg-gray-100">
                                <img src="/icons/apple.svg" alt="Apple" className="w-5 h-5" />
                                <span>Continue with Apple</span>
                            </button>
                        </div>

                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <span className="text-gray-400">or</span>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <button
                                onClick={() => {
                                    setStep("email");
                                    setLoginMethod("email");
                                }}
                                className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
                            >
                                Login with Email
                            </button>
                            <button
                                onClick={() => {
                                    setStep("phone");
                                    setLoginMethod("phone");
                                }}
                                className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
                            >
                                Login with Phone
                            </button>
                            <button
                                onClick={() => {
                                    setStep("signup");
                                    setEmail("");
                                    setPhone("");
                                    setName("");
                                    setPassword("");
                                    setPreferredLanguage("en");
                                    setRole("customer");
                                }}
                                className="bg-white border border-pink-600 text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50"
                            >
                                Sign Up
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mt-4 text-center">
                            By signing up, you agree to our Terms and Conditions and Privacy Policy.
                        </p>
                    </>
                )}

                {(step === "email" || step === "phone") && (
                    <>
                        <button
                            onClick={() => setStep("welcome")}
                            className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="flex justify-center mb-2">
                            {step === "email" ? (
                            <Mail className="w-10 h-10 text-pink-600" />
                            ) : (
                                <Phone className="w-10 h-10 text-pink-600" />
                            )}
                        </div>

                        <h2 className="text-2xl font-bold mb-2 text-center">
                            {step === "email" ? "What's your email?" : "What's your phone number?"}
                        </h2>
                        <p className="text-gray-700 text-center mb-6">
                            {step === "email" 
                                ? "We will check if you have an account"
                                : "Enter your phone number to continue"}
                        </p>

                        {step === "email" ? (
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={handleEmailChange}
                            className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                        ) : (
                            <input
                                type="tel"
                                placeholder="Enter your phone number"
                                value={phone}
                                onChange={handlePhoneChange}
                                className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            />
                        )}

                        <button
                            disabled={(!isEmailValid && !isPhoneValid) || isLoading}
                            onClick={checkUserExists}
                            className={`w-full px-4 py-2 rounded-lg ${
                                (isEmailValid || isPhoneValid) && !isLoading
                                ? "bg-pink-600 text-white hover:bg-pink-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            {isLoading ? "Checking..." : "Continue"}
                        </button>
                    </>
                )}

                {step === "password" && (
                    <>
                        <button
                            onClick={() => setStep(loginMethod === "email" ? "email" : "phone")}
                            className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="flex justify-center mb-2">
                            <Lock className="w-10 h-10 text-pink-600" />
                        </div>

                        <h2 className="text-2xl font-bold mb-2 text-center">
                            Enter your password
                        </h2>
                        <p className="text-gray-700 text-center mb-6">
                            For {loginMethod === "email" ? email : phone}
                        </p>

                        <input
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />

                        <button
                            disabled={!isPasswordValid || isLoading}
                            onClick={handleLogin}
                            className={`w-full px-4 py-2 rounded-lg ${
                                isPasswordValid && !isLoading
                                    ? "bg-pink-600 text-white hover:bg-pink-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                        >
                            {isLoading ? "Logging in..." : "Login"}
                        </button>
                    </>
                )}

                {step === "signup" && (
                    <>
                        <button
                            onClick={() => setStep("welcome")}
                            className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-2 text-center">
                            Create Account
                        </h2>
                        <p className="text-gray-700 text-center mb-6">
                            Fill in your details to get started
                        </p>

                        <div className="space-y-4">
                            {/* Name - Required */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={handleNameChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                            </div>

                            {/* Email - Optional but validated if provided */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-gray-400 text-xs">(optional)</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                            </div>

                            {/* Phone - Optional but validated if provided */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number <span className="text-gray-400 text-xs">(optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Enter your phone number"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    At least one of email or phone is required
                                </p>
                            </div>

                            {/* Preferred Language - Required */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Preferred Language <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={preferredLanguage}
                                    onChange={(e) => setPreferredLanguage(e.target.value as "en" | "ur")}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                >
                                    <option value="en">English</option>
                                    <option value="ur">Urdu</option>
                                </select>
                            </div>

                            {/* Password - Required for signup */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Password must be at least 6 characters
                                </p>
                            </div>

                            {/* Role - Optional (defaults to customer) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Type <span className="text-gray-400 text-xs">(optional)</span>
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as "customer" | "restaurant_owner")}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                >
                                    <option value="customer">Customer</option>
                                    <option value="restaurant_owner">Restaurant Owner</option>
                                </select>
                            </div>
                        </div>

                        <button
                            disabled={!name.trim() || !isPasswordValid || (!email && !phone) || (email && !isEmailValid) || (phone && !isPhoneValid) || isLoading}
                            onClick={handleSignup}
                            className={`w-full px-4 py-2 rounded-lg mt-6 ${
                                name.trim() && isPasswordValid && (email || phone) && (!email || isEmailValid) && (!phone || isPhoneValid) && !isLoading
                                    ? "bg-pink-600 text-white hover:bg-pink-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                        >
                            {isLoading ? "Creating account..." : "Sign Up"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
