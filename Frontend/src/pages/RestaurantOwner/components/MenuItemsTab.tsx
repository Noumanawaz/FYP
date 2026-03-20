import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UtensilsCrossed, Filter, Loader2, Star, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { apiService } from '../../../services/api';
import MenuItemForm from './MenuItemForm';

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
}

interface MenuItemsTabProps {
  restaurantId: string;
}

const MenuItemsTab: React.FC<MenuItemsTabProps> = ({ restaurantId }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const hasLoaded = React.useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadCategories();
    loadMenuItems();
  }, [restaurantId]);

  const loadCategories = async () => {
    try {
      const response = await apiService.getCategories(restaurantId);
      if (response.success && response.data) {
        const cats = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        setCategories(cats);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadMenuItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getMenuItems(restaurantId);
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        setMenuItems(items);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('This action will permanently purge this item from the repository. Proceed?')) {
      return;
    }
    try {
      await apiService.deleteMenuItem(itemId);
      loadMenuItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingItem(undefined);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(undefined);
  };

  const filteredItems = menuItems.filter(item => {
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
    if (availabilityFilter === 'available' && !item.is_available) return false;
    if (availabilityFilter === 'unavailable' && item.is_available) return false;
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading && menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Loading Menu Items...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section - Compact */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#161616] p-6 rounded-[1.5rem] border border-gray-200 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl">
             <UtensilsCrossed className="w-5 h-5" />
           </div>
           <div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Catalog</h3>
             <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">Digital Assets: {menuItems.length}</p>
           </div>
        </div>
        
        <div className="flex flex-1 max-w-xl items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search Menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-full text-xs font-medium outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-full font-bold text-[10px] tracking-widest uppercase transition-all hover:scale-105 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold tracking-widest uppercase text-center">
          {error}
        </div>
      )}

      {/* Filters Toolbar - Compact */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-white/10 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-cyan-500 ml-1" />
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Filter Matrix</span>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
          >
            <option value="all">Categories: All</option>
            {categories.map((cat) => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
          </select>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="available">Live</option>
            <option value="unavailable">Draft</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#161616] border border-dashed border-gray-200 dark:border-white/10 rounded-[2rem]">
          <UtensilsCrossed className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-4" />
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">No assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5 pb-12 transition-all">
          {filteredItems.map((item) => {
            const category = categories.find(c => c.category_id === item.category_id);
            const price = typeof item.base_price === 'number' ? item.base_price : parseFloat(item.base_price || '0');
            
            return (
              <div key={item.item_id} className="group flex flex-col bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                {/* Image Container - Reduced Height (30%) */}
                <div className="relative h-28 overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
                  {item.image_urls && item.image_urls.length > 0 ? (
                    <img
                      src={item.image_urls[0]}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                      <UtensilsCrossed className="w-8 h-8" />
                    </div>
                  )}
                  {/* Overlay Badges - Smaller */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                    {item.is_featured && (
                      <div className="p-1.5 bg-yellow-500 text-white rounded-full shadow-lg">
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                    <div className={`w-2 h-2 rounded-full shadow-lg border border-white/20 ${item.is_available ? 'bg-green-500' : 'bg-gray-500'}`} />
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="mb-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate" title={item.name}>{item.name}</h4>
                    {category && (
                      <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">
                        {category.name}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-tight line-clamp-2 h-7 font-serif italic opacity-70">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between mb-4 mt-auto pt-2 border-t border-gray-50 dark:border-white/5">
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">Price</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        {price.toFixed(2)} <span className="text-[8px] opacity-40 ml-0.5">{item.currency || 'USD'}</span>
                      </span>
                    </div>
                    {item.preparation_time && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <Clock className="w-3 h-3 text-cyan-500" />
                        {item.preparation_time}m
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.item_id)}
                      className="p-2 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <MenuItemForm
          restaurantId={restaurantId}
          menuItem={editingItem}
          onClose={handleFormClose}
          onSuccess={loadMenuItems}
        />
      )}
    </div>
  );
};

export default MenuItemsTab;
