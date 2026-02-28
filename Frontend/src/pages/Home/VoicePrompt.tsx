import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, ArrowRight, UserPlus, LogIn, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const VoicePrompt: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex bg-[#050505] text-white selection:bg-cyan-500/30 overflow-hidden relative items-center justify-center p-4">
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", damping: 20 }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Back Link */}
                <Link 
                    to="/" 
                    className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors group text-sm font-medium tracking-wide mb-8"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <div className="bg-gray-900/40 backdrop-blur-3xl border border-white/10 p-8 sm:p-12 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative text-center">
                    
                    {/* Glowing Accent Top */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

                    {/* Fun Mic Icon Animation */}
                    <div className="flex justify-center mb-8 relative">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                        <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] relative z-10">
                            <Mic className="w-12 h-12 text-[#050505]" />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tracking-tight mb-4">
                        Unlock Voice Ordering
                    </h1>
                    
                    <p className="text-lg text-gray-400 font-light mb-10 max-w-lg mx-auto leading-relaxed">
                        To personalize your experience and remember your delivery details, please sign in or create a free account to use our AI voice assistant.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto px-8 py-4 bg-cyan-500 text-gray-900 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] group"
                        >
                            <UserPlus className="w-5 h-5" />
                            Create Account
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all group"
                        >
                            <LogIn className="w-5 h-5" />
                            Sign In
                        </button>
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/10 flex justify-center gap-8 opacity-60">
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> Personalized Engine
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> 1-Click Checkout
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default VoicePrompt;
