import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Clock, Flame, Eye, ChevronRight, Loader2, Star } from 'lucide-react';
import { apiService } from '../../../services/api';

interface MenuItem {
  item_id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  currency?: string;
  image_urls?: string[];
  dietary_tags?: string[];
  spice_level?: 'mild' | 'medium' | 'hot' | 'extra-hot';
  preparation_time?: number;
  calories?: number;
  ingredients?: string[];
  allergens?: string[];
  is_available?: boolean;
  is_featured?: boolean;
}

interface Category {
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  parent_category_id?: string;
}

interface MenuPreviewProps {
  restaurantId: string;
}

const MenuPreview: React.FC<MenuPreviewProps> = ({ restaurantId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadMenuData();
  }, [restaurantId]);

  const loadMenuData = async () => {
    setLoading(true);
    setError('');
    try {
      const categoriesResponse = await apiService.getCategories(restaurantId, { is_active: true });
      if (categoriesResponse.success && categoriesResponse.data) {
        const cats = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : (categoriesResponse.data as any).items || [];
        setCategories(cats.filter((c: Category) => c.is_active));
      }

      const itemsResponse = await apiService.getMenuItems(restaurantId, { is_available: true });
      if (itemsResponse.success && itemsResponse.data) {
        const items = Array.isArray(itemsResponse.data) ? itemsResponse.data : (itemsResponse.data as any).items || [];
        setMenuItems(items.filter((item: MenuItem) => item.is_available));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const getSpiceLevelColor = (level?: string) => {
    switch (level) {
      case 'mild': return 'text-green-600/70 border-green-600/10';
      case 'medium': return 'text-yellow-600/70 border-yellow-600/10';
      case 'hot': return 'text-orange-600/70 border-orange-600/10';
      case 'extra-hot': return 'text-red-600/70 border-red-600/10';
      default: return 'text-gray-400 border-transparent';
    }
  };

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  const rootCategories = categories.filter(cat => !cat.parent_category_id);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in bg-[#FCFBF7] dark:bg-[#080808] rounded-[3rem]">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-amber-600/40 animate-spin" />
          <UtensilsCrossed className="w-6 h-6 text-amber-600/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="mt-6 text-xs font-serif italic text-amber-900/40 dark:text-amber-100/20 tracking-[0.2em] uppercase">Curating Digital Menu Experience...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-12 max-w-7xl mx-auto px-4 md:px-0">
      {/* Header Section — Restored Standard Styling */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-[#161616] p-10 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-[1.5rem] bg-amber-500/10 text-amber-500">
            <Eye className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-0 tracking-tight">Digital Menu Preview</h3>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-600">Live View</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Experience your menu exactly as your patrons do across all digital touchpoints</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          {error}
        </div>
      )}

      {/* Category Navigation - Elegant Minimal Tabs */}
      {rootCategories.length > 0 && (
        <div className="flex items-center justify-center gap-12 overflow-x-auto pb-4 scrollbar-hide border-b border-gray-100 dark:border-white/5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`group relative pb-6 text-[11px] font-black uppercase tracking-[0.25em] transition-all whitespace-nowrap ${
              selectedCategory === null
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Full Menu
            {selectedCategory === null && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-400 rounded-full shadow-[0_-4px_10px_rgba(217,119,6,0.2)]" />
            )}
          </button>
          {rootCategories.map((category) => (
            <button
              key={category.category_id}
              onClick={() => setSelectedCategory(category.category_id)}
              className={`group relative pb-6 text-[11px] font-black uppercase tracking-[0.25em] transition-all whitespace-nowrap ${
                selectedCategory === category.category_id
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {category.name}
              {selectedCategory === category.category_id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-400 rounded-full shadow-[0_-4px_10px_rgba(217,119,6,0.2)]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dining Surface */}
      <div className="bg-[#FCFBF7] dark:bg-[#0A0A0A] rounded-[4rem] p-10 md:p-20 shadow-inner border border-gray-100 dark:border-white/5 min-h-[800px] relative">
        {/* Background Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.01] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />

        {rootCategories.length === 0 ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-40">
            <UtensilsCrossed className="w-16 h-16 text-amber-900/10 dark:text-amber-100/10 mb-8" />
            <h4 className="text-2xl font-serif italic text-amber-900/20 dark:text-amber-100/20">Menu Under Curation</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-900/10 dark:text-amber-100/10 mt-2">Add categories and assets to begin</p>
          </div>
        ) : (
          <div className="relative z-10 space-y-32">
            {rootCategories.map((category) => {
              const categoryItems = filteredItems.filter(item => item.category_id === category.category_id);
              if (selectedCategory && selectedCategory !== category.category_id) return null;
              if (categoryItems.length === 0 && !selectedCategory) return null;

              return (
                <div key={category.category_id} className="animate-fade-up">
                  {/* Category Header */}
                  <div className="flex flex-col items-center mb-16 text-center">
                    <div className="w-12 h-[1px] bg-amber-600/30 dark:bg-amber-400/20 mb-6" />
                    <h4 className="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white italic tracking-tight">{category.name}</h4>
                    {category.description && (
                      <p className="mt-4 text-xs font-serif italic text-gray-400 dark:text-gray-500 max-w-md">{category.description}</p>
                    )}
                  </div>

                  {/* Boutique List - Elegant Rows */}
                  <div className="space-y-0 max-w-4xl mx-auto">
                    {categoryItems.map((item) => {
                      const price = typeof item.base_price === 'number' ? item.base_price : parseFloat(item.base_price || '0');

                      return (
                        <div key={item.item_id} className="group py-10 border-b border-amber-900/5 dark:border-amber-100/5 last:border-0 flex flex-col md:flex-row gap-10 items-start md:items-center">
                          {/* Left: Image if exists */}
                          {item.image_urls && item.image_urls.length > 0 && (
                            <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-all duration-500 border border-white/10">
                              <img
                                src={item.image_urls[0]}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Middle: Name & Description */}
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <h5 className="text-2xl font-serif text-gray-900 dark:text-white italic tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                  {item.name}
                                </h5>
                                {item.is_featured && (
                                  <span className="p-1.5 rounded-full bg-amber-500/10 text-amber-500">
                                    <Star className="w-3 h-3 fill-current" />
                                  </span>
                                )}
                              </div>
                              <span className="text-lg font-sans text-gray-900 dark:text-amber-400/80 font-medium tracking-tight whitespace-nowrap">
                                <span className="text-[10px] font-black mr-1 opacity-40">{item.currency || 'USD'}</span>
                                {price.toFixed(2)}
                              </span>
                            </div>

                            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-serif italic max-w-xl opacity-80">
                              {item.description}
                            </p>

                            <div className="flex flex-wrap gap-6 pt-2">
                              {item.spice_level && (
                                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${getSpiceLevelColor(item.spice_level)}`}>
                                  <Flame className="w-3.5 h-3.5" />
                                  {item.spice_level}
                                </div>
                              )}
                              {item.preparation_time && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  <Clock className="w-3.5 h-3.5 opacity-40" />
                                  {item.preparation_time} Min
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom Branding */}
            <div className="pt-20 border-t border-amber-900/5 dark:border-amber-100/5 flex flex-col items-center">
              <div className="p-4 rounded-full bg-amber-500/5 mb-6">
                <UtensilsCrossed className="w-8 h-8 text-amber-600/30" />
              </div>
              <p className="text-[10px] font-black text-amber-900/20 dark:text-amber-100/10 uppercase tracking-[0.5em]">The Art of Dining by VOCABITE</p>
              
              <button className="mt-12 group flex items-center gap-4 px-10 py-4 bg-gray-900 dark:bg-amber-400 text-white dark:text-gray-900 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl">
                 <span className="text-[11px] font-black uppercase tracking-[0.2em]">Consumer Experience Sync</span>
                 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPreview;
