import React, { useState } from 'react';
import { Edit, Save, MapPin, Building2, Globe, Calendar, BadgeCheck, Loader2, GitBranch } from 'lucide-react';
import ImageUpload from '../../../components/Common/ImageUpload';

interface Restaurant {
  restaurant_id: string;
  name: string;
  description: Record<string, any>;
  founded_year?: number;
  country: string;
  price_range: string;
  categories: string[];
  specialties: string[];
  keywords: string[];
  food_categories: string[];
  logo_url?: string;
  status: string;
}

interface Location {
  location_id: string;
  restaurant_id: string;
  city: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  operating_hours: Record<string, any>;
  delivery_zones: Record<string, any>;
  status: "open" | "closed" | "temporarily_closed";
  created_at: string;
  updated_at: string;
}

interface RestaurantInfoProps {
  restaurant: Restaurant;
  onUpdate: (data: any) => Promise<void>;
  loading?: boolean;
  locations?: Location[];
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant, onUpdate, loading = false, locations = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: restaurant.name,
    country: restaurant.country,
    price_range: restaurant.price_range as 'budget' | 'mid-range' | 'premium',
    categories: restaurant.categories.join(', '),
    specialties: restaurant.specialties.join(', '),
    keywords: restaurant.keywords.join(', '),
    food_categories: restaurant.food_categories.join(', '),
    logo_url: restaurant.logo_url || '',
    founded_year: restaurant.founded_year?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      name: formData.name,
      country: formData.country,
      price_range: formData.price_range,
      categories: formData.categories.split(',').map(s => s.trim()).filter(s => s),
      specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
      keywords: formData.keywords.split(',').map(s => s.trim()).filter(s => s),
      food_categories: formData.food_categories.split(',').map(s => s.trim()).filter(s => s),
      logo_url: formData.logo_url || undefined,
      founded_year: formData.founded_year ? parseInt(formData.founded_year) : undefined,
    });
    setIsEditing(false);
  };

  const inputClasses = "w-full px-5 py-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm active:scale-[0.99] focus:bg-white dark:focus:bg-[#1A1A1A]";
  const labelClasses = "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block";

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden animate-fade-in max-w-7xl mx-auto">
        <div className="p-8 border-b border-gray-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/50 dark:bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Identity Calibration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic opacity-80">Synchronize your brand's core data with the network</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 md:flex-none px-8 py-3 rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all outline-none border border-gray-200 dark:border-white/10"
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 md:flex-none px-10 py-3 bg-cyan-500 text-white rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 transition-all outline-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Commit Data
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-12 bg-white dark:bg-[#111111]">
          {/* Logo Section */}
          <div className="relative group">
            <ImageUpload
              value={formData.logo_url}
              onChange={(url) => setFormData({ ...formData, logo_url: typeof url === 'string' ? url : url[0] || '' })}
              multiple={false}
              label="Brand Key Visual"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Core Details */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2 underline-cyan">
                <Building2 className="w-5 h-5 text-cyan-500" />
                <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">Core Parameters</h3>
              </div>

              <div>
                <label className={labelClasses}>Restaurant Designation</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClasses}
                  placeholder="e.g. KFC"
                />
              </div>

              <div>
                <label className={labelClasses}>Operational Hub (Country)</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={inputClasses}
                  placeholder="e.g. Pakistan"
                />
              </div>

              <div>
                <label className={labelClasses}>Economic Range</label>
                <select
                  value={formData.price_range}
                  onChange={(e) => setFormData({ ...formData, price_range: e.target.value as any })}
                  className={inputClasses}
                >
                  <option value="budget" className="dark:bg-[#121212]">Budget Friendly (💰)</option>
                  <option value="mid-range" className="dark:bg-[#121212]">Mid-Range (💰💰)</option>
                  <option value="premium" className="dark:bg-[#121212]">Premium Experience (💰💰💰)</option>
                </select>
              </div>

              <div>
                <label className={labelClasses}>Establishment Year</label>
                <input
                  type="text"
                  value={formData.founded_year}
                  onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                  className={inputClasses}
                  placeholder="e.g. 1952"
                />
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2 underline-cyan">
                <Globe className="w-5 h-5 text-cyan-500" />
                <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">Taxonomy System</h3>
              </div>

              <div>
                <label className={labelClasses}>Cuisine Matrix</label>
                <textarea
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  rows={2}
                  className={`${inputClasses} resize-none`}
                  placeholder="Fast Food, Fried Chicken..."
                />
                <p className="text-[9px] text-gray-400 mt-2 italic font-medium ml-1">Separated by commas</p>
              </div>

              <div>
                <label className={labelClasses}>Specialty Array</label>
                <textarea
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  rows={2}
                  className={`${inputClasses} resize-none`}
                  placeholder="Crispy Wings, Zinger Burger..."
                />
              </div>

              <div>
                <label className={labelClasses}>Menu Classifications</label>
                <textarea
                  value={formData.food_categories}
                  onChange={(e) => setFormData({ ...formData, food_categories: e.target.value })}
                  rows={2}
                  className={`${inputClasses} resize-none`}
                  placeholder="Family Buckets, Value Meals..."
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2 underline-cyan">
                <BadgeCheck className="w-5 h-5 text-cyan-500" />
                <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">Search Optimization</h3>
              </div>

              <div>
                <label className={labelClasses}>Discovery Keywords</label>
                <textarea
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  rows={4}
                  className={`${inputClasses} resize-none`}
                  placeholder="crunchy, original recipe, southern fried..."
                />
                <p className="text-[9px] text-gray-400 mt-2 italic font-medium ml-1">Optimizes AI-powered discovery</p>
              </div>

              <div className="p-8 rounded-[2rem] bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/10 mt-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Network Status</h4>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">
                  Currently overseeing <span className="text-cyan-500 font-bold">{locations.length} live nodes</span> within the branch network.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto">
      {/* Visual Identity Section */}
      <div className="group relative bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm hover:shadow-2xl transition-all duration-700">
        <div className="absolute top-10 right-10">
          <button
            onClick={() => setIsEditing(true)}
            className="group/btn flex items-center gap-2.5 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-[10px] tracking-[0.2em] uppercase transition-all hover:scale-105 shadow-xl"
          >
            <Edit className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
            Recalibrate Profile
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-start">
          {/* Logo Asset */}
          <div className="relative flex-shrink-0">
            <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden border-4 border-gray-50 dark:border-white/5 shadow-2xl relative z-10 bg-gray-100 dark:bg-white/5">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-10">
                  <Building2 className="w-16 h-16" />
                </div>
              )}
            </div>
            <div className="absolute -inset-4 bg-cyan-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-5 py-1.5 rounded-full bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/10 text-[9px] font-black uppercase tracking-[0.2em]">Authorized Entity</span>
                <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                  restaurant.status === 'active' 
                  ? 'bg-green-500/5 text-green-600 border-green-500/10' 
                  : 'bg-yellow-500/5 text-yellow-600 border-yellow-500/10'
                }`}>
                  {restaurant.status}
                </span>
              </div>
              <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 uppercase">
                {restaurant.name}
              </h1>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-cyan-500" /> Operational Hub
                </span>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200">{restaurant.country}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <BadgeCheck className="w-3 h-3 text-cyan-500" /> Price Vector
                </span>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase">{restaurant.price_range}</p>
              </div>
              {restaurant.founded_year && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-cyan-500" /> Establishment
                  </span>
                  <p className="text-sm font-black text-gray-800 dark:text-gray-200">{restaurant.founded_year}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <GitBranch className="w-3 h-3 text-cyan-500" /> Network Presence
                </span>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200">{locations.length} Nodes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Identity & Discovery Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-12 transition-all">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group/card h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[80px] rounded-full" />
            <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.4em] mb-10 border-l-4 border-cyan-500 pl-4">Culinary Architecture</h3>
            
            <div className="pl-5 space-y-12">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Classifications</h4>
                <div className="flex flex-wrap gap-2.5">
                  {restaurant.categories.map((cat, i) => (
                    <span key={i} className="px-5 py-2.5 bg-gray-50/50 dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 rounded-[1.2rem] text-[10px] font-bold tracking-widest uppercase border border-gray-100 dark:border-white/5 transition-all hover:border-cyan-500/30 hover:bg-white dark:hover:bg-white/10">{cat}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signature Specialties</h4>
                <div className="flex flex-wrap gap-2.5">
                  {restaurant.specialties.map((spec, i) => (
                    <span key={i} className="px-5 py-2.5 bg-cyan-500/[0.03] text-cyan-600 dark:text-cyan-400 rounded-[1.2rem] text-[10px] font-bold tracking-widest uppercase border border-cyan-500/10 transition-all hover:bg-cyan-500/10">{spec}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Menu Systems</h4>
                <div className="flex flex-wrap gap-2.5">
                  {restaurant.food_categories.map((food, i) => (
                    <span key={i} className="px-5 py-2.5 bg-gray-50/50 dark:bg-white/[0.03] text-gray-600 dark:text-gray-400 rounded-[1.2rem] text-[10px] font-bold tracking-widest uppercase border border-gray-100 dark:border-white/5">{food}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-gray-900 dark:bg-[#161616] border border-white/5 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group/intel h-full">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[80px] rounded-full" />
            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] mb-10 border-l-4 border-cyan-500 pl-4">Discovery Intel</h3>
            
            <div className="pl-5 space-y-10">
              <p className="text-xs text-gray-400 font-medium leading-relaxed italic opacity-80">
                AI systems use the following metadata to geolocate and recommend your establishment to active consumers.
              </p>
              
              <div className="flex flex-wrap gap-3">
                {restaurant.keywords.map((word, i) => (
                  <span key={i} className="px-4 py-2 bg-white/5 text-gray-300 rounded-[1rem] text-[10px] font-bold tracking-widest uppercase border border-white/10 hover:border-cyan-500 transition-colors">#{word}</span>
                ))}
              </div>

              <div className="pt-10 border-t border-white/5 mt-10">
                <div className="flex items-center gap-3 text-cyan-500 mb-3">
                  <BadgeCheck className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Data Point</span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.5em] font-black opacity-40">Network Synced: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantInfo;
