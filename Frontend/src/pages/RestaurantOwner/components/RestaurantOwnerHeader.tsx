import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Brain, Loader2, CheckCircle, AlertCircle, Sun, Moon } from 'lucide-react';
import { VOCABITELogo } from "../../../components/Layout/Header";
import { useTheme } from '../../../contexts/ThemeContext';

interface RestaurantOwnerHeaderProps {
  restaurantName: string;
  onLogout: () => void;
  onSaveToAI: () => void;
  aiSaving: boolean;
  aiStatus: 'idle' | 'success' | 'error';
}

const RestaurantOwnerHeader: React.FC<RestaurantOwnerHeaderProps> = ({
  restaurantName,
  onLogout,
  onSaveToAI,
  aiSaving,
  aiStatus
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b transition-colors duration-300 bg-white/80 dark:bg-[#0B0B0B]/80 backdrop-blur-xl border-gray-200 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex-shrink-0 transition-transform hover:scale-105 text-black dark:text-white">
              <VOCABITELogo />
            </Link>
            <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-white/10" />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">
                Owner Portal
              </h1>
              <p className="text-[11px] text-cyan-500 font-semibold uppercase tracking-[0.2em] mt-0.5">
                {restaurantName || 'Establishing...'}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-all duration-300 border border-transparent hover:border-gray-200 dark:hover:border-white/10"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

            {/* Save to AI button */}
            <button
              onClick={onSaveToAI}
              disabled={aiSaving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs transition-all duration-300 shadow-sm ${
                aiSaving
                  ? 'bg-purple-500/10 text-purple-400 cursor-not-allowed border border-purple-500/20'
                  : aiStatus === 'success'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : aiStatus === 'error'
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : 'bg-cyan-500 dark:bg-cyan-600 text-white hover:bg-cyan-400 dark:hover:bg-cyan-500 shadow-cyan-500/20 hover:shadow-cyan-500/40'
              }`}
            >
              {aiSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">PROCESS...</span>
                </>
              ) : aiStatus === 'success' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">SYNCED</span>
                </>
              ) : aiStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RETRY AI</span>
                </>
              ) : (
                <>
                  <Brain className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline tracking-widest">SAVE TO AI</span>
                </>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white rounded-full font-bold text-xs transition-all duration-300 border border-gray-200 dark:border-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline tracking-widest uppercase">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RestaurantOwnerHeader;

